import { NextResponse } from 'next/server';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { SpeechClient } from '@google-cloud/speech';
import { Storage } from '@google-cloud/storage';
import OpenAI from 'openai';
import { VideoAnalysisResult } from '@/lib/interfaces';

// -----------------------------
// NEW HELPER FUNCTIONS
// -----------------------------

// Removes all "**" and extra whitespace
function removeAsterisks(str: string): string {
  return str.replace(/\*\*/g, "").trim();
}

// We skip any lines that merely repeat "Lexical Analysis", "Emotion and Sentiment", etc.
function shouldKeepRiskFactor(str: string): boolean {
  const skipPhrases = [
    "Lexical Analysis",
    "Emotion and Sentiment",
    "Speech Patterns and Intensity",
    "Use of Religious Rhetoric",
    "Frequency of Commands and Directives",
  ];
  return !skipPhrases.some((phrase) => str.includes(phrase));
}

// -----------------------------
// Initialize OpenAI, Google Cloud, etc.
// -----------------------------

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Initialize Google Cloud Speech client
const googleCredentials = {
  type: process.env.GOOGLE_CLOUD_TYPE,
  project_id: process.env.GOOGLE_CLOUD_PROJECT_ID,
  private_key_id: process.env.GOOGLE_CLOUD_PRIVATE_KEY_ID,
  private_key: process.env.GOOGLE_CLOUD_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  client_email: process.env.GOOGLE_CLOUD_CLIENT_EMAIL,
  client_id: process.env.GOOGLE_CLOUD_CLIENT_ID,
  auth_uri: process.env.GOOGLE_CLOUD_AUTH_URI,
  token_uri: process.env.GOOGLE_CLOUD_TOKEN_URI,
  auth_provider_x509_cert_url: process.env.GOOGLE_CLOUD_AUTH_PROVIDER_X509_CERT_URL,
  client_x509_cert_url: process.env.GOOGLE_CLOUD_CLIENT_X509_CERT_URL
};

const speechClient = new SpeechClient({ credentials: googleCredentials });
const storageClient = new Storage({ credentials: googleCredentials });
const bucketName = process.env.GOOGLE_CLOUD_STORAGE_BUCKET || 'hackathon_police';

// Ensure temp directories exist
const tmpDir = '/tmp';
const downloadsDir = path.join(tmpDir, 'downloads');
const audioDir = path.join(tmpDir, 'audio');
const chunksDir = path.join(tmpDir, 'chunks');

[downloadsDir, audioDir, chunksDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Helper function to download audio from URL
async function downloadAudio(url: string): Promise<string> {
  const audioId = uuidv4();
  const outputPath = path.join(audioDir, `${audioId}.mp3`);

  try {
    console.log(`[AUDIO DOWNLOAD] Starting audio download from URL using Sieve API: ${url}`);
    
    // Step 1: Push the download job to Sieve API
    const pushResponse = await fetch('https://mango.sievedata.com/v2/push', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': process.env.SIEVE_API_KEY || ''
      },
      body: JSON.stringify({
        function: 'sieve/youtube-downloader',
        inputs: {
          url: url,
          download_type: 'audio',
          resolution: '360p',
          include_audio: true,
          start_time: 0,
          end_time: -1,
          include_metadata: false,
          metadata_fields: [],
          include_subtitles: false,
          subtitle_languages: [],
          video_format: 'mp4',
          audio_format: 'mp3',
          subtitle_format: 'vtt'
        }
      })
    });

    if (!pushResponse.ok) {
      throw new Error(`Failed to push job: ${pushResponse.status} - ${await pushResponse.text()}`);
    }

    const pushData = await pushResponse.json();
    const jobId = pushData.id;
    console.log(`[AUDIO DOWNLOAD] Pushed job. ID: ${jobId}`);

    // Step 2: Poll for job completion
    console.log(`[AUDIO DOWNLOAD] Polling for job completion...`);
    let jobInfo;
    const statusUrl = `https://mango.sievedata.com/v2/jobs/${jobId}`;
    
    while (true) {
      const statusResponse = await fetch(statusUrl, {
        headers: {
          'X-API-Key': process.env.SIEVE_API_KEY || ''
        }
      });

      if (!statusResponse.ok) {
        throw new Error(`Error polling job: ${statusResponse.status} - ${await statusResponse.text()}`);
      }

      jobInfo = await statusResponse.json();
      const currentStatus = jobInfo.status;
      console.log(`[AUDIO DOWNLOAD] Job ${jobId} status: ${currentStatus}`);

      if (currentStatus === 'finished') {
        break;
      } else if (currentStatus === 'failed' || currentStatus === 'error') {
        throw new Error(`Job ${jobId} did not complete successfully: ${JSON.stringify(jobInfo)}`);
      }

      // Wait 5 seconds before polling again
      await new Promise(resolve => setTimeout(resolve, 5000));
    }

    // Step 3: Extract output file URL
    const outputs = jobInfo.outputs;
    if (!outputs || outputs.length === 0) {
      throw new Error('No outputs found in job info.');
    }

    const audioUrl = outputs[0]?.data?.url;
    if (!audioUrl) {
      throw new Error('No audio URL found in outputs.');
    }

    console.log(`[AUDIO DOWNLOAD] Audio download URL obtained: ${audioUrl}`);

    // Step 4: Download the audio file locally
    console.log(`[AUDIO DOWNLOAD] Downloading audio file to: ${outputPath}`);
    const audioResponse = await fetch(audioUrl);
    
    if (!audioResponse.ok) {
      throw new Error(`Failed to download audio file: ${audioResponse.status}`);
    }

    const arrayBuffer = await audioResponse.arrayBuffer();
    fs.writeFileSync(outputPath, Buffer.from(arrayBuffer));

    console.log(`[AUDIO DOWNLOAD] SUCCESS: Audio saved to ${outputPath}`);
    return outputPath;

  } catch (error) {
    console.error(`[AUDIO DOWNLOAD] ERROR: Failed to download audio: ${error}`);
    throw new Error(`Failed to download audio using Sieve API: ${error}`);
  }
}

// Helper function to extract audio from video
async function extractAudio(videoPath: string): Promise<string> {
  const audioId = path.basename(videoPath, path.extname(videoPath));
  const outputPath = path.join(audioDir, `${audioId}.wav`);

  try {
    // Verify input file exists before processing
    if (!fs.existsSync(videoPath)) {
      console.error(`[AUDIO EXTRACTION] ERROR: Input video file not found at ${videoPath}`);
      throw new Error(`Input video file not found at ${videoPath}`);
    }

    console.log(`[AUDIO EXTRACTION] Starting audio extraction from video: ${videoPath}`);
    console.log(`[AUDIO EXTRACTION] Target audio output: ${outputPath}`);

    // Extract audio using ffmpeg, convert to 16kHz mono WAV
    execSync(
      `ffmpeg -i ${videoPath} -vn -acodec pcm_s16le -ar 16000 -ac 1 ${outputPath}`,
      {
        stdio: 'pipe',
        encoding: 'utf-8',
        maxBuffer: 10 * 1024 * 1024
      }
    );

    // Verify the output file was created
    if (!fs.existsSync(outputPath)) {
      console.error(`[AUDIO EXTRACTION] ERROR: Output audio file was not created at ${outputPath}`);
      throw new Error(`Output audio file was not created at ${outputPath}`);
    }

    console.log(`[AUDIO EXTRACTION] SUCCESS: Audio extracted successfully to: ${outputPath}`);
    return outputPath;
  } catch (error: any) {
    console.error(`[AUDIO EXTRACTION] ERROR: Failed to extract audio: ${error.message}`);
    throw new Error(`Failed to extract audio from video: ${error.message || 'Unknown error'}`);
  }
}

// Helper function to split audio into chunks
async function splitAudioToChunks(audioPath: string, chunkDurationMs: number = 60000): Promise<string[]> {
  const audioId = path.basename(audioPath, path.extname(audioPath));
  const chunkPaths: string[] = [];

  try {
    console.log(`[AUDIO SPLITTING] Starting to split audio file: ${audioPath}`);
    console.log(`[AUDIO SPLITTING] Chunk duration: ${chunkDurationMs}ms`);

    // Get audio duration in seconds
    const durationOutput = execSync(
      `ffprobe -i "${audioPath}" -show_entries format=duration -v quiet -of csv="p=0"`,
      { encoding: 'utf-8' }
    );
    const durationSeconds = parseFloat(durationOutput.trim());
    const totalChunks = Math.ceil((durationSeconds * 1000) / chunkDurationMs);

    console.log(`[AUDIO SPLITTING] Audio duration: ${durationSeconds}s, creating ${totalChunks} chunks`);

    for (let i = 0; i < totalChunks; i++) {
      const startTime = i * (chunkDurationMs / 1000);
      const chunkPath = path.join(chunksDir, `${audioId}_chunk_${i}.wav`);

      console.log(`[AUDIO SPLITTING] Creating chunk ${i+1}/${totalChunks} at ${chunkPath}`);
      // Convert MP3 to WAV format with 16kHz mono for Google Speech API
      execSync(
        `ffmpeg -i "${audioPath}" -ss ${startTime} -t ${chunkDurationMs/1000} -vn -acodec pcm_s16le -ar 16000 -ac 1 "${chunkPath}"`,
        { stdio: 'pipe' }
      );

      if (!fs.existsSync(chunkPath)) {
        console.error(`[AUDIO SPLITTING] ERROR: Chunk ${i+1} was not created at ${chunkPath}`);
        throw new Error(`Failed to create audio chunk ${i+1}`);
      }

      console.log(`[AUDIO SPLITTING] Chunk ${i+1} created successfully`);
      chunkPaths.push(chunkPath);
    }

    console.log(`[AUDIO SPLITTING] SUCCESS: Created ${chunkPaths.length} audio chunks`);
    return chunkPaths;
  } catch (error) {
    console.error(`[AUDIO SPLITTING] ERROR: Failed to split audio: ${error}`);
    throw new Error('Failed to split audio into chunks');
  }
}

// Helper function to upload audio to Google Cloud Storage
async function uploadToGCS(filePath: string): Promise<string> {
  const fileName = path.basename(filePath);
  const bucket = storageClient.bucket(bucketName);
  const file = bucket.file(fileName);

  try {
    console.log(`[GCS UPLOAD] Starting upload to Google Cloud Storage: ${filePath}`);
    console.log(`[GCS UPLOAD] Target bucket: ${bucketName}, filename: ${fileName}`);

    await bucket.upload(filePath, {
      destination: fileName,
      metadata: {
        contentType: 'audio/wav',
      },
    });

    const gcsUri = `gs://${bucketName}/${fileName}`;
    console.log(`[GCS UPLOAD] SUCCESS: File uploaded to ${gcsUri}`);

    return gcsUri;
  } catch (error) {
    console.error(`[GCS UPLOAD] ERROR: Failed to upload to GCS: ${error}`);
    throw new Error('Failed to upload audio to Google Cloud Storage');
  }
}

// Helper function to transcribe audio using Google Speech API
async function transcribeAudio(gcsUri: string, languageCode: string = 'en-US'): Promise<string> {
  try {
    console.log(`[TRANSCRIPTION] Starting transcription for ${gcsUri}`);
    console.log(`[TRANSCRIPTION] Language: ${languageCode}`);

    const audio = { uri: gcsUri };
    const config = {
      encoding: 'LINEAR16' as const,
      sampleRateHertz: 16000,
      languageCode,
      enableAutomaticPunctuation: true,
    };

    const request = { audio, config };

    console.log(`[TRANSCRIPTION] Sending request to Google Speech API`);
    const [operation] = await speechClient.longRunningRecognize(request);
    console.log(`[TRANSCRIPTION] Long running operation started, waiting for completion...`);

    const [response] = await operation.promise();

    let transcript = '';
    if (response?.results) {
      response.results.forEach(result => {
        if (result?.alternatives?.[0]?.transcript) {
          transcript += result.alternatives[0].transcript + ' ';
        }
      });
    }

    const truncatedTranscript = transcript.length > 100
      ? transcript.substring(0, 100) + '...'
      : transcript;

    console.log(`[TRANSCRIPTION] SUCCESS: Transcription completed for ${languageCode}, length: ${transcript.length} chars`);
    console.log(`[TRANSCRIPTION] Transcript preview: ${truncatedTranscript}`);

    return transcript.trim();
  } catch (error) {
    console.error(`[TRANSCRIPTION] ERROR: Failed to transcribe audio (${languageCode}): ${error}`);
    throw new Error(`Failed to transcribe audio in ${languageCode}`);
  }
}

// Helper function to analyze transcript using OpenAI
async function analyzeTranscript(transcript: { english: string; hindi: string }): Promise<any> {
  try {
    console.log(`[ANALYSIS] Starting OpenAI analysis on transcript`);
    console.log(`[ANALYSIS] English transcript length: ${transcript.english.length} chars`);
    console.log(`[ANALYSIS] Hindi transcript length: ${transcript.hindi.length} chars`);

    // Prepare to get radicalism assessment from AI
    const prompt = `
      You are tasked with analyzing transcripts of speeches or text content that might include both Hindi and English sections. The transcript has been processed using two separate speech-to-text APIs: one for Hindi and one for English. Analyze the provided transcript carefully, understanding both languages, and return the analysis based on the following five parameters. The transcript might contain mixed Hindi and English parts, so ensure you identify the language for each section and analyze the radical or religiously inflammatory language accordingly
      
      Please analyze this content and assign scores for:
      1. Radical Probability (0-100): Likelihood that this content promotes radicalism
      2. Radical Content (0-100): Percentage of content that could be considered radical
      
      Also provide detailed analysis in these categories:
      - Lexical Analysis: Identify radical or religious terminology in both Hindi and English, including exclusionary language (e.g., "us vs. them"), calls to action, or divisive rhetoric.
      - Emotion and Sentiment in Speech: Analyze the tone and sentiment in both languages. Look for negative emotions like anger or fear, which may incite followers or condemn opposing groups.
      - Speech Patterns and Intensity: Identify the use of high volume, repetition, or urgency in either language to emphasize points, typical in radical speech.
      - Use of Religious Rhetoric: Look for quotes from religious texts, apocalyptic themes, or divine rewards/punishments, considering the context in both Hindi and English.
      - Frequency of Commands and Directives: Examine the frequency of explicit calls to action (physical or ideological), in both languages.
      
      Your analysis should be objective and consider contextual factors.

      ENGLISH TRANSCRIPT:
      ${transcript.english.slice(0, 8000)}
      
      HINDI TRANSCRIPT:
      ${transcript.hindi.slice(0, 8000)}
    `;

    console.log(`[ANALYSIS] Sending analysis request to OpenAI`);

    const response = await openai.chat.completions.create({
      model: "gpt-4-0125-preview",
      messages: [
        {
          role: "system",
          content: "You are an expert analyst specializing in identifying radical content in speech transcripts. Your task is to objectively analyze transcripts and determine if they contain radical elements."
        },
        { role: "user", content: prompt }
      ],
      temperature: 0.3,
      max_tokens: 1500,
    });

    console.log(`[ANALYSIS] Received response from OpenAI`);

    if (!response.choices || !response.choices[0] || !response.choices[0].message) {
      throw new Error("Invalid response from OpenAI");
    }

    // Extract the analysis text
    const analysisText = response.choices[0].message.content || "";
    console.log(`[ANALYSIS] Analysis text length: ${analysisText.length} chars`);

    // Extract scores from the analysis text using regex
    let radicalProbability = 50;
    let radicalContent = 50;

    const probabilityMatch = analysisText.match(/Radical Probability.*?(\d+)/i);
    const contentMatch = analysisText.match(/Radical Content.*?(\d+)/i);

    if (probabilityMatch && probabilityMatch[1]) {
      radicalProbability = parseInt(probabilityMatch[1], 10);
    }
    if (contentMatch && contentMatch[1]) {
      radicalContent = parseInt(contentMatch[1], 10);
    }

    const overallScore = Math.max(radicalProbability, radicalContent);
    const scoreLabel = getScoreLabel(radicalProbability, radicalContent);
    const scoreColor = getScoreColor(radicalProbability, radicalContent);

    // Extract different analysis sections
    const lexicalAnalysis = extractSection(analysisText, "Lexical Analysis");
    const emotionAnalysis = extractSection(analysisText, "Emotion and Sentiment");
    const speechPatterns = extractSection(analysisText, "Speech Patterns and Intensity");
    const religiousRhetoric = extractSection(analysisText, "Use of Religious Rhetoric");
    const commandsDirectives = extractSection(analysisText, "Frequency of Commands and Directives");

    // Create a list of risk factors
    let riskFactors = extractRiskFactors(analysisText);

    // Create a list of safety tips
    let safetyTips = generateSafetyTips(radicalProbability, radicalContent);

    // Generate overall assessment
    let overallAssessment = `This content has been analyzed for radical elements with an overall concern level of ${scoreLabel.toLowerCase()}. The radical probability score is ${radicalProbability}/100, and the radical content score is ${radicalContent}/100.`;

    // Build the base analysis object
    let analysis = {
      radicalProbability,
      radicalContent,
      overallScore: {
        score: overallScore,
        label: scoreLabel,
        color: scoreColor
      },
      lexicalAnalysis,
      emotionAnalysis,
      speechPatterns,
      religiousRhetoric,
      commandsDirectives,
      overallAssessment,
      riskFactors,
      safetyTips
    };

    // ------------------------------------------------
    // CLEANUP: REMOVE "**" AND FILTER OUT DUPLICATES
    // ------------------------------------------------
    analysis.lexicalAnalysis      = removeAsterisks(analysis.lexicalAnalysis);
    analysis.emotionAnalysis      = removeAsterisks(analysis.emotionAnalysis);
    analysis.speechPatterns       = removeAsterisks(analysis.speechPatterns);
    analysis.religiousRhetoric    = removeAsterisks(analysis.religiousRhetoric);
    analysis.commandsDirectives   = removeAsterisks(analysis.commandsDirectives);
    analysis.overallAssessment    = removeAsterisks(analysis.overallAssessment);

    analysis.riskFactors = analysis.riskFactors
      .map(r => removeAsterisks(r))
      .filter(r => shouldKeepRiskFactor(r));

    analysis.safetyTips = analysis.safetyTips
      .map(tip => removeAsterisks(tip));

    // Return final cleaned analysis
    return analysis;
  } catch (error) {
    console.error(`[ANALYSIS] ERROR: Failed to analyze transcript: ${error}`);

    return {
      radicalProbability: 0,
      radicalContent: 0,
      overallScore: {
        score: 0,
        label: "Error",
        color: "gray"
      },
      lexicalAnalysis: "Error analyzing content",
      emotionAnalysis: "Error analyzing content",
      speechPatterns: "Error analyzing content",
      religiousRhetoric: "Error analyzing content",
      commandsDirectives: "Error analyzing content",
      overallAssessment: "An error occurred during analysis.",
      riskFactors: ["Analysis error"],
      safetyTips: ["Try again later"]
    };
  }
}

// Helper function to extract sections from analysis text
function extractSection(text: string, sectionName: string): string {
  const regex = new RegExp(`${sectionName}[:\\s]+(.*?)(?=\\n\\s*\\n|\\n\\s*[A-Z]|$)`, 'si');
  const match = text.match(regex);
  return match && match[1] ? match[1].trim() : `No ${sectionName.toLowerCase()} found.`;
}

// Helper function to extract risk factors from analysis
function extractRiskFactors(text: string): string[] {
  const factors = [];

  // Look for bullet points or numbered lists
  const listItemRegex = /[-*•]\s+([^•\n]+)/g;
  let match;

  while ((match = listItemRegex.exec(text)) !== null) {
    if (match[1] && match[1].trim().length > 10) {
      factors.push(match[1].trim());
    }
  }

  // If no list items found, try extracting key phrases
  if (factors.length === 0) {
    const keywords = ["concern", "warning", "caution", "problematic", "radical", "extreme"];
    for (const keyword of keywords) {
      const keywordRegex = new RegExp(`[^.!?]*${keyword}[^.!?]*[.!?]`, 'gi');
      let keywordMatch;
      while ((keywordMatch = keywordRegex.exec(text)) !== null) {
        if (keywordMatch[0] && keywordMatch[0].trim().length > 15) {
          factors.push(keywordMatch[0].trim());
        }
        if (factors.length >= 5) break;
      }
      if (factors.length >= 5) break;
    }
  }

  // If still no factors, create generic ones
  if (factors.length === 0) {
    factors.push("Potential radical content detected");
    factors.push("Review content for harmful messaging");
  }

  return factors.slice(0, 5);
}

// Helper function to generate safety tips
function generateSafetyTips(radicalProbability: number, radicalContent: number): string[] {
  const tips = [
    "Consider the broader context before drawing conclusions",
    "Verify claims with established and reliable sources",
    "Be aware of emotional manipulation in content",
    "Recognize that strong opinions are not necessarily radical",
    "Seek diverse perspectives on controversial topics"
  ];

  if (radicalProbability > 70 || radicalContent > 70) {
    tips.push("Approach this content with critical thinking");
    tips.push("Be cautious about sharing potentially harmful content");
  }

  return tips.slice(0, 5);
}

// Main function to process video URL
async function processVideoUrl(url: string): Promise<any> {
  try {
    console.log(`[PROCESS] Starting video analysis process for URL: ${url}`);

    // Step 1: Download audio
    console.log(`[PROCESS] Step 1: Downloading audio`);
    const audioPath = await downloadAudio(url);

    // Step 2: Split audio into chunks
    console.log(`[PROCESS] Step 2: Splitting audio into chunks`);
    const chunkPaths = await splitAudioToChunks(audioPath);

    // Step 3: Transcribe each chunk in both English & Hindi
    console.log(`[PROCESS] Step 3: Transcribing audio chunks`);
    let englishTranscript = '';
    let hindiTranscript = '';

    for (let i = 0; i < chunkPaths.length; i++) {
      const chunkPath = chunkPaths[i];
      console.log(`[PROCESS] Processing chunk ${i+1}/${chunkPaths.length}: ${chunkPath}`);

      const gcsUri = await uploadToGCS(chunkPath);

      // Parallel transcription
      console.log(`[PROCESS] Transcribing chunk ${i+1} in parallel (English and Hindi)`);
      const [englishChunk, hindiChunk] = await Promise.all([
        transcribeAudio(gcsUri, 'en-US'),
        transcribeAudio(gcsUri, 'hi-IN')
      ]);

      englishTranscript += englishChunk + ' ';
      hindiTranscript += hindiChunk + ' ';
    }

    console.log(`[PROCESS] Transcription completed`);
    console.log(`[PROCESS] English transcript length: ${englishTranscript.length} chars`);
    console.log(`[PROCESS] Hindi transcript length: ${hindiTranscript.length} chars`);

    // Step 4: Analyze transcript with OpenAI
    console.log(`[PROCESS] Step 4: Analyzing transcript with OpenAI`);
    const analysis = await analyzeTranscript({
      english: englishTranscript.trim(),
      hindi: hindiTranscript.trim()
    });

    // Create video details
    const videoTitle = url.split('/').pop() || 'Unknown Video';
    const videoDuration = 0; // Could be improved with real metadata

    // Generate a unique analysis ID
    const analysisId = `video-analysis-${uuidv4()}`;

    // Step 5: Format and return the result
    console.log(`[PROCESS] Step 5: Formatting final result with ID: ${analysisId}`);
    const result = {
      type: "video",
      analysisId: analysisId,
      url: url,
      lastAnalyzedAt: new Date().toISOString(),
      feedbackGiven: false,
      success: true,
      message: "Video analysis completed successfully",
      inputParameters: {
        videoTitle: videoTitle,
        videoDuration: videoDuration || 0,
        transcription: {
          english: englishTranscript,
          hindi: hindiTranscript
        }
      },
      outputParameters: analysis
    };

    // Cleanup files
    console.log(`[PROCESS] Cleaning up temporary files`);
    cleanupFiles([audioPath, ...chunkPaths]);

    return result;
  } catch (error) {
    console.error(`[PROCESS] ERROR: Video analysis process failed: ${error}`);
    throw error;
  }
}

// Helper function to determine score label
function getScoreLabel(radicalProbability: number, radicalContent: number): string {
  const avgScore = (radicalProbability + radicalContent) / 2;
  if (avgScore >= 70) {
    return 'High Concern';
  } else if (avgScore >= 40) {
    return 'Moderate Concern';
  } else {
    return 'Low Concern';
  }
}

// Helper function to determine score color
function getScoreColor(radicalProbability: number, radicalContent: number): string {
  const avgScore = (radicalProbability + radicalContent) / 2;
  if (avgScore >= 70) {
    return 'red';
  } else if (avgScore >= 40) {
    return 'amber';
  } else {
    return 'green';
  }
}

// Helper function to clean up files
function cleanupFiles(filePaths: string[]): void {
  console.log(`[CLEANUP] Starting cleanup of ${filePaths.length} files`);

  filePaths.forEach(filePath => {
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        console.log(`[CLEANUP] Deleted file: ${filePath}`);
      } else {
        console.log(`[CLEANUP] File not found for deletion: ${filePath}`);
      }
    } catch (error) {
      console.error(`[CLEANUP] ERROR: Failed to delete file ${filePath}: ${error}`);
    }
  });

  console.log(`[CLEANUP] Cleanup completed`);
}

export async function POST(request: Request) {
  try {
    console.log(`[API] Received video analysis request`);
    const { url } = await request.json();

    if (!url) {
      console.error(`[API] ERROR: Missing URL parameter`);
      return NextResponse.json({ error: 'Video URL is required' }, { status: 400 });
    }

    console.log(`[API] Processing video URL: ${url}`);

    // Process video URL
    const result = await processVideoUrl(url);

    console.log(`[API] SUCCESS: Video analysis completed, returning results`);
    console.log(`[API] Returning results:`, result);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error(`[API] ERROR: Failed to process video analysis request: ${error}`);
    return NextResponse.json({ error: error.message || 'Failed to process video' }, { status: 500 });
  }
}
