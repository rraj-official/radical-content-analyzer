// Script to test the Google Cloud Speech-to-Text functionality
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { transcribeAudio } = require('../lib/api/file-utils');

// Create temp directory if it doesn't exist
const tempDir = process.env.TEMP_DIR || './tmp';
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir, { recursive: true });
}

async function testTranscription() {
  try {
    console.log('Starting transcription test...');
    console.log('Environment variables loaded:');
    console.log(`- GOOGLE_CLOUD_PROJECT_ID: ${process.env.GOOGLE_CLOUD_PROJECT_ID}`);
    console.log(`- GOOGLE_CLOUD_STORAGE_BUCKET: ${process.env.GOOGLE_CLOUD_STORAGE_BUCKET}`);
    console.log(`- GCS_BUCKET_NAME: ${process.env.GCS_BUCKET_NAME}`);
    console.log(`- GOOGLE_APPLICATION_CREDENTIALS: ${process.env.GOOGLE_APPLICATION_CREDENTIALS}`);
    
    // Sample audio file path (you need to have a WAV file in the tmp directory)
    const audioPath = path.join(tempDir, 'test-audio.wav');
    
    // Check if test audio file exists
    if (!fs.existsSync(audioPath)) {
      console.error(`Test audio file not found at ${audioPath}`);
      console.log('Please create a test-audio.wav file in the tmp directory to run this test.');
      return;
    }
    
    // Test English transcription
    console.log('\nTranscribing in English...');
    const englishTranscription = await transcribeAudio(audioPath, 'en-US');
    console.log('English transcription result:');
    console.log(englishTranscription);
    
    // Test Hindi transcription
    console.log('\nTranscribing in Hindi...');
    const hindiTranscription = await transcribeAudio(audioPath, 'hi-IN');
    console.log('Hindi transcription result:');
    console.log(hindiTranscription);
    
    console.log('\nTranscription test completed successfully.');
  } catch (error) {
    console.error('Error during transcription test:', error);
  }
}

// Run the test
testTranscription();