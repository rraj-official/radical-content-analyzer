import { NextResponse } from 'next/server';
import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { SpeechClient } from '@google-cloud/speech';
import { Storage } from '@google-cloud/storage';
import OpenAI from 'openai';
import { VideoAnalysisResult } from '@/lib/interfaces';
import pLimit from 'p-limit';

const ffmpeg = require('fluent-ffmpeg');

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

// -----------------------------
// ENSURE TEMP DIRECTORIES EXIST
// -----------------------------
const tmpDir = '/tmp';
const downloadsDir = path.join(tmpDir, 'downloads');
const audioDir = path.join(tmpDir, 'audio');
const chunksDir = path.join(tmpDir, 'chunks');

[downloadsDir, audioDir, chunksDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// -----------------------------
// HELPER FUNCTION: SAVE UPLOADED FILE
// -----------------------------
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

// -----------------------------
// HELPER FUNCTION: EXTRACT AUDIO FROM VIDEO (FLUENT-FFMPEG)
// -----------------------------
async function extractAudio(videoPath: string): Promise<string> {
  const audioId = path.basename(videoPath, path.extname(videoPath));
  const outputPath = path.join(audioDir, `${audioId}.wav`);

  if (!fs.existsSync(videoPath)) {
    console.error(`[AUDIO EXTRACTION] ERROR: Input video file not found at ${videoPath}`);
    throw new Error(`Input video file not found at ${videoPath}`);
  }

  return new Promise((resolve, reject) => {
    console.log(`[AUDIO EXTRACTION] Starting audio extraction from ${videoPath}`);
    
    ffmpeg(videoPath)
      .noVideo()
      .audioCodec('pcm_s16le')
      .audioFrequency(16000)
      .audioChannels(1)
      .output(outputPath)
      .on('start', (commandLine: string) => {
        console.log(`[AUDIO EXTRACTION] FFmpeg command: ${commandLine}`);
      })
      .on('progress', (progress: any) => {
        console.log(`[AUDIO EXTRACTION] Progress: ${Math.round(progress.percent || 0)}%`);
      })
      .on('end', () => {
        console.log(`[AUDIO EXTRACTION] SUCCESS: Audio extracted to ${outputPath}`);
        resolve(outputPath);
      })
      .on('error', (err: Error) => {
        console.error(`[AUDIO EXTRACTION] ERROR: ${err.message}`);
        reject(new Error(`Failed to extract audio: ${err.message}`));
      })
      .run();
  });
}

// -----------------------------
// HELPER FUNCTION: SPLIT AUDIO INTO CHUNKS (FLUENT-FFMPEG)
// -----------------------------
async function splitAudioToChunks(
  audioPath: string,
  chunkDurationMs: number = 60_000,
): Promise<string[]> {
  const base     = path.basename(audioPath, path.extname(audioPath));
  const pattern  = path.join(chunksDir, `${base}_chunk_%03d.wav`);
  const chunkSec = chunkDurationMs / 1000;

  return new Promise((resolve, reject) => {
    ffmpeg(audioPath)
      /* Re-encode so every output file is 16-kHz, mono, LINEAR16 PCM */
      .audioCodec('pcm_s16le')
      .audioFrequency(16000)
      .audioChannels(1)
      .outputOptions([
        '-f', 'segment',                // segment muxer: one pass
        '-segment_time', String(chunkSec),
      ])
      .output(pattern)
      .on('start', (cmd: string) =>
        console.log(`[AUDIO SPLITTING] ffmpeg command: ${cmd}`),
      )
      .on('end', () => {
        // collect all created chunk paths in order
        const chunks = fs
          .readdirSync(chunksDir)
          .filter((f) => f.startsWith(`${base}_chunk_`))
          .sort()
          .map((f) => path.join(chunksDir, f));

        console.log(
          `[AUDIO SPLITTING] SUCCESS: created ${chunks.length} chunks`,
        );
        resolve(chunks);
      })
      .on('error', (err: Error) =>
        reject(new Error(`Failed to split audio: ${err.message}`)),
      )
      .run();
  });
}

// -----------------------------
// HELPER FUNCTION: UPLOAD AUDIO TO GCS
// -----------------------------
async function uploadToGCS(filePath: string): Promise<string> {
  const fileName = path.basename(filePath);
  const bucket = storageClient.bucket(bucketName);
  const file = bucket.file(fileName);

  try {
    console.log(`[GCS UPLOAD] Starting upload: ${filePath}`);
    await bucket.upload(filePath, {
      destination: fileName,
      metadata: {
        contentType: 'audio/wav',
      },
    });

    const gcsUri = `gs://${bucketName}/${fileName}`;
    console.log(`[GCS UPLOAD] SUCCESS: Uploaded to ${gcsUri}`);
    return gcsUri;
  } catch (error) {
    console.error(`[GCS UPLOAD] ERROR: Failed to upload to GCS: ${error}`);
    throw new Error('Failed to upload audio to Google Cloud Storage');
  }
}

// -----------------------------
// HELPER FUNCTION: TRANSCRIBE AUDIO USING GOOGLE SPEECH API
// -----------------------------
async function transcribeAudio(gcsUri: string, languageCode: string = 'en-US'): Promise<string> {
  try {
    console.log(`[TRANSCRIPTION] Starting transcription for ${gcsUri}`);

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
    console.log(`[TRANSCRIPTION] Waiting for operation to complete...`);

    const [response] = await operation.promise();

    let transcript = '';
    if (response?.results) {
      response.results.forEach((result) => {
        if (result?.alternatives?.[0]?.transcript) {
          transcript += result.alternatives[0].transcript + ' ';
        }
      });
    }

    const truncatedTranscript = transcript.length > 100 ? transcript.substring(0, 100) + '...' : transcript;
    console.log(`[TRANSCRIPTION] SUCCESS: Transcript length ${transcript.length} chars`);
    console.log(`[TRANSCRIPTION] Preview: ${truncatedTranscript}`);

    return transcript.trim();
  } catch (error) {
    console.error(`[TRANSCRIPTION] ERROR: Failed to transcribe audio (${languageCode}): ${error}`);
    throw new Error(`Failed to transcribe audio in ${languageCode}`);
  }
}

// -----------------------------
// HELPER FUNCTION: ANALYZE TRANSCRIPT USING OPENAI
// -----------------------------
async function analyzeTranscript(transcript: { english: string; hindi: string }): Promise<any> {
  try {
    console.log(`[ANALYSIS] Starting OpenAI analysis`);
    console.log(`[ANALYSIS] English length: ${transcript.english.length} chars`);
    console.log(`[ANALYSIS] Hindi length: ${transcript.hindi.length} chars`);

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
      model: 'gpt-4-0125-preview',
      messages: [
        {
          role: 'system',
          content:
            'You are an expert analyst specializing in identifying radical content in speech transcripts. Your task is to objectively analyze transcripts and determine if they contain radical elements.',
        },
        { role: 'user', content: prompt },
      ],
      temperature: 0.3,
      max_tokens: 1500,
    });

    console.log(`[ANALYSIS] Received response from OpenAI`);
    if (!response.choices?.[0]?.message) {
      throw new Error('Invalid response from OpenAI');
    }

    const analysisText = response.choices[0].message.content || '';
    console.log(`[ANALYSIS] Analysis text length: ${analysisText.length} chars`);

    // Extract scores
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

    // Extract sections
    const lexicalAnalysis = extractSection(analysisText, 'Lexical Analysis');
    const emotionAnalysis = extractSection(analysisText, 'Emotion and Sentiment');
    const speechPatterns = extractSection(analysisText, 'Speech Patterns and Intensity');
    const religiousRhetoric = extractSection(analysisText, 'Use of Religious Rhetoric');
    const commandsDirectives = extractSection(analysisText, 'Frequency of Commands and Directives');

    // Extract risk factors and safety tips
    let riskFactors = extractRiskFactors(analysisText);
    let safetyTips = generateSafetyTips(radicalProbability, radicalContent);

    let overallAssessment = `This content has been analyzed for radical elements with an overall concern level of ${scoreLabel.toLowerCase()}. The radical probability score is ${radicalProbability}/100, and the radical content score is ${radicalContent}/100.`;

    let analysis = {
      radicalProbability,
      radicalContent,
      overallScore: {
        score: overallScore,
        label: scoreLabel,
        color: scoreColor,
      },
      lexicalAnalysis,
      emotionAnalysis,
      speechPatterns,
      religiousRhetoric,
      commandsDirectives,
      overallAssessment,
      riskFactors,
      safetyTips,
    };

    // ------------------------------------------------
    // CLEANUP: REMOVE "**" AND FILTER OUT DUPLICATES
    // ------------------------------------------------
    analysis.lexicalAnalysis = removeAsterisks(analysis.lexicalAnalysis);
    analysis.emotionAnalysis = removeAsterisks(analysis.emotionAnalysis);
    analysis.speechPatterns = removeAsterisks(analysis.speechPatterns);
    analysis.religiousRhetoric = removeAsterisks(analysis.religiousRhetoric);
    analysis.commandsDirectives = removeAsterisks(analysis.commandsDirectives);
    analysis.overallAssessment = removeAsterisks(analysis.overallAssessment);

    analysis.riskFactors = analysis.riskFactors
      .map((r: string) => removeAsterisks(r))
      .filter((r: string) => shouldKeepRiskFactor(r));

    analysis.safetyTips = analysis.safetyTips.map((tip: string) => removeAsterisks(tip));

    return analysis;
  } catch (error) {
    console.error(`[ANALYSIS] ERROR: Failed to analyze transcript: ${error}`);
    return {
      radicalProbability: 0,
      radicalContent: 0,
      overallScore: {
        score: 0,
        label: 'Error',
        color: 'gray',
      },
      lexicalAnalysis: 'Error analyzing content',
      emotionAnalysis: 'Error analyzing content',
      speechPatterns: 'Error analyzing content',
      religiousRhetoric: 'Error analyzing content',
      commandsDirectives: 'Error analyzing content',
      overallAssessment: 'An error occurred during analysis.',
      riskFactors: ['Analysis error'],
      safetyTips: ['Try again later'],
    };
  }
}

// -----------------------------
// HELPER FUNCTION: EXTRACT SECTION FROM ANALYSIS TEXT
// -----------------------------
function extractSection(text: string, sectionName: string): string {
  const regex = new RegExp(`${sectionName}[:\\s]+(.*?)(?=\\n\\s*\\n|\\n\\s*[A-Z]|$)`, 'si');
  const match = text.match(regex);
  return match && match[1] ? match[1].trim() : `No ${sectionName.toLowerCase()} found.`;
}

// -----------------------------
// HELPER FUNCTION: EXTRACT RISK FACTORS FROM ANALYSIS TEXT
// -----------------------------
function extractRiskFactors(text: string): string[] {
  const factors: string[] = [];
  const listItemRegex = /[-*•]\s+([^•\n]+)/g;
  let match;

  while ((match = listItemRegex.exec(text)) !== null) {
    if (match[1] && match[1].trim().length > 10) {
      factors.push(match[1].trim());
    }
  }

  if (factors.length === 0) {
    const keywords = ['concern', 'warning', 'caution', 'problematic', 'radical', 'extreme'];
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

  if (factors.length === 0) {
    factors.push('Potential radical content detected');
    factors.push('Review content for harmful messaging');
  }

  return factors.slice(0, 5);
}

// -----------------------------
// HELPER FUNCTION: GENERATE SAFETY TIPS
// -----------------------------
function generateSafetyTips(radicalProbability: number, radicalContent: number): string[] {
  const tips = [
    'Consider the broader context before drawing conclusions',
    'Verify claims with established and reliable sources',
    'Be aware of emotional manipulation in content',
    'Recognize that strong opinions are not necessarily radical',
    'Seek diverse perspectives on controversial topics',
  ];

  if (radicalProbability > 70 || radicalContent > 70) {
    tips.push('Approach this content with critical thinking');
    tips.push('Be cautious about sharing potentially harmful content');
  }

  return tips.slice(0, 5);
}

// -----------------------------
// MAIN FUNCTION: PROCESS VIDEO FILE (updated)
// -----------------------------
async function processVideoFile(file: File): Promise<any> {
  try {
    console.log(`[PROCESS] Starting video file analysis for: ${file.name}`);

    /* Step 1: Save uploaded file */
    const videoPath = await saveUploadedFile(file);
    
    /* Step 2: Extract audio & Step 3: chunk */
    const audioPath = await extractAudio(videoPath);
    const chunkPaths = await splitAudioToChunks(audioPath);

    /* Step 4: Upload + transcribe chunks concurrently */
    const limit = pLimit(8);                // throttle to 8 parallel chunks
    const results = await Promise.all(
      chunkPaths.map((chunkPath, idx) =>
        limit(async () => {
          console.log(`[PROCESS] Chunk ${idx + 1}/${chunkPaths.length}`);
          const gcsUri = await uploadToGCS(chunkPath);
          const [en, hi] = await Promise.all([
            transcribeAudio(gcsUri, 'en-US'),
            transcribeAudio(gcsUri, 'hi-IN'),
          ]);
          return { en, hi };
        }),
      ),
    );

    const englishTranscript = results.map(r => r.en).join(' ').trim();
    const hindiTranscript   = results.map(r => r.hi).join(' ').trim();

    console.log(`[PROCESS] Transcription complete: EN ${englishTranscript.length} chars, HI ${hindiTranscript.length} chars`);

    /* Step 5: OpenAI analysis */
    const analysis = await analyzeTranscript({ english: englishTranscript, hindi: hindiTranscript });

    /* Step 6: build & return response */
    const analysisId = `video-file-analysis-${uuidv4()}`;
    const result: VideoAnalysisResult = {
      type: 'video',
      analysisId,
      url: `file://${file.name}`,
      lastAnalyzedAt: new Date().toISOString(),
      feedbackGiven: false,
      success: true,
      message: 'Video file analysis completed successfully',
      inputParameters: {
        videoTitle: file.name.replace(/\.[^/.]+$/, ""),
        videoDuration: 0,
        transcription: { english: englishTranscript, hindi: hindiTranscript },
      },
      outputParameters: analysis,
    };

    console.log(`[PROCESS] Cleaning up temporary files`);
    cleanupFiles([videoPath, audioPath, ...chunkPaths]);

    return result;
  } catch (error) {
    console.error(`[PROCESS] ERROR: ${error}`);
    throw error;
  }
}

// -----------------------------
// HELPER FUNCTION: DETERMINE SCORE LABEL
// -----------------------------
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

// -----------------------------
// HELPER FUNCTION: DETERMINE SCORE COLOR
// -----------------------------
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

// -----------------------------
// HELPER FUNCTION: CLEAN UP FILES
// -----------------------------
function cleanupFiles(filePaths: string[]): void {
  console.log(`[CLEANUP] Starting cleanup of ${filePaths.length} files`);

  filePaths.forEach((filePath) => {
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

// -----------------------------
// API ROUTE: POST HANDLER
// -----------------------------
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

    const result = await processVideoFile(file);

    console.log(`[API] SUCCESS: Video file analysis completed, returning results`);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error(`[API] ERROR: Failed to process video file analysis request: ${error}`);
    return NextResponse.json({ error: error.message || 'Failed to process video file' }, { status: 500 });
  }
} 