# Vercel Deployment Guide

This guide will help you fix common deployment errors when deploying your application on Vercel.

## Common Errors & Solutions

### Error 1: JSON Parsing Error
**Error**: "Unexpected token '<', "<!doctype "... is not valid JSON"

This error occurs because the application can't properly construct URLs for API calls in the Vercel environment, causing it to hit 404 pages that return HTML instead of JSON.

#### Solutions

##### Solution 1: Enable System Environment Variables (Recommended)

1. Go to your Vercel project dashboard
2. Navigate to **Settings** → **Environment Variables**
3. Scroll down and check the box for **"Automatically expose System Environment Variables"**
4. This will make `VERCEL_URL`, `VERCEL_PROJECT_PRODUCTION_URL`, and other system variables available to your application

##### Solution 2: Manual Environment Variables

If Solution 1 doesn't work, manually add these environment variables:

**For Production:**
- **Key**: `VERCEL_URL`
- **Value**: Leave empty (Vercel will populate this automatically)
- **Environment**: Production

**For Preview:**
- **Key**: `VERCEL_URL` 
- **Value**: Leave empty (Vercel will populate this automatically)
- **Environment**: Preview

### Error 2: File System Error
**Error**: "EROFS: read-only file system, open '/var/task/tmp/downloads/...'

This error occurs because Vercel functions run in a read-only file system environment, and only the `/tmp` directory is writable.

#### Solution: Use System Temp Directory

✅ **Fixed in latest code**: The application now uses `/tmp` instead of trying to create custom directories under the project folder.

If you encounter this error:
1. Ensure you're using the latest code
2. The fix changes file paths from `process.cwd() + '/tmp'` to `/tmp`
3. Redeploy your application

## Verification

After making these changes:

1. **Redeploy your application** (changes to environment variables don't affect existing deployments)
2. Check the logs for these messages:
   ```
   🌐 Using origin for API call: https://your-app.vercel.app
   📡 Making API call to: https://your-app.vercel.app/api/analyze/video
   ```

## Alternative Client-Side Approach

We've also implemented a client-side approach that uses relative URLs, which should work regardless of environment variables. This is now the default behavior in the updated code.

## Troubleshooting

### If you still get the error:

1. **Check the browser console** for detailed error messages
2. **Verify API routes exist** at `/api/analyze/video` and `/api/analyze/video-file`
3. **Check function timeouts** - video analysis can take several minutes
4. **Verify all required environment variables** for your APIs (OpenAI, Google Cloud, etc.)

### Common issues:

- **Missing API keys**: Ensure `OPENAI_API_KEY`, `SIEVE_API_KEY`, etc. are set
- **Function timeout**: Video analysis is resource-intensive and may hit Vercel's function timeout limits
- **Memory limits**: Large video files may exceed memory limits

## Environment Variables Checklist

Make sure these are configured in your Vercel project:

### Required for video analysis:
- ✅ `OPENAI_API_KEY`
- ✅ `SIEVE_API_KEY`
- ✅ `GOOGLE_CLOUD_PROJECT_ID`
- ✅ `GOOGLE_CLOUD_PRIVATE_KEY`
- ✅ `GOOGLE_CLOUD_CLIENT_EMAIL`
- ✅ `GOOGLE_CLOUD_STORAGE_BUCKET`

### System variables (auto-exposed):
- ✅ `VERCEL_URL`
- ✅ `VERCEL_PROJECT_PRODUCTION_URL`
- ✅ `VERCEL_ENV`

## Testing

After deployment, test the analyze functionality with a simple YouTube URL to verify everything works correctly.

For more help, check the [Vercel Environment Variables documentation](https://vercel.com/docs/environment-variables/system-environment-variables).

## Important Vercel Limitations

### Function Timeouts
- **Hobby Plan**: 10 seconds
- **Pro Plan**: 60 seconds  
- **Enterprise Plan**: 15 minutes

**Impact**: Video analysis can take several minutes, especially for longer videos. Consider:
1. Upgrading to Pro or Enterprise plan
2. Implementing video pre-processing to reduce file sizes
3. Adding progress indicators for users

### Memory Limits
- **Default**: 1024 MB (1 GB)
- **Maximum**: 3008 MB (3 GB) on Pro/Enterprise

**Impact**: Large video files may exceed memory limits. Consider:
1. Setting appropriate memory allocation in `vercel.json`
2. Processing videos in smaller chunks
3. Implementing file size limits

### Example vercel.json Configuration
```json
{
  "functions": {
    "app/api/analyze/video/route.ts": {
      "maxDuration": 300,
      "memory": 3008
    },
    "app/api/analyze/video-file/route.ts": {
      "maxDuration": 300, 
      "memory": 3008
    }
  }
}
``` 