# Google Cloud Integration Guide

## Overview

This document explains how to set up and use Google Cloud Storage and Speech-to-Text API in the Radical Content Analyzer application. These services are used for:

1. Storing audio and video files in Google Cloud Storage
2. Transcribing audio using Google Cloud Speech-to-Text API
3. Processing large audio files by splitting them into chunks and transcribing in parallel

## Prerequisites

To use Google Cloud services, you need:

1. A Google Cloud account
2. A Google Cloud project with billing enabled
3. Google Cloud Storage and Speech-to-Text APIs enabled for your project
4. Service account credentials with appropriate permissions

## Setup Instructions

### 1. Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click on "Select a Project" at the top, then "New Project"
3. Name your project and click "Create"
4. Note your Project ID for later use

### 2. Enable Required APIs

1. In your Google Cloud project, go to "APIs & Services" > "Library"
2. Search for and enable the following APIs:
   - Cloud Storage API
   - Speech-to-Text API

### 3. Create a Service Account

1. Go to "IAM & Admin" > "Service Accounts"
2. Click "Create Service Account"
3. Name your service account and click "Create"
4. Assign the following roles:
   - Storage Admin
   - Speech-to-Text Admin
5. Click "Continue" and then "Done"
6. Click on the service account you just created
7. Go to the "Keys" tab and click "Add Key" > "Create new key"
8. Choose JSON format and click "Create"
9. Save the downloaded JSON file securely

### 4. Create a Storage Bucket

1. Go to "Cloud Storage" > "Buckets"
2. Click "Create Bucket"
3. Name your bucket (must be globally unique)
4. Configure settings as needed and click "Create"
5. Note your bucket name for later use

### 5. Configure Environment Variables

Add the following variables to your `.env` file:

```
GOOGLE_CLOUD_PROJECT_ID="your-project-id"
GOOGLE_CLOUD_STORAGE_BUCKET="your-bucket-name"
GOOGLE_APPLICATION_CREDENTIALS="path/to/your-credentials.json"
```

- For local development, set `GOOGLE_APPLICATION_CREDENTIALS` to the full path of your service account JSON file
- For production deployment, you'll need to set up credentials differently depending on your hosting environment

## Usage in the Application

### Uploading Files to Google Cloud Storage

The application uses the `uploadToGCS` function to store files in your Google Cloud Storage bucket:

```typescript
import { uploadToGCS } from '@/lib/api/google-cloud';

// Example usage
const gcsUri = await uploadToGCS(
  'your-bucket-name',
  '/path/to/local/file.mp3',
  'destination-filename.mp3'
);
// Returns: gs://your-bucket-name/destination-filename.mp3
```

### Transcribing Audio

For transcription, there are two main functions:

1. `transcribeAudioGCS` - Transcribes a single audio file from a GCS URI:

```typescript
import { transcribeAudioGCS } from '@/lib/api/google-cloud';

// Example usage
const transcription = await transcribeAudioGCS(
  'gs://your-bucket-name/audio-file.mp3',
  'en-US'  // language code, optional
);
```

2. `transcribeAudioChunksInParallel` - Handles multiple audio chunks in parallel:

```typescript
import { transcribeAudioChunksInParallel } from '@/lib/api/google-cloud';

// Example usage
const transcription = await transcribeAudioChunksInParallel(
  'your-bucket-name',
  ['/path/to/chunk1.wav', '/path/to/chunk2.wav'],
  'en-US'  // language code, optional
);
```

### High-Level Helper Function

For most cases, you can use the `transcribeAudio` function from `file-utils.ts`, which handles all the complexity:

```typescript
import { transcribeAudio } from '@/lib/api/file-utils';

// Example usage
const transcription = await transcribeAudio(
  '/path/to/audio-file.mp3',
  'en-US'  // language code, optional
);
```

This function:
- Automatically handles large files by splitting them into chunks
- Compresses audio if needed
- Uploads to GCS and transcribes
- Cleans up temporary files

## Testing the Integration

To test your Google Cloud integration:

1. Ensure your environment variables are set correctly
2. Place a test audio file in the `test-assets` directory
3. Run the test script:

```
npx tsx scripts/test-google-cloud.ts
```

## Troubleshooting

### Authentication Issues

- Verify your `GOOGLE_APPLICATION_CREDENTIALS` points to a valid service account JSON file
- Check that your service account has the required permissions
- For deployed environments, ensure the hosting service has access to the credentials

### Storage Issues

- Verify your bucket exists and your service account has access to it
- Check that the bucket name in your code matches the actual bucket name

### Transcription Issues

- Ensure the audio file is in a supported format (WAV, FLAC, MP3)
- Check that the audio quality is sufficient for transcription
- For long audio files, verify the chunking process is working correctly

## Resources

- [Google Cloud Storage Documentation](https://cloud.google.com/storage/docs)
- [Google Cloud Speech-to-Text Documentation](https://cloud.google.com/speech-to-text/docs)
- [Node.js Google Cloud Libraries](https://github.com/googleapis/google-cloud-node) 