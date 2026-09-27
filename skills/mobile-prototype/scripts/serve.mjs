#!/usr/bin/env node
// Zero-dependency static server for the prototype. Prints a local URL (for Playwright MCP) and a
// LAN URL (to open the prototype on a real phone on the same Wi-Fi).
//
//   node serve.mjs [--dir prototype] [--port 4173] [--host 0.0.0.0]
//
// If the port is busy it tries the next ones. Files are served with no-cache headers so every
// reload shows the latest edit.

import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const args = process.argv.slice(2);
const opt = (name, def) => { const i = args.indexOf(`--${name}`); return i >= 0 ? args[i + 1] : def; };
const dir = path.resolve(opt('dir', 'prototype'));
let port = Number(opt('port', 4173));
const host = opt('host', '0.0.0.0');

if (!fs.existsSync(path.join(dir, 'index.html'))) {
  console.error(`No index.html in ${dir}. Run scaffold.mjs first, or pass --dir.`);
  process.exit(1);
}

const TYPES = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.gif': 'image/gif',
  '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.woff': 'font/woff', '.md': 'text/markdown; charset=utf-8',
};

const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');
  let file = path.normalize(path.join(dir, decodeURIComponent(url.pathname)));
  if (!file.startsWith(dir)) { res.writeHead(403).end('Forbidden'); return; }
  if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404, { 'content-type': 'text/plain' }).end(`Not found: ${url.pathname}`); return; }
    res.writeHead(200, { 'content-type': TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream', 'cache-control': 'no-store' });
    res.end(data);
  });
});

server.on('error', (e) => {
  if (e.code === 'EADDRINUSE' && port < Number(opt('port', 4173)) + 20) { port += 1; server.listen(port, host); }
  else { console.error(e.message); process.exit(1); }
});

server.listen(port, host, () => {
  const lan = Object.values(os.networkInterfaces()).flat().find((i) => i && i.family === 'IPv4' && !i.internal)?.address;
  console.log(`Serving ${path.relative(process.cwd(), dir) || '.'}`);
  console.log(`  Local:  http://localhost:${port}/`);
  if (lan && host === '0.0.0.0') console.log(`  Phone:  http://${lan}:${port}/   (same Wi-Fi network)`);
  console.log(`  Storyboard: http://localhost:${port}/storyboard.html`);
});
