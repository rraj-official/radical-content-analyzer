const http = require('http');
const { parse } = require('url');
const next = require('next');

const dev = process.env.NODE_ENV !== 'production';
const domainName = 'cachenova.in'; // The domain name for reference
const appPort = parseInt(process.env.PORT || '3000', 10);

// Create the Next.js app
// Removed hostname to allow access from any hostname or IP
const app = next({ dev });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  console.log('Next.js app prepared');
  
  // Main server on specified port (3000 by default)
  const server = http.createServer((req, res) => {
    try {
      const parsedUrl = parse(req.url, true);
      handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Error handling request:', err);
      res.statusCode = 500;
      res.end('Internal Server Error');
    }
  });

  server.listen(appPort, err => {
    if (err) {
      console.error('Failed to start server on port', appPort, err);
      return;
    }
    console.log(`> Server listening on http://localhost:${appPort}`);
    console.log(`> Access via http://${domainName}:${appPort}`);
  });

  // Attempt to start on standard HTTP port 80
  try {
    // Only try to bind to port 80 in production to avoid permission issues during development
    if (process.env.NODE_ENV === 'production') {
      const standardPort = 80;
      const httpServer = http.createServer((req, res) => {
        try {
          const parsedUrl = parse(req.url, true);
          handle(req, res, parsedUrl);
        } catch (err) {
          console.error('Error handling request on port 80:', err);
          res.statusCode = 500;
          res.end('Internal Server Error');
        }
      });

      httpServer.on('error', (err) => {
        console.error(`Could not start server on port ${standardPort}:`, err.message);
        console.log('> Consider using a reverse proxy like Nginx to forward port 80 to your app port');
      });

      httpServer.listen(standardPort, () => {
        console.log(`> HTTP Server also listening on port ${standardPort}`);
        console.log(`> Access via http://${domainName} (no port needed)`);
      });
    } else {
      console.log('> Port 80 server not started in development mode');
      console.log('> For production, consider using a reverse proxy like Nginx');
    }
  } catch (err) {
    console.error('Error setting up port 80 server:', err);
  }
}); 