#!/bin/bash

# Install script for required system dependencies for video processing

echo "Installing system dependencies for video processing..."

# Check if running as root
if [ "$EUID" -ne 0 ]; then
  echo "Please run this script as root or with sudo"
  exit 1
fi

# Detect OS
if [ -f /etc/os-release ]; then
  . /etc/os-release
  OS=$NAME
elif type lsb_release >/dev/null 2>&1; then
  OS=$(lsb_release -si)
else
  OS=$(uname -s)
fi

echo "Detected OS: $OS"

# Install FFmpeg and yt-dlp based on OS
case "$OS" in
  *Ubuntu* | *Debian*)
    apt-get update
    apt-get install -y ffmpeg python3-pip
    pip3 install yt-dlp
    ;;
  *CentOS* | *RHEL* | *Fedora*)
    dnf install -y epel-release
    dnf install -y ffmpeg python3-pip
    pip3 install yt-dlp
    ;;
  *openSUSE*)
    zypper refresh
    zypper install -y ffmpeg python3-pip
    pip3 install yt-dlp
    ;;
  *Arch*)
    pacman -Sy
    pacman -S --noconfirm ffmpeg python-pip
    pip install yt-dlp
    ;;
  *Darwin* | *macOS*)
    # For macOS, use Homebrew
    if ! command -v brew &> /dev/null; then
      echo "Homebrew not found. Please install Homebrew first."
      echo "Run: /bin/bash -c \"$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)\""
      exit 1
    fi
    brew update
    brew install ffmpeg yt-dlp
    ;;
  *Windows*)
    echo "Windows detected. Please install FFmpeg and yt-dlp manually:"
    echo "1. Install FFmpeg from https://ffmpeg.org/download.html"
    echo "2. Install Python from https://www.python.org/downloads/"
    echo "3. Install yt-dlp with: pip install yt-dlp"
    ;;
  *)
    echo "Unsupported OS. Please install FFmpeg and yt-dlp manually."
    exit 1
    ;;
esac

echo "Creating necessary directories..."
mkdir -p tmp/downloads tmp/audio tmp/chunks

echo "Installation completed. Please ensure FFmpeg and yt-dlp are in your PATH."
echo "You can test with:"
echo "  ffmpeg -version"
echo "  yt-dlp --version"

exit 0 