#!/usr/bin/env bash
set -euo pipefail

echo "⚙️  Starting custom build script for Vercel..."

# 1. Ensure we have a python + pip
if command -v python3 &>/dev/null; then
  PYTHON=python3
elif command -v python &>/dev/null; then
  PYTHON=python
else
  echo "❌ Python is not installed in this environment." >&2
  exit 1
fi

# Make sure pip3 exists
if ! command -v pip3 &>/dev/null; then
  echo "ℹ️  Installing pip via ensurepip..."
  $PYTHON -m ensurepip --upgrade
fi
PIP=pip3

# 2. Prepare directories
mkdir -p .vercel/bin .vercel/tmp tmp/downloads tmp/audio tmp/chunks

# 3. Install Python deps
echo "🐍 Installing Python dependencies..."
$PYTHON -m pip install --upgrade pip
$PIP install -r requirements.txt

# 4. Install yt-dlp if missing
if ! command -v yt-dlp &>/dev/null; then
  echo "🕵️ Installing yt-dlp..."
  $PIP install yt-dlp
fi

# 5. Download & unpack FFmpeg
echo "📥 Downloading FFmpeg..."
curl -L https://johnvansickle.com/ffmpeg/releases/ffmpeg-release-amd64-static.tar.xz -o ffmpeg.tar.xz
tar -xf ffmpeg.tar.xz
FFMPEG_DIR=$(find . -maxdepth 1 -type d -name "ffmpeg-*-amd64-static" | head -n1)

echo "🚚 Copying FFmpeg binaries into .vercel/bin..."
cp "$FFMPEG_DIR/ffmpeg" .vercel/bin/
cp "$FFMPEG_DIR/ffprobe" .vercel/bin/
chmod +x .vercel/bin/{ffmpeg,ffprobe}

rm -rf ffmpeg.tar.xz "$FFMPEG_DIR"

# 6. Symlink yt-dlp into our bin folder
echo "🔗 Linking yt-dlp into .vercel/bin..."
ln -sf "$(command -v yt-dlp)" .vercel/bin/yt-dlp
chmod +x .vercel/bin/yt-dlp

# 7. (Optional) helper to update PATH at runtime—won’t be auto-sourced!
cat > .vercel/setup-env.sh << 'EOL'
#!/usr/bin/env bash
export PATH="$(pwd)/.vercel/bin:$PATH"
echo "🔧 PATH updated to include .vercel/bin"
EOL
chmod +x .vercel/setup-env.sh

echo "✅ Custom build steps complete. Now running Next.js build…"
npm run build
