#!/usr/bin/env node
/**
 * Minimal local dev server that emulates the Apache rewrite rules in .htaccess:
 *   1. /foo/index.html  ->  301 to /foo/
 *   2. /foo.html        ->  301 to /foo
 *   3. /foo             ->  serves /foo.html when the file exists
 *   4. /folder/         ->  serves /folder/index.html OR /folder.html
 *
 * Why: VS Code Live Server has no rewrite engine, so links like href="book"
 * fail with "Cannot GET /book". Run this instead:
 *
 *     node tools/dev-server.js
 *
 * Then open http://localhost:5500/  (port matches Live Server for muscle memory).
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const ROOT = path.resolve(__dirname, '..');
const PORT = process.env.PORT || 5501;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css':  'text/css; charset=utf-8',
  '.js':   'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg':  'image/svg+xml',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico':  'image/x-icon',
  '.woff': 'font/woff',
  '.woff2':'font/woff2',
  '.ttf':  'font/ttf',
  '.txt':  'text/plain; charset=utf-8',
  '.xml':  'application/xml; charset=utf-8',
  '.pdf':  'application/pdf'
};

function send(res, status, body, headers = {}) {
  res.writeHead(status, { 'Cache-Control': 'no-cache', ...headers });
  res.end(body);
}

function serveFile(res, filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const type = MIME[ext] || 'application/octet-stream';
  fs.readFile(filePath, (err, data) => {
    if (err) return send(res, 500, 'Server error');
    send(res, 200, data, { 'Content-Type': type });
  });
}

const server = http.createServer((req, res) => {
  const parsed = url.parse(req.url);
  let pathname = decodeURIComponent(parsed.pathname);

  // Request log — shows what the browser is actually asking for, so post-submit
  // redirects are visible in the terminal.
  const _end = res.end.bind(res);
  res.end = function (...args) {
    const loc = res.getHeader('Location');
    console.log(req.method, req.url, '→', res.statusCode, loc ? '(' + loc + ')' : '');
    return _end(...args);
  };

  // Block traversal
  if (pathname.includes('..')) return send(res, 403, 'Forbidden');

  // .htaccess rule 1+2: redirect /foo.html  ->  /foo  (and /foo/index.html -> /foo/)
  if (/\.html(?:\?|$)/i.test(req.url)) {
    let dest = req.url.replace(/\/index\.html(?=\?|$)/i, '/');
    dest = dest.replace(/\.html(?=\?|$)/i, '');
    return send(res, 301, '', { Location: dest });
  }

  const fsPath = path.join(ROOT, pathname);

  // Directory request
  if (pathname.endsWith('/')) {
    // Try /foo/index.html, then fall back to /foo.html
    const idx = path.join(fsPath, 'index.html');
    if (fs.existsSync(idx)) return serveFile(res, idx);
    const sibling = fsPath.replace(/[\\/]+$/, '') + '.html';
    if (fs.existsSync(sibling)) return serveFile(res, sibling);
    return send(res, 404, 'Not found: ' + pathname);
  }

  // Direct file hit (CSS, JS, images, etc.)
  if (fs.existsSync(fsPath) && fs.statSync(fsPath).isFile()) {
    return serveFile(res, fsPath);
  }

  // .htaccess rule 3: clean URL -> .html
  const htmlPath = fsPath + '.html';
  if (fs.existsSync(htmlPath)) return serveFile(res, htmlPath);

  // .htaccess rule 5: blog catch-all -> /blog/_post.html
  // Any /blog/<slug> or /ar/blog/<slug> with no matching .html file gets the
  // generic blog template, which fills itself in from blog.json.
  const blogSlugMatch = pathname.match(/^\/(?:ar\/)?blog\/([a-z0-9][a-z0-9-]*)\/?$/);
  if (blogSlugMatch) {
    const tpl = path.join(ROOT, 'blog', '_post.html');
    if (fs.existsSync(tpl)) return serveFile(res, tpl);
  }

  // Folder without trailing slash -> redirect to add it
  if (fs.existsSync(fsPath) && fs.statSync(fsPath).isDirectory()) {
    return send(res, 301, '', { Location: pathname + '/' + (parsed.search || '') });
  }

  // Pretty 404
  const fourOhFour = path.join(ROOT, '404.html');
  if (fs.existsSync(fourOhFour)) {
    fs.readFile(fourOhFour, (e, d) => {
      res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(d || 'Not found');
    });
    return;
  }
  send(res, 404, 'Not found');
});

server.listen(PORT, () => {
  console.log('Kanaan dev server  →  http://localhost:' + PORT + '/');
  console.log('Mimics .htaccess clean-URL rewrites. Ctrl+C to stop.');
});
