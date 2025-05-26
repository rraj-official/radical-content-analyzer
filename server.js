const http   = require('http');
const { parse } = require('url');
const next   = require('next');

const dev     = process.env.NODE_ENV !== 'production';
const appPort = parseInt(process.env.PORT, 10) || 3000;
const app     = next({ dev });
const handle  = app.getRequestHandler();

app.prepare().then(() => {
  http.createServer((req, res) => {
    const parsedUrl = parse(req.url, true);
    handle(req, res, parsedUrl);
  }).listen(appPort, err => {
    if (err) {
      console.error('Failed to start cachenova on', appPort, err);
      return;
    }
    console.log(`> cachenova listening on http://localhost:${appPort}`);
  });
});
