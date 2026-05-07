// Self-host Google Fonts: Cormorant Garamond, Inter, Tajawal.
// Fetches latin (+ arabic for Tajawal) subsets only, writes local woff2,
// rewrites @font-face CSS to local paths, and saves as assets/css/fonts.css.
const fs = require('fs');
const path = require('path');
const https = require('https');

const FONTS_DIR = path.join(__dirname, 'assets', 'fonts');
const CSS_OUT = path.join(__dirname, 'assets', 'css', 'fonts.css');
if (!fs.existsSync(FONTS_DIR)) fs.mkdirSync(FONTS_DIR, { recursive: true });

const GFONTS_URL = 'https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600&family=Inter:wght@400;500;600&family=Tajawal:wght@400;500;700&display=swap';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

function get(url, asBuffer) {
  return new Promise(function (resolve, reject) {
    https.get(url, { headers: { 'User-Agent': UA } }, function (res) {
      var chunks = [];
      res.on('data', function (c) { chunks.push(c); });
      res.on('end', function () {
        var buf = Buffer.concat(chunks);
        resolve(asBuffer ? buf : buf.toString('utf8'));
      });
    }).on('error', reject);
  });
}

(async function main() {
  console.log('1. fetching Google Fonts CSS…');
  var css = await get(GFONTS_URL);

  // Split into @font-face blocks, keep only "latin" (and "arabic" for Tajawal).
  // Each block is preceded by a comment like /* latin */ or /* arabic */.
  var blocks = css.split(/\/\*\s*([a-z-]+)\s*\*\//).slice(1);
  // After split: [subset, block, subset, block, ...]
  var keep = [];
  for (var i = 0; i < blocks.length; i += 2) {
    var subset = blocks[i];
    var block = blocks[i + 1];
    var familyMatch = block.match(/font-family:\s*'([^']+)'/);
    var family = familyMatch ? familyMatch[1] : '';
    var keepIt = subset === 'latin' || (subset === 'arabic' && family === 'Tajawal');
    if (keepIt) keep.push({ subset: subset, block: block, family: family });
  }
  console.log('2. keeping', keep.length, 'font-faces (latin + Tajawal arabic)');

  // For each kept block, extract woff2 URL, download, rewrite to local path
  var localCss = '/* Kanaan — self-hosted fonts. Latin (+ Arabic for Tajawal). */\n\n';
  for (var k = 0; k < keep.length; k++) {
    var entry = keep[k];
    var urlMatch = entry.block.match(/url\((https:\/\/fonts\.gstatic\.com\/[^)]+\.woff2)\)/);
    if (!urlMatch) continue;
    var remote = urlMatch[1];
    var fname = entry.family.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + entry.subset + '-' + (entry.block.match(/font-weight:\s*(\d+)/) || [, '400'])[1] + '.woff2';
    var localPath = path.join(FONTS_DIR, fname);
    if (!fs.existsSync(localPath)) {
      console.log('   download', fname);
      var buf = await get(remote, true);
      fs.writeFileSync(localPath, buf);
    }
    localCss += '/* ' + entry.family + ' ' + entry.subset + ' */\n';
    localCss += entry.block.replace(/url\(https:\/\/[^)]+\.woff2\)/, 'url(../fonts/' + fname + ')').trim() + '\n\n';
  }

  fs.writeFileSync(CSS_OUT, localCss);
  console.log('3. wrote', path.relative(__dirname, CSS_OUT), '(' + (localCss.length / 1024).toFixed(1) + 'KB)');
  var totalBytes = fs.readdirSync(FONTS_DIR).reduce(function (n, f) { return n + fs.statSync(path.join(FONTS_DIR, f)).size; }, 0);
  console.log('   total fonts:', (totalBytes / 1024).toFixed(1) + 'KB on disk');
})();
