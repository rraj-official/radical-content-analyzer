#!/bin/bash
set -e

echo "Starting custom build script for Vercel deployment..."

# Create directories
mkdir -p .vercel/bin
mkdir -p .vercel/tmp

# Install Python dependencies from requirements.txt
pip install -r requirements.txt

# Download and install ffmpeg
echo "Downloading and installing ffmpeg..."
curl -L https://johnvansickle.com/ffmpeg/releases/ffmpeg-release-amd64-static.tar.xz -o ffmpeg.tar.xz
tar -xf ffmpeg.tar.xz
FFMPEG_DIR=$(find . -type d -name "ffmpeg-*-amd64-static" | head -n 1)
cp "$FFMPEG_DIR/ffmpeg" .vercel/bin/
cp "$FFMPEG_DIR/ffprobe" .vercel/bin/
chmod +x .vercel/bin/ffmpeg .vercel/bin/ffprobe
rm -rf ffmpeg.tar.xz "$FFMPEG_DIR"

# Add a symlink for yt-dlp 
echo "Setting up yt-dlp..."
ln -sf $(which yt-dlp) .vercel/bin/yt-dlp
chmod +x .vercel/bin/yt-dlp

# Create directories for video processing
mkdir -p tmp/downloads tmp/audio tmp/chunks

# Create a script that adds bin to PATH for runtime
cat > .vercel/setup-env.sh << 'EOL'
#!/bin/bash
export PATH=$PATH:$(pwd)/.vercel/bin
echo "PATH has been updated to include custom binaries"
EOL
chmod +x .vercel/setup-env.sh

echo "Custom build completed. FFmpeg and yt-dlp are now available."

# Run the next build command
npm run build 