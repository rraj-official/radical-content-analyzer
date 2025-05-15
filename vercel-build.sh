#!/usr/bin/env bash
set -euo pipefail

echo "⚙️  Starting custom build script for Vercel..."

# 0. Make sure our Python scripts folder is on PATH
export PATH="/python312/bin:$PATH"

# 1. Find a Python interpreter and pip
if command -v python3 &>/dev/null; then
  PY=python3
elif command -v python &>/dev/null; then
  PY=python
else
  echo "❌ No python interpreter found!" >&2
  exit 1
fi

# Ensure pip3 exists
if ! command -v pip3 &>/dev/null; then
  echo "ℹ️  Bootstrapping pip..."
  $PY -m ensurepip --upgrade
fi
PIP=pip3

# 2. Prepare directories
mkdir -p .vercel/bin .vercel/tmp tmp/{downloads,audio,chunks}

# 3. Install Python deps (but drop any pinned yt-dlp version)
echo "🐍 Installing Python dependencies (without pinned yt-dlp)..."
grep -v -E '^yt-dlp(==|>=|<=)' requirements.txt > .vercel/tmp/req-no-yt-dlp.txt
$PY -m pip install --upgrade pip
$PIP install -r .vercel/tmp/req-no-yt-dlp.txt

# 4. Install latest yt-dlp (no broken pin)
echo "🕵️ Installing latest yt-dlp..."
$PIP install yt-dlp

# 5. Download & unpack FFmpeg
echo "📥 Downloading FFmpeg..."
curl -sL https://johnvansickle.com/ffmpeg/releases/ffmpeg-release-amd64-static.tar.xz \
  -o .vercel/tmp/ffmpeg.tar.xz

tar -C .vercel/tmp -xf .vercel/tmp/ffmpeg.tar.xz
FFMPEG_DIR=$(find .vercel/tmp -maxdepth 1 -type d -name "ffmpeg-*-amd64-static" | head -n1)

echo "🚚 Copying FFmpeg binaries into .vercel/bin..."
cp "$FFMPEG_DIR/ffmpeg" .vercel/bin/
cp "$FFMPEG_DIR/ffprobe" .vercel/bin/
chmod +x .vercel/bin/ffmpeg .vercel/bin/ffprobe

# 6. Symlink yt-dlp into .vercel/bin
echo "🔗 Linking yt-dlp into .vercel/bin..."
ln -sf "$(command -v yt-dlp)" .vercel/bin/yt-dlp
chmod +x .vercel/bin/yt-dlp

# 7. (Optional) Runtime‐helper to source .vercel/bin – see notes below
cat > .vercel/setup-env.sh << 'EOL'
#!/usr/bin/env bash
export PATH="$(pwd)/.vercel/bin:$PATH"
EOL
chmod +x .vercel/setup-env.sh

echo "✅ Custom build steps complete. Now running Next.js build…"
npm run build
