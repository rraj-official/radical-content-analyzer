import * as fs from 'fs';
import * as path from 'path';
import { exec } from 'child_process';
import * as util from 'util';
import { 
  transcribeAudioChunksInParallel, 
  uploadToGCS, 
  transcribeAudioGCS 
} from './google-cloud';

// Convert exec to promise-based
export const execAsync = util.promisify(exec);

/**
 * Function to clean up temporary files
 */
export function cleanup(directory: string, excludeFiles: string[] = []): void {
  try {
    if (!fs.existsSync(directory)) {
      console.log(`Directory ${directory} does not exist, skipping cleanup.`);
      return;
    }
    
    const files = fs.readdirSync(directory);
    let deletedCount = 0;
    
    for (const file of files) {
      const filePath = path.join(directory, file);
      
      if (!excludeFiles.includes(filePath) && fs.statSync(filePath).isFile()) {
        fs.unlinkSync(filePath);
        deletedCount++;
      }
    }
    
    console.log(`Cleaned up ${deletedCount} files from ${directory}`);
  } catch (error) {
    console.error('Error cleaning up files:', error);
  }
}

/**
 * Function to split audio into chunks
 */
export async function splitAudio(audioPath: string, outputDir: string, chunkDuration: number = 60): Promise<string[]> {
  const audioChunks: string[] = [];
  
  try {
    if (!fs.existsSync(audioPath)) {
      throw new Error(`Audio file ${audioPath} does not exist`);
    }
    
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    // Get audio duration using ffprobe
    const { stdout } = await execAsync(
      `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${audioPath}"`
    );
    
    const duration = parseFloat(stdout.trim());
    if (isNaN(duration)) {
      throw new Error(`Invalid duration for audio file ${audioPath}`);
    }
    
    console.log(`Audio duration: ${duration.toFixed(2)} seconds`);
    const numChunks = Math.ceil(duration / chunkDuration);
    console.log(`Splitting into ${numChunks} chunks of ${chunkDuration} seconds each`);
    
    // Split audio into chunks
    for (let i = 0; i < numChunks; i++) {
      const start = i * chunkDuration;
      const chunkPath = path.join(outputDir, `chunk_${i}.wav`);
      
      try {
        // Use higher quality settings for better transcription
        await execAsync(
          `ffmpeg -i "${audioPath}" -ss ${start} -t ${chunkDuration} -ar 16000 -ac 1 -c:a pcm_s16le "${chunkPath}"`
        );
        
        audioChunks.push(chunkPath);
      } catch (chunkError) {
        console.error(`Error processing chunk ${i}:`, chunkError);
        // Try with simpler copy method as fallback
        await execAsync(
          `ffmpeg -i "${audioPath}" -ss ${start} -t ${chunkDuration} -c copy "${chunkPath}"`
        );
        audioChunks.push(chunkPath);
      }
    }
    
    console.log(`Successfully split audio into ${audioChunks.length} chunks`);
    return audioChunks;
  } catch (error) {
    console.error('Error splitting audio:', error);
    throw error;
  }
}

/**
 * Function to get YouTube video info
 */
export async function getYoutubeVideoInfo(url: string, videoId: string): Promise<any> {
  try {
    console.log(`Fetching info for YouTube video: ${url}`);
    
    // Use yt-dlp to get video information
    const { stdout } = await execAsync(`yt-dlp --dump-json ${url}`);
    const videoInfo = JSON.parse(stdout);

    return {
      videoId,
      title: videoInfo.title || 'Unknown Title',
      thumbnail: videoInfo.thumbnail || `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
      duration: videoInfo.duration || 0,
      channel: videoInfo.channel || 'Unknown Channel',
      uploadDate: videoInfo.upload_date || 'Unknown',
      description: videoInfo.description || '',
      // Add more fields as needed
    };
  } catch (error) {
    console.error('Error getting YouTube video info:', error);
    
    // Fallback with minimal info in case yt-dlp isn't available
    return {
      videoId,
      title: 'Unknown Title',
      thumbnail: videoId ? `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg` : '',
      duration: 0,
      channel: 'Unknown Channel',
      uploadDate: 'Unknown',
      description: '',
    };
  }
}

/**
 * Function to download YouTube video
 */
export async function downloadYoutubeVideo(url: string, outputPath: string): Promise<void> {
  try {
    console.log(`Downloading YouTube video: ${url}`);
    
    // Create the directory if it doesn't exist
    const outputDir = path.dirname(outputPath);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    // Use yt-dlp to download the video
    await execAsync(`yt-dlp -f "best[height<=720]" -o "${outputPath}" ${url}`);
    
    // Verify the file exists
    if (!fs.existsSync(outputPath)) {
      throw new Error(`Download failed, file not found: ${outputPath}`);
    }
    
    const stats = fs.statSync(outputPath);
    console.log(`Successfully downloaded video (${(stats.size / (1024 * 1024)).toFixed(2)} MB)`);
  } catch (error) {
    console.error('Error downloading YouTube video:', error);
    throw error;
  }
}

/**
 * Function to extract audio from video
 */
export async function extractAudioFromVideo(videoPath: string, audioPath: string): Promise<void> {
  try {
    console.log(`Extracting audio from video: ${videoPath}`);
    
    if (!fs.existsSync(videoPath)) {
      throw new Error(`Video file ${videoPath} does not exist`);
    }
    
    // Create the directory if it doesn't exist
    const audioDir = path.dirname(audioPath);
    if (!fs.existsSync(audioDir)) {
      fs.mkdirSync(audioDir, { recursive: true });
    }
    
    // Extract high-quality audio for better transcription
    await execAsync(`ffmpeg -i "${videoPath}" -vn -acodec pcm_s16le -ar 16000 -ac 1 "${audioPath}"`);
    
    // Verify the file exists
    if (!fs.existsSync(audioPath)) {
      throw new Error(`Audio extraction failed, file not found: ${audioPath}`);
    }
    
    const stats = fs.statSync(audioPath);
    console.log(`Successfully extracted audio (${(stats.size / (1024 * 1024)).toFixed(2)} MB)`);
  } catch (error) {
    console.error('Error extracting audio from video:', error);
    throw error;
  }
}

/**
 * Compress audio file to reduce size
 */
export async function compressAudio(sourcePath: string, outputPath: string = ''): Promise<string> {
  try {
    if (!fs.existsSync(sourcePath)) {
      throw new Error(`Source audio file ${sourcePath} does not exist`);
    }
    
    // If output path is not provided, create a compressed version in the same directory
    if (!outputPath) {
      const dir = path.dirname(sourcePath);
      const baseName = path.basename(sourcePath, path.extname(sourcePath));
      outputPath = path.join(dir, `${baseName}_compressed.wav`);
    }
    
    // Compress audio using ffmpeg (reduced bitrate but still good for speech)
    await execAsync(`ffmpeg -i "${sourcePath}" -ar 16000 -ac 1 -ab 64k "${outputPath}"`);
    
    console.log(`Compressed audio saved to ${outputPath}`);
    return outputPath;
  } catch (error) {
    console.error('Error compressing audio:', error);
    return sourcePath; // Return original path if compression fails
  }
}

/**
 * Transcribe audio using Google Cloud Speech API
 */
export async function transcribeAudio(
  audioPath: string,
  languageCode: string = 'en-US'
): Promise<string> {
  try {
    console.log(`Transcribing audio at ${audioPath} in ${languageCode}...`);
    
    if (!fs.existsSync(audioPath)) {
      throw new Error(`Audio file ${audioPath} does not exist`);
    }
    
    // For long audio files, we need to split it into chunks
    const fileSizeInMB = fs.statSync(audioPath).size / (1024 * 1024);
    console.log(`Audio file size: ${fileSizeInMB.toFixed(2)} MB`);
    
    // If file is larger than 10MB, split it into chunks
    if (fileSizeInMB > 10) {
      console.log(`Audio file is ${fileSizeInMB.toFixed(2)}MB, splitting into chunks...`);
      
      // Try to compress the audio first to improve processing
      let processedAudioPath = audioPath;
      if (fileSizeInMB > 20) {
        console.log('Large audio file detected, compressing first...');
        processedAudioPath = await compressAudio(audioPath);
      }
      
      const chunkPaths = await splitAudio(processedAudioPath, path.dirname(audioPath));
      
      // Use GCS bucket for production environment
      const bucketName = process.env.GOOGLE_CLOUD_STORAGE_BUCKET || 'hackathon_police';
      
      // Transcribe the chunks in parallel
      const transcription = await transcribeAudioChunksInParallel(
        bucketName,
        chunkPaths,
        languageCode
      );
      
      // Clean up chunks
      console.log('Cleaning up temporary chunk files...');
      chunkPaths.forEach(chunkPath => {
        if (fs.existsSync(chunkPath)) {
          fs.unlinkSync(chunkPath);
        }
      });
      
      // Clean up compressed file if we created one
      if (processedAudioPath !== audioPath && fs.existsSync(processedAudioPath)) {
        fs.unlinkSync(processedAudioPath);
      }
      
      return transcription;
    } else {
      // For shorter audio, upload directly to GCS and transcribe
      const bucketName = process.env.GOOGLE_CLOUD_STORAGE_BUCKET || 'hackathon_police';
      const fileName = path.basename(audioPath);
      
      // Use the Google Cloud implementation
      const gcsUri = await uploadToGCS(bucketName, audioPath, fileName);
      return await transcribeAudioGCS(gcsUri, languageCode);
    }
  } catch (error) {
    console.error(`Error transcribing audio: ${error}`);
    
    // Return a fallback message in case of error
    return `Error transcribing audio in ${languageCode}. Please try again later.`;
  }
}