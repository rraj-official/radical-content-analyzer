# Radical Content Analyzer

A tool for analyzing audio and video content using Google Cloud Speech-to-Text and AI language models.

## Features

- 🎤 Audio transcription using Google Cloud Speech-to-Text API
- 🎥 Video transcription (extracts audio and transcribes)
- 🔊 Support for multiple languages
- 📊 Content analysis using OpenAI models
- 🌐 YouTube and X/Twitter video analysis

## Setup

### Prerequisites

- Node.js (v16+)
- FFmpeg for audio processing
- yt-dlp for video downloading
- Google Cloud credentials
- A Google Cloud Storage bucket
- OpenAI API key

### Installation

1. Clone the repository:
   ```
   git clone https://github.com/yourusername/radical-content-analyzer.git
   cd radical-content-analyzer
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Install system dependencies (FFmpeg and yt-dlp):
   ```
   # Make the script executable
   chmod +x scripts/install-dependencies.sh
   
   # Run the script with sudo
   sudo ./scripts/install-dependencies.sh
   ```

4. Create a `.env` file by copying the `.env.example`:
   ```
   cp .env.example .env
   ```

5. Set up your environment variables in the `.env` file:
   ```
   # Environment Variables
   NODE_ENV=development
   PORT=3000
   WEB_URL=https://radical-content-analyzer.com
   API_SECRET_KEY=your_secret_key_here
   MAX_UPLOAD_SIZE=50

   # Google Cloud credentials
   GOOGLE_CLOUD_TYPE=service_account
   GOOGLE_CLOUD_PROJECT_ID=your_project_id
   GOOGLE_CLOUD_PRIVATE_KEY_ID=your_private_key_id
   GOOGLE_CLOUD_PRIVATE_KEY="your_private_key_here"
   GOOGLE_CLOUD_CLIENT_EMAIL=your_client_email
   GOOGLE_CLOUD_CLIENT_ID=your_client_id
   GOOGLE_CLOUD_AUTH_URI=https://accounts.google.com/o/oauth2/auth
   GOOGLE_CLOUD_TOKEN_URI=https://oauth2.googleapis.com/token
   GOOGLE_CLOUD_AUTH_PROVIDER_X509_CERT_URL=https://www.googleapis.com/oauth2/v1/certs
   GOOGLE_CLOUD_CLIENT_X509_CERT_URL=your_client_cert_url
   GOOGLE_CLOUD_STORAGE_BUCKET=your_storage_bucket

   # OpenAI
   OPENAI_API_KEY=your_openai_api_key
   ```

6. Ensure all your credentials are correctly set in the `.env` file.

### Google Cloud Setup

For detailed instructions on setting up Google Cloud:

1. Create a Google Cloud project
2. Enable the Speech-to-Text and Cloud Storage APIs
3. Create a service account with appropriate permissions:
   - Speech-to-Text Admin (`roles/speech.admin`)
   - Storage Admin (`roles/storage.admin`)
4. Download the service account key as JSON
5. Create a Cloud Storage bucket for storing audio chunks

See the [Google Cloud Integration Guide](docs/google-cloud-integration.md) for detailed setup instructions.

## Usage

### Starting the Development Server

```
npm run dev
```

### Video Analysis Process

When analyzing a video:

1. The system downloads the video from the provided URL (YouTube, X/Twitter, etc.)
2. Audio is extracted from the video and converted to the proper format
3. Audio is split into manageable chunks (1 minute each)
4. Each chunk is uploaded to Google Cloud Storage
5. Google Speech-to-Text API transcribes the audio in both English and Hindi
6. The transcriptions are combined and sent to OpenAI for analysis
7. Results are displayed to the user

This process may take several minutes depending on the length of the video.

## API Routes

### Analyze Video URL

```
POST /api/analyze/video
```

Request body:
```json
{
  "url": "https://www.youtube.com/watch?v=example"
}
```

Response:
```json
{
  "type": "video",
  "analysisId": "unique-id",
  "url": "https://www.youtube.com/watch?v=example",
  "lastAnalyzedAt": "2023-09-21T15:30:00Z",
  "feedbackGiven": false,
  "inputParameters": {
    "videoTitle": "Example Video",
    "videoDuration": 300,
    "transcription": {
      "english": "English transcription text...",
      "hindi": "Hindi transcription text..."
    }
  },
  "outputParameters": {
    "radicalProbability": 45,
    "radicalContent": 30,
    "overallScore": {
      "score": 65,
      "label": "Moderate Concern",
      "color": "amber"
    },
    "lexicalAnalysis": "Analysis of lexical content...",
    "emotionAnalysis": "Analysis of emotional content...",
    "speechPatterns": "Analysis of speech patterns...",
    "religiousRhetoric": "Analysis of religious rhetoric...",
    "commandsDirectives": "Analysis of commands and directives...",
    "overallAssessment": "Overall assessment of the content...",
    "riskFactors": ["Factor 1", "Factor 2"],
    "safetyTips": ["Tip 1", "Tip 2"]
  }
}
```

### Analyze Website URL

```
POST /api/analyze/url
```

Request body:
```json
{
  "url": "https://example.com"
}
```

### Analyze Video File

```
POST /api/analyze/file
```

Multipart form with a `video` field containing the video file.

## Troubleshooting

### Common Issues

1. **FFmpeg or yt-dlp not found**: Ensure these are installed and in your PATH
   ```
   ffmpeg -version
   yt-dlp --version
   ```

2. **Google Cloud Authentication Failures**: Check your credentials in the `.env` file

3. **Storage Bucket Issues**: Verify that your bucket exists and is accessible with your credentials

4. **Timeout Errors**: For longer videos, the processing might time out. Consider adjusting server timeout settings or processing videos in smaller segments.

See the [Troubleshooting Guide](docs/troubleshooting.md) for more common issues and solutions.

## License

[MIT License](LICENSE)

