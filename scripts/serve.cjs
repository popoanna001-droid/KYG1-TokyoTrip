const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..', process.argv[2] || '.');
const port = Number(process.env.PORT || 5173);
http.createServer((req,res) => {
  let file;
  try { file = path.resolve(root, '.' + decodeURIComponent(new URL(req.url, 'http://localhost').pathname)); } catch { res.writeHead(400); return res.end(); }
  if (file !== root && !file.startsWith(root + path.sep)) { res.writeHead(403); return res.end(); }
  if (file === root || fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
  fs.readFile(file, (err, body) => {
    if (err) {res.writeHead(404);return res.end('Not found');}
    res.setHeader('Content-Type', ({'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.png':'image/png','.webp':'image/webp','.jpg':'image/jpeg','.gif':'image/gif','.svg':'image/svg+xml'})[path.extname(file)] || 'application/octet-stream');
    res.end(body);
  });
}).listen(port, '127.0.0.1', () => console.log('Preview: http://localhost:' + port));
