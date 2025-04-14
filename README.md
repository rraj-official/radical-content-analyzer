# Radical Content Analyzer

A tool for analyzing audio and video content using Google Cloud Speech-to-Text and AI language models.

## Features

- 🎤 Audio transcription using Google Cloud Speech-to-Text API
- 🎥 Video transcription (extracts audio and transcribes)
- 🔊 Support for multiple languages
- 📊 Content analysis using AI models
- 🌐 YouTube video analysis

## Setup

### Prerequisites

- Node.js (v16+)
- FFmpeg for audio processing
- Google Cloud credentials
- A Google Cloud Storage bucket

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

3. Create a `.env` file by copying the `.env.example`:
   ```
   cp .env.example .env
   ```

4. Set up your environment variables in the `.env` file:
   ```
   # Database
   DATABASE_URL="your_database_url_here"
   DIRECT_URL="your_direct_database_url_here"

   # Authentication
   AUTH_TOKEN="your_auth_token_here"

   # Google Cloud
   GOOGLE_GENERATIVE_AI_API_KEY="your_google_ai_api_key_here"
   GOOGLE_CLOUD_PROJECT_ID="your_google_cloud_project_id_here"
   GOOGLE_CLOUD_STORAGE_BUCKET="your_google_cloud_storage_bucket_here"
   GOOGLE_APPLICATION_CREDENTIALS="path_to_your_google_credentials_json_file"

   # OpenAI (if used)
   OPENAI_API_KEY="your_openai_api_key_here"

   # Storage
   TEMP_DIR="./tmp"
   ```

5. Place your Google Cloud service account credentials JSON file in a secure location and update the `GOOGLE_APPLICATION_CREDENTIALS` variable to point to this file.

### Google Cloud Setup

For detailed instructions on setting up Google Cloud:

1. Create a Google Cloud project
2. Enable the Speech-to-Text and Cloud Storage APIs
3. Create a service account with appropriate permissions
4. Download the service account key as JSON
5. Create a Cloud Storage bucket

See the [Google Cloud Integration Guide](docs/google-cloud-integration.md) for detailed setup instructions.

## Usage

### Starting the Development Server

```
npm run dev
```

### Testing Google Cloud Integration

To test your Google Cloud setup:

1. Place a test audio file in the `test-assets` directory with the name `test-audio.mp3`
2. Run the test script:
   ```
   npx tsx scripts/test-google-cloud.ts
   ```

## API Routes

### Analyze URL (YouTube)

```
POST /api/analyze/url
```

Request body:
```json
{
  "url": "https://www.youtube.com/watch?v=example"
}
```

### Analyze Video File

```
POST /api/analyze/video
```

Multipart form with a `video` field containing the video file.

### Analyze Audio File

```
POST /api/analyze/file
```

Multipart form with an `audio` field containing the audio file or a `transcript` field containing pre-transcribed text.

## Troubleshooting

See the [Google Cloud Integration Guide](docs/google-cloud-integration.md) for common issues and solutions.

## License

[MIT License](LICENSE)

