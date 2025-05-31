#!/bin/bash

# Make sure the script is run as root
if [ "$EUID" -ne 0 ]; then
  echo "Please run as root (sudo ./run-standalone.sh)"
  exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Stop existing PM2 processes for this app
echo "Stopping existing cachenova processes..."
sudo pm2 stop cachenova 2>/dev/null
sudo pm2 delete cachenova 2>/dev/null

# Kill any processes on port 80
echo "Checking for processes on port 80..."
PORT_80_PID=$(lsof -t -i:80 2>/dev/null)
if [ ! -z "$PORT_80_PID" ]; then
  echo "Killing process on port 80: PID $PORT_80_PID"
  kill -9 $PORT_80_PID
fi

# Start the cachenova app with PM2
echo "Starting radical-content-analyzer application with PM2..."
sudo pm2 start ecosystem.config.js

# Create and start a simple HTTP proxy for cachenova.in
echo "Creating HTTP proxy for cachenova.in..."
cd ..
cat > cachenova-proxy.js << 'EOL'
const http = require('http');
const httpProxy = require('http-proxy');

// Create a proxy server
const proxy = httpProxy.createProxyServer({
  secure: false,
  changeOrigin: true
});

// Error handling
proxy.on('error', (err, req, res) => {
  console.error('Proxy error:', err);
  if (res && res.writeHead) {
    res.writeHead(500, { 'Content-Type': 'text/plain' });
    res.end('Something went wrong with the proxy.');
  }
});

// Create HTTP server
http.createServer((req, res) => {
  const host = req.headers.host || '';
  const domain = host.split(':')[0];
  
  console.log(`[HTTP] Request for ${domain}, URL: ${req.url}`);
  
  if (domain === 'spotthescam.in') {
    // Redirect to HTTPS for spotthescam.in (which is running its own HTTPS server)
    const redirectUrl = `https://${host}${req.url}`;
    console.log(`[HTTP] Redirecting ${domain} to HTTPS: ${redirectUrl}`);
    res.writeHead(301, { 'Location': redirectUrl });
    res.end();
  } else if (domain === 'cachenova.in') {
    // Proxy to cachenova
    console.log(`[HTTP] Proxying ${domain} to http://localhost:3000`);
    proxy.web(req, res, { target: 'http://localhost:3000' });
  } else {
    // Default fallback
    console.log(`[HTTP] Unknown domain: ${domain}, defaulting to cachenova`);
    proxy.web(req, res, { target: 'http://localhost:3000' });
  }
}).listen(80, () => {
  console.log('HTTP proxy server listening on port 80');
});
EOL

echo "Starting HTTP proxy..."
sudo pm2 start cachenova-proxy.js --name cachenova-proxy

echo "=====================================================================
Cachenova is now running!

The application is available at:
- http://cachenova.in

To stop the application:
- sudo pm2 stop all

To check status:
- sudo pm2 status
==============================================================" 