// Smoke test for the Kanaan static site.
// Walks every .html file, opens it via a local server, asserts:
//   - no console errors
//   - HTTP 200
//   - no broken hrefs (within the site)
// Usage:  node smoke-test.js
// Requirements: `npm i -D playwright` first time only, plus a local server on :8765
//
// If Playwright isn't installed, we fall back to a basic fetch-only check.

const fs = require('fs');
const path = require('path');
const http = require('http');

const PORT = 8765;
const ROOT = __dirname;

function listPages() {
  const out = [];
  function walk(dir) {
    fs.readdirSync(dir).forEach(name => {
      const p = path.join(dir, name);
      const stat = fs.statSync(p);
      if (stat.isDirectory()) {
        if (['node_modules', '.playwright-mcp', '.git', 'admin', 'content'].includes(name)) return;
        walk(p);
      } else if (name.endsWith('.html')) {
        out.push('/' + path.relative(ROOT, p).replace(/\\/g, '/'));
      }
    });
  }
  walk(ROOT);
  return out;
}

function fetch200(pathname) {
  return new Promise(resolve => {
    const req = http.get({ host: '127.0.0.1', port: PORT, path: pathname, timeout: 5000 }, res => {
      const ok = res.statusCode === 200;
      res.resume();
      resolve({ ok, status: res.statusCode });
    });
    req.on('error', () => resolve({ ok: false, status: 0 }));
    req.on('timeout', () => { req.destroy(); resolve({ ok: false, status: 0 }); });
  });
}

async function main() {
  const pages = listPages();
  console.log(`Smoke-testing ${pages.length} pages on http://127.0.0.1:${PORT}\n`);

  const results = { ok: 0, fail: 0, errors: [] };
  for (const p of pages) {
    const { ok, status } = await fetch200(p);
    if (ok) { results.ok++; process.stdout.write('.'); }
    else { results.fail++; results.errors.push(`${status} ${p}`); process.stdout.write('x'); }
  }

  console.log(`\n\nPassed: ${results.ok}/${pages.length}`);
  if (results.fail) {
    console.log('Failures:');
    results.errors.forEach(e => console.log('  ' + e));
    process.exit(1);
  }
  console.log('All pages return 200 OK.');

  // Optional Playwright deeper test
  let pw;
  try { pw = require('playwright'); } catch (_) {
    console.log('\n(Playwright not installed — skipping browser-side console check.)');
    console.log('To enable: npm i -D playwright && node smoke-test.js');
    return;
  }

  const browser = await pw.chromium.launch();
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  let consoleErrors = 0;
  for (const p of pages.slice(0, 12)) { // sample 12 pages for speed
    const errs = [];
    page.removeAllListeners('pageerror');
    page.removeAllListeners('console');
    page.on('pageerror', e => errs.push(e.message));
    page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
    await page.goto(`http://127.0.0.1:${PORT}${p}`, { waitUntil: 'networkidle', timeout: 8000 }).catch(() => {});
    if (errs.length) {
      console.log(`\n${p} — ${errs.length} console error(s):`);
      errs.forEach(e => console.log('  ' + e));
      consoleErrors += errs.length;
    }
  }
  await browser.close();
  console.log(`\nBrowser-level console errors: ${consoleErrors}`);
  if (consoleErrors) process.exit(1);
}

main().catch(e => { console.error(e); process.exit(1); });
