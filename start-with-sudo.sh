#!/bin/bash

# Make sure the script is run as root
if [ "$EUID" -ne 0 ]; then
  echo "Please run as root (sudo ./start-with-sudo.sh)"
  exit 1
fi

# Kill any processes on port 3000
echo "Checking for processes on ports 80 and 443..."
PORT_80_PID=$(lsof -t -i:80 2>/dev/null)
PORT_443_PID=$(lsof -t -i:443 2>/dev/null)

if [ ! -z "$PORT_80_PID" ]; then
  echo "Killing process on port 80: PID $PORT_80_PID"
  kill -9 $PORT_80_PID
fi

if [ ! -z "$PORT_443_PID" ]; then
  echo "Killing process on port 443: PID $PORT_443_PID"
  kill -9 $PORT_443_PID
fi

# Stop any existing PM2 processes
echo "Stopping any existing PM2 processes..."
sudo -u ant-pc pm2 stop all 2>/dev/null
sudo -u ant-pc pm2 delete all 2>/dev/null
sudo pm2 stop all 2>/dev/null
sudo pm2 delete all 2>/dev/null

# Activate the virtual environment
source venv/bin/activate

# Start the application with PM2 as root
echo "Starting CacheNova application with PM2 as root..."
sudo pm2 start ecosystem.config.js

echo "=====================================================================
Setup complete! 🎉

Your Next.js application is now running:
- http://cachenova.in:3000 - The application is running in HTTP mode

To stop the application:
- sudo pm2 stop all

To check status:
- sudo pm2 status
==============================================================" 