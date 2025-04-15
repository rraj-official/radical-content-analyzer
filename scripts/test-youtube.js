// Script to test YouTube video downloading and transcription
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const {
  getYoutubeVideoInfo,
  downloadYoutubeVideo,
  extractAudioFromVideo,
  splitAudio,
  transcribeAudio,
  cleanup
} = require('../lib/api/file-utils');
const { isYoutubeUrl, extractYoutubeId } = require('../lib/api/utils');

// Create temp directory if it doesn't exist
const tempDir = process.env.TEMP_DIR || './tmp';
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir, { recursive: true });
}

// Test URL - use a short YouTube video for testing
const DEFAULT_TEST_URL = 'https://www.youtube.com/watch?v=jNQXAC9IVRw'; // "Me at the zoo" - First ever YouTube video

async function testYouTubeProcessing(url = DEFAULT_TEST_URL) {
  const testDir = path.join(tempDir, 'youtube-test');
  
  try {
    console.log('Starting YouTube video processing test...');
    console.log('Environment variables loaded:');
    console.log(`- GOOGLE_CLOUD_PROJECT_ID: ${process.env.GOOGLE_CLOUD_PROJECT_ID}`);
    console.log(`- GOOGLE_CLOUD_STORAGE_BUCKET: ${process.env.GOOGLE_CLOUD_STORAGE_BUCKET}`);
    console.log(`- GCS_BUCKET_NAME: ${process.env.GCS_BUCKET_NAME}`);
    console.log(`- GOOGLE_APPLICATION_CREDENTIALS: ${process.env.GOOGLE_APPLICATION_CREDENTIALS}`);
    
    // Create test directory
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }
    
    // Step 1: Validate YouTube URL
    console.log(`\n1. Validating YouTube URL: ${url}`);
    if (!isYoutubeUrl(url)) {
      throw new Error('Not a valid YouTube URL');
    }
    
    // Step 2: Extract YouTube video ID
    const videoId = extractYoutubeId(url);
    console.log(`2. Extracted video ID: ${videoId}`);
    if (!videoId) {
      throw new Error('Could not extract YouTube video ID');
    }
    
    // Step 3: Get YouTube video info
    console.log('\n3. Getting video information...');
    const videoInfo = await getYoutubeVideoInfo(url, videoId);
    console.log('Video info:');
    console.log(`   - Title: ${videoInfo.title}`);
    console.log(`   - Channel: ${videoInfo.channel}`);
    console.log(`   - Duration: ${videoInfo.duration} seconds`);
    
    // Step 4: Download YouTube video
    console.log('\n4. Downloading video...');
    const videoPath = path.join(testDir, 'video.mp4');
    await downloadYoutubeVideo(url, videoPath);
    
    // Step 5: Extract audio
    console.log('\n5. Extracting audio...');
    const audioPath = path.join(testDir, 'audio.wav');
    await extractAudioFromVideo(videoPath, audioPath);
    
    // Step 6: Split audio into chunks (if needed)
    console.log('\n6. Splitting audio (if needed)...');
    const fileSizeInMB = fs.statSync(audioPath).size / (1024 * 1024);
    if (fileSizeInMB > 10) {
      console.log(`Audio file is ${fileSizeInMB.toFixed(2)}MB, will be split into chunks`);
    } else {
      console.log(`Audio file is ${fileSizeInMB.toFixed(2)}MB, small enough for direct processing`);
    }
    
    // Step 7: Transcribe audio in English
    console.log('\n7. Transcribing audio in English...');
    const englishTranscription = await transcribeAudio(audioPath, 'en-US');
    console.log('English transcription:');
    console.log(englishTranscription);
    
    // Step 8: Transcribe audio in Hindi (for testing multi-language support)
    console.log('\n8. Transcribing audio in Hindi...');
    const hindiTranscription = await transcribeAudio(audioPath, 'hi-IN');
    console.log('Hindi transcription:');
    console.log(hindiTranscription);
    
    // Save transcriptions to files
    fs.writeFileSync(path.join(testDir, 'transcription_en.txt'), englishTranscription);
    fs.writeFileSync(path.join(testDir, 'transcription_hi.txt'), hindiTranscription);
    
    console.log('\nTest completed successfully!');
    console.log(`Artifacts saved to ${testDir}`);
    console.log('To clean up test files, run: node -e "require(\'fs\').rmSync(\'./tmp/youtube-test\', {recursive: true, force: true})"');
    
  } catch (error) {
    console.error('Error during YouTube processing test:', error);
  }
}

// Get URL from command line arguments
const url = process.argv[2] || DEFAULT_TEST_URL;
testYouTubeProcessing(url); 