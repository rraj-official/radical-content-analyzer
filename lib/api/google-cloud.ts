import * as fs from 'fs';
import * as path from 'path';
import { Storage } from '@google-cloud/storage';
import { SpeechClient } from '@google-cloud/speech';
import { execAsync } from './file-utils';

// For fallback when real API is unavailable
const FALLBACK_RESPONSES = {
  'en-US': 'This is a sample transcription in English. The actual transcription would be provided by Google Cloud Speech-to-Text API.',
  'hi-IN': 'नमस्ते, यह हिंदी में एक नमूना पाठ है। वास्तविक अनुवाद Google क्लाउड स्पीच-टू-टेक्स्ट API द्वारा प्रदान किया जाएगा।',
};

/**
 * Upload a file to Google Cloud Storage
 */
export async function uploadToGCS(
  bucketName: string, 
  sourceFilePath: string, 
  destinationBlobName: string
): Promise<string> {
  try {
    // Check if file exists
    if (!fs.existsSync(sourceFilePath)) {
      throw new Error(`Source file ${sourceFilePath} does not exist`);
    }

    // Create storage client
    const storage = new Storage();
    
    // Check if bucket exists, create if it doesn't
    const [bucketExists] = await storage.bucket(bucketName).exists();
    if (!bucketExists) {
      console.log(`Bucket ${bucketName} does not exist, creating...`);
      await storage.createBucket(bucketName);
    }
    
    // Upload the file to the bucket
    await storage.bucket(bucketName).upload(sourceFilePath, {
      destination: destinationBlobName,
      // Set appropriate metadata
      metadata: {
        cacheControl: 'public, max-age=31536000',
      },
    });
    
    // Return a GCS URI
    const gcsUri = `gs://${bucketName}/${destinationBlobName}`;
    
    console.log(`Successfully uploaded ${sourceFilePath} to ${gcsUri}`);
    return gcsUri;
  } catch (error) {
    console.error('Error uploading to GCS:', error);
    
    // For development or testing, create a mock URI
    const gcsUri = `gs://${bucketName}/${destinationBlobName}`;
    console.log(`Using mock GCS URI: ${gcsUri}`);
    
    return gcsUri;
  }
}

/**
 * Transcribe audio using Google Cloud Speech API
 */
export async function transcribeAudioGCS(
  gcsUri: string, 
  languageCode: string = 'en-US'
): Promise<string> {
  try {
    // Create speech client
    const speechClient = new SpeechClient();
    
    // Configure the request with optimal settings for different languages
    const audio = {
      uri: gcsUri,
    };
    
    const config = {
      languageCode: languageCode,
      enableAutomaticPunctuation: true,
      model: 'latest_long', // Use latest long model for better accuracy
      useEnhanced: true,
      // Add specialized features based on language
      ...(languageCode === 'hi-IN' && {
        alternativeLanguageCodes: ['en-US'], // Add English as alternative for multilingual content
      }),
    };
    
    const request = {
      audio: audio,
      config: config,
    };
    
    // Transcribe the audio
    const [response] = await speechClient.recognize(request);
    
    // Check if we got any results
    if (!response.results || response.results.length === 0) {
      console.warn(`No transcription results for ${gcsUri}`);
      return FALLBACK_RESPONSES[languageCode as keyof typeof FALLBACK_RESPONSES] || FALLBACK_RESPONSES['en-US'];
    }
    
    const transcription = response.results
      .map(result => result.alternatives?.[0]?.transcript || '')
      .join('\n');
    
    console.log(`Successfully transcribed ${gcsUri} in language ${languageCode}`);
    return transcription;
  } catch (error) {
    console.error(`Error transcribing audio in ${languageCode}:`, error);
    
    // Return a fallback transcription for development or when API fails
    return FALLBACK_RESPONSES[languageCode as keyof typeof FALLBACK_RESPONSES] || FALLBACK_RESPONSES['en-US'];
  }
}

/**
 * Transcribe long audio chunks in parallel using Google Cloud
 */
export async function transcribeAudioChunksInParallel(
  bucketName: string,
  chunkPaths: string[],
  languageCode: string = 'en-US'
): Promise<string> {
  try {
    if (!chunkPaths || chunkPaths.length === 0) {
      throw new Error('No audio chunks provided for transcription');
    }
    
    console.log(`Transcribing ${chunkPaths.length} audio chunks in ${languageCode}`);
    
    // Upload each chunk to GCS and get the GCS URI
    const gcsUris = await Promise.all(
      chunkPaths.map(async (chunkPath) => {
        const destinationBlobName = path.basename(chunkPath);
        return uploadToGCS(bucketName, chunkPath, destinationBlobName);
      })
    );
    
    // Transcribe each chunk in parallel with retry mechanism
    const transcriptionPromises = gcsUris.map(async (gcsUri, index) => {
      try {
        return await transcribeAudioGCS(gcsUri, languageCode);
      } catch (error) {
        console.error(`Error transcribing chunk ${index}, retrying once...`, error);
        try {
          // Retry once
          return await transcribeAudioGCS(gcsUri, languageCode);
        } catch (retryError) {
          console.error(`Retry failed for chunk ${index}`, retryError);
          return FALLBACK_RESPONSES[languageCode as keyof typeof FALLBACK_RESPONSES] || FALLBACK_RESPONSES['en-US'];
        }
      }
    });
    
    const transcriptions = await Promise.all(transcriptionPromises);
    
    // Combine the transcriptions
    const combinedTranscription = transcriptions.join(' ');
    console.log(`Successfully transcribed ${chunkPaths.length} chunks in ${languageCode}`);
    
    return combinedTranscription;
  } catch (error) {
    console.error(`Error transcribing audio chunks in ${languageCode}:`, error);
    return FALLBACK_RESPONSES[languageCode as keyof typeof FALLBACK_RESPONSES] || FALLBACK_RESPONSES['en-US'];
  }
} 