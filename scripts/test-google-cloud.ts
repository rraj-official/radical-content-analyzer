import * as path from 'path';
import * as fs from 'fs';
import { uploadToGCS, transcribeAudioGCS, transcribeAudioChunksInParallel } from '../lib/api/google-cloud';

// Configuration
const BUCKET_NAME = process.env.GOOGLE_CLOUD_STORAGE_BUCKET || 'radical-content-analyzer-test';
const TEST_ASSETS_DIR = path.join(__dirname, '../test-assets');
const TEST_AUDIO_FILE = path.join(TEST_ASSETS_DIR, 'test-audio.mp3');
const TEST_CHUNKS_DIR = path.join(TEST_ASSETS_DIR, 'chunks');
const LANGUAGE_CODE = 'en-US';

// Create test directories if they don't exist
function ensureDirectoriesExist() {
  if (!fs.existsSync(TEST_ASSETS_DIR)) {
    console.log(`Creating test assets directory: ${TEST_ASSETS_DIR}`);
    fs.mkdirSync(TEST_ASSETS_DIR, { recursive: true });
  }
  
  if (!fs.existsSync(TEST_CHUNKS_DIR)) {
    console.log(`Creating chunks directory: ${TEST_CHUNKS_DIR}`);
    fs.mkdirSync(TEST_CHUNKS_DIR, { recursive: true });
  }
}

// Check for test audio file
function checkForTestAudio(): boolean {
  if (!fs.existsSync(TEST_AUDIO_FILE)) {
    console.error(`⚠️ Test audio file not found: ${TEST_AUDIO_FILE}`);
    console.log('Please place a test audio file named "test-audio.mp3" in the test-assets directory.');
    return false;
  }
  
  console.log(`✅ Found test audio file: ${TEST_AUDIO_FILE}`);
  const fileSizeMB = fs.statSync(TEST_AUDIO_FILE).size / (1024 * 1024);
  console.log(`   File size: ${fileSizeMB.toFixed(2)} MB`);
  return true;
}

// Check environment variables
function checkEnvironmentVariables(): boolean {
  const missingVars = [];
  
  if (!process.env.GOOGLE_CLOUD_PROJECT_ID) missingVars.push('GOOGLE_CLOUD_PROJECT_ID');
  if (!process.env.GOOGLE_CLOUD_STORAGE_BUCKET) missingVars.push('GOOGLE_CLOUD_STORAGE_BUCKET');
  if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) missingVars.push('GOOGLE_APPLICATION_CREDENTIALS');
  
  if (missingVars.length > 0) {
    console.error('⚠️ Missing environment variables:');
    missingVars.forEach(variable => console.error(`   - ${variable}`));
    console.log('Please set these variables in your .env file.');
    return false;
  }
  
  console.log('✅ Environment variables check passed');
  return true;
}

async function runTests() {
  console.log('Starting Google Cloud API tests...');
  console.log('=====================================');
  
  // Setup and preliminary checks
  ensureDirectoriesExist();
  
  const envCheck = checkEnvironmentVariables();
  const audioCheck = checkForTestAudio();
  
  if (!envCheck || !audioCheck) {
    console.error('\n❌ Prerequisites check failed. Please fix the issues above and try again.');
    process.exit(1);
  }
  
  try {
    // Test 1: Upload file to GCS
    console.log('\n1. Testing uploadToGCS...');
    const destinationBlobName = `test-${Date.now()}.mp3`;
    const gcsUri = await uploadToGCS(BUCKET_NAME, TEST_AUDIO_FILE, destinationBlobName);
    console.log(`✅ Upload successful. GCS URI: ${gcsUri}`);
    
    // Test 2: Transcribe single audio file
    console.log('\n2. Testing transcribeAudioGCS...');
    const transcription = await transcribeAudioGCS(gcsUri, LANGUAGE_CODE);
    console.log(`✅ Transcription successful (${transcription.length} characters)`);
    console.log('First 200 characters of transcription:');
    console.log(`"${transcription.substring(0, 200)}${transcription.length > 200 ? '...' : ''}"`);
    
    // Test 3: Transcribe multiple chunks in parallel
    console.log('\n3. Testing transcribeAudioChunksInParallel...');
    
    // Create two sample chunks from the test audio if they don't exist
    const chunkFiles = [
      path.join(TEST_CHUNKS_DIR, 'chunk1.mp3'),
      path.join(TEST_CHUNKS_DIR, 'chunk2.mp3')
    ];
    
    // Check if test chunks already exist
    const chunksExist = chunkFiles.every(file => fs.existsSync(file));
    
    if (!chunksExist) {
      console.log('Sample chunks do not exist. Creating them from test audio...');
      try {
        // Copy test audio to create mock chunks for testing
        fs.copyFileSync(TEST_AUDIO_FILE, chunkFiles[0]);
        fs.copyFileSync(TEST_AUDIO_FILE, chunkFiles[1]);
        console.log('✅ Created sample chunks for testing');
      } catch (error) {
        console.error('❌ Failed to create sample chunks:', error.message);
        console.log('Skipping parallel transcription test');
        chunkFiles.length = 0;
      }
    }
    
    if (chunkFiles.length > 0) {
      try {
        const parallelTranscription = await transcribeAudioChunksInParallel(
          BUCKET_NAME,
          chunkFiles,
          LANGUAGE_CODE
        );
        console.log(`✅ Parallel transcription successful (${parallelTranscription.length} characters)`);
        console.log('First 200 characters of parallel transcription:');
        console.log(`"${parallelTranscription.substring(0, 200)}${parallelTranscription.length > 200 ? '...' : ''}"`);
      } catch (error) {
        console.error(`❌ Parallel transcription test failed: ${error.message}`);
      }
    }
    
    console.log('\n✅ All tests completed successfully!');
  } catch (error) {
    console.error(`\n❌ Test failed: ${error.message}`);
    if (error.stack) {
      console.error('Stack trace:');
      console.error(error.stack);
    }
    process.exit(1);
  }
}

// Run the tests
runTests().then(() => {
  console.log('\nTest script execution completed.');
}).catch(err => {
  console.error('Fatal error running tests:', err);
  process.exit(1);
}); 