const http = require('http');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');

const root = __dirname;
const port = process.env.PORT || 4200;

const mimeTypes = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://localhost:${port}`);
  let filePath = path.join(root, decodeURIComponent(url.pathname));

  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    const ext = path.extname(filePath);
    res.writeHead(200, {
      'Content-Type': mimeTypes[ext] || 'application/octet-stream',
    });
    fs.createReadStream(filePath).pipe(res);
    return;
  }

  // SPA fallback — including callback.html
  filePath = path.join(root, 'index.html');

  res.writeHead(200, {
    'Content-Type': 'text/html',
  });

  fs.createReadStream(filePath).pipe(res);
});

server.listen(port, () => {
  console.log(`Serving ${root}`);
  console.log(`http://localhost:${port}`);
});
