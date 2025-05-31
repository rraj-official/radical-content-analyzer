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
// HELPER FUNCTIONS (shared with video URL route)
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

// Helper function to save uploaded file
async function saveUploadedFile(file: File): Promise<string> {
  const videoId = uuidv4();
  const fileExtension = path.extname(file.name) || '.mp4';
  const outputPath = path.join(downloadsDir, `${videoId}${fileExtension}`);

  try {
    console.log(`[FILE SAVE] Saving uploaded file: ${file.name}`);
    console.log(`[FILE SAVE] Output path: ${outputPath}`);

    // Convert File to Buffer and save
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    fs.writeFileSync(outputPath, buffer);

    console.log(`[FILE SAVE] SUCCESS: File saved successfully to: ${outputPath}`);
    return outputPath;
  } catch (error) {
    console.error(`[FILE SAVE] ERROR: Failed to save uploaded file: ${error}`);
    throw new Error('Failed to save uploaded video file');
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
      `ffmpeg -i "${videoPath}" -vn -acodec pcm_s16le -ar 16000 -ac 1 "${outputPath}"`,
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
      execSync(
        `ffmpeg -i "${audioPath}" -ss ${startTime} -t ${chunkDurationMs/1000} -c copy "${chunkPath}"`,
        { stdio: 'pipe' }
      );

      if (fs.existsSync(chunkPath)) {
        chunkPaths.push(chunkPath);
        console.log(`[AUDIO SPLITTING] SUCCESS: Chunk ${i+1} created at ${chunkPath}`);
      } else {
        console.warn(`[AUDIO SPLITTING] WARNING: Chunk ${i+1} was not created properly`);
      }
    }

    console.log(`[AUDIO SPLITTING] SUCCESS: Created ${chunkPaths.length} audio chunks`);
    return chunkPaths;
  } catch (error: any) {
    console.error(`[AUDIO SPLITTING] ERROR: Failed to split audio: ${error.message}`);
    throw new Error(`Failed to split audio into chunks: ${error.message || 'Unknown error'}`);
  }
}

// Helper function to upload file to Google Cloud Storage
async function uploadToGCS(filePath: string): Promise<string> {
  try {
    console.log(`[GCS UPLOAD] Starting upload: ${filePath}`);

    const fileName = `audio-chunks/${path.basename(filePath)}`;
    const file = storageClient.bucket(bucketName).file(fileName);

    await file.save(fs.readFileSync(filePath), {
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
    const [response] = await speechClient.recognize(request);

    if (!response.results || response.results.length === 0) {
      console.log(`[TRANSCRIPTION] WARNING: No transcription results for ${gcsUri}`);
      return '';
    }

    const transcription = response.results
      .map(result => result.alternatives?.[0]?.transcript || '')
      .join(' ');

    console.log(`[TRANSCRIPTION] SUCCESS: Transcribed ${transcription.length} characters`);
    return transcription;
  } catch (error) {
    console.error(`[TRANSCRIPTION] ERROR: Failed to transcribe ${gcsUri}: ${error}`);
    // Return empty string instead of throwing to allow partial analysis
    return '';
  }
}

// Helper function to analyze transcript with OpenAI
async function analyzeTranscript(transcript: { english: string; hindi: string }): Promise<any> {
  try {
    console.log(`[ANALYSIS] Starting OpenAI analysis`);
    console.log(`[ANALYSIS] English transcript length: ${transcript.english.length} chars`);
    console.log(`[ANALYSIS] Hindi transcript length: ${transcript.hindi.length} chars`);

    const combinedText = `
English Transcript:
${transcript.english}

Hindi Transcript:
${transcript.hindi}
    `.trim();

    const prompt = `
You are an expert analyst specializing in detecting radical and extremist content in video transcripts. Please analyze the following video transcript(s) and provide a comprehensive assessment.

TRANSCRIPT TO ANALYZE:
${combinedText}

Please provide your analysis in the following structured format:

**LEXICAL ANALYSIS**
[Analyze the vocabulary, terminology, and specific words used. Look for inflammatory language, coded language, or terms commonly associated with radical ideologies.]

**EMOTION AND SENTIMENT**
[Analyze the emotional tone, sentiment patterns, and psychological appeals used in the content.]

**SPEECH PATTERNS AND INTENSITY**
[Examine delivery style, repetition, emphasis patterns, and overall intensity of messaging.]

**USE OF RELIGIOUS RHETORIC**
[Identify any religious references, scriptural citations, or theological arguments that might be used to justify extreme positions.]

**FREQUENCY OF COMMANDS AND DIRECTIVES**
[Count and analyze any direct calls to action, commands, or directives given to the audience.]

**OVERALL ASSESSMENT**
[Provide a summary of your findings and overall risk assessment.]

**RISK FACTORS**
- [List specific concerning elements found]
- [Use bullet points for each risk factor]

Please provide scores from 0-100 for:
- Radical Probability: [score]
- Radical Content: [score]

Be thorough but objective in your analysis.
    `;

    const response = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 2000,
      temperature: 0.3,
    });

    const analysis = response.choices[0]?.message?.content || '';
    console.log(`[ANALYSIS] SUCCESS: OpenAI analysis completed`);

    // Parse the analysis
    const radicalProbabilityMatch = analysis.match(/Radical Probability:\s*(\d+)/i);
    const radicalContentMatch = analysis.match(/Radical Content:\s*(\d+)/i);

    const radicalProbability = radicalProbabilityMatch ? parseInt(radicalProbabilityMatch[1]) : 30;
    const radicalContent = radicalContentMatch ? parseInt(radicalContentMatch[1]) : 25;

    // Extract sections
    const lexicalAnalysis = extractSection(analysis, 'LEXICAL ANALYSIS');
    const emotionAnalysis = extractSection(analysis, 'EMOTION AND SENTIMENT');
    const speechPatterns = extractSection(analysis, 'SPEECH PATTERNS AND INTENSITY');
    const religiousRhetoric = extractSection(analysis, 'USE OF RELIGIOUS RHETORIC');
    const commandsDirectives = extractSection(analysis, 'FREQUENCY OF COMMANDS AND DIRECTIVES');
    const overallAssessment = extractSection(analysis, 'OVERALL ASSESSMENT');

    // Extract risk factors
    const riskFactors = extractRiskFactors(analysis);

    // Generate safety tips
    const safetyTips = generateSafetyTips(radicalProbability, radicalContent);

    return {
      radicalProbability,
      radicalContent,
      overallScore: {
        score: Math.round((radicalProbability + radicalContent) / 2),
        label: getScoreLabel(radicalProbability, radicalContent),
        color: getScoreColor(radicalProbability, radicalContent)
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
  } catch (error) {
    console.error(`[ANALYSIS] ERROR: OpenAI analysis failed: ${error}`);
    throw new Error('Failed to analyze transcript with AI');
  }
}

// Helper function to extract sections from analysis text
function extractSection(text: string, sectionName: string): string {
  const regex = new RegExp(`\\*\\*${sectionName}\\*\\*([\\s\\S]*?)(?=\\*\\*|$)`, 'i');
  const match = text.match(regex);
  return match ? removeAsterisks(match[1].trim()) : `${sectionName} analysis not available.`;
}

// Helper function to extract risk factors
function extractRiskFactors(text: string): string[] {
  const factors: string[] = [];
  
  // Look for the RISK FACTORS section
  const riskFactorsMatch = text.match(/\*\*RISK FACTORS\*\*([^*]+)/i);
  if (riskFactorsMatch) {
    const riskSection = riskFactorsMatch[1];
    
    // Extract bullet points or lines that start with -
    const lines = riskSection.split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith('-') || trimmed.startsWith('•')) {
        const factor = trimmed.replace(/^[-•]\s*/, '').trim();
        if (factor.length > 5 && shouldKeepRiskFactor(factor)) {
          factors.push(factor);
        }
      }
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

// Main function to process uploaded video file
async function processVideoFile(file: File): Promise<any> {
  try {
    console.log(`[PROCESS] Starting video file analysis for: ${file.name}`);

    // Step 1: Save uploaded file (skipping download step)
    console.log(`[PROCESS] Step 1: Saving uploaded file`);
    const videoPath = await saveUploadedFile(file);

    // Step 2: Extract audio
    console.log(`[PROCESS] Step 2: Extracting audio`);
    const audioPath = await extractAudio(videoPath);

    // Step 3: Split audio into chunks
    console.log(`[PROCESS] Step 3: Splitting audio into chunks`);
    const chunkPaths = await splitAudioToChunks(audioPath);

    // Step 4: Transcribe each chunk in both English & Hindi
    console.log(`[PROCESS] Step 4: Transcribing audio chunks`);
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

    // Step 5: Analyze transcript with OpenAI
    console.log(`[PROCESS] Step 5: Analyzing transcript with OpenAI`);
    const analysis = await analyzeTranscript({
      english: englishTranscript.trim(),
      hindi: hindiTranscript.trim()
    });

    // Create video details
    const videoTitle = file.name.replace(/\.[^/.]+$/, ""); // Remove file extension
    const videoDuration = 0; // Could be improved with real metadata

    // Generate a unique analysis ID
    const analysisId = `video-file-analysis-${uuidv4()}`;

    // Step 6: Format and return the result
    console.log(`[PROCESS] Step 6: Formatting final result with ID: ${analysisId}`);
    const result = {
      type: "video",
      analysisId: analysisId,
      url: `file://${file.name}`,
      lastAnalyzedAt: new Date().toISOString(),
      feedbackGiven: false,
      success: true,
      message: "Video file analysis completed successfully",
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
    cleanupFiles([videoPath, audioPath, ...chunkPaths]);

    return result;
  } catch (error) {
    console.error(`[PROCESS] ERROR: Video file analysis process failed: ${error}`);
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
    console.log(`[API] Received video file analysis request`);
    
    const formData = await request.formData();
    const file = formData.get('video') as File;

    if (!file) {
      console.error(`[API] ERROR: Missing video file parameter`);
      return NextResponse.json({ error: 'Video file is required' }, { status: 400 });
    }

    console.log(`[API] Processing video file: ${file.name}, size: ${file.size} bytes`);

    // Process video file
    const result = await processVideoFile(file);

    console.log(`[API] SUCCESS: Video file analysis completed, returning results`);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error(`[API] ERROR: Failed to process video file analysis request: ${error}`);
    return NextResponse.json({ error: error.message || 'Failed to process video file' }, { status: 500 });
  }
} 