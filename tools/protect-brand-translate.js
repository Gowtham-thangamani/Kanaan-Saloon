// One-off: wrap the visible Arabic brand word كنعان in <span translate="no">…</span>
// so browser auto-translation never turns كنعان into "Canaan".
// Skips <title>, <script>, <style> blocks and all tag attributes.
const fs = require('fs');
const cp = require('child_process');

const files = cp.execSync('find ar/ -type f -name "*.html"').toString().trim().split('\n');
const WORD = 'كنعان';
const WRAP = '<span translate="no">' + WORD + '</span>';

let totalFiles = 0, totalWrapped = 0;

for (const f of files) {
  let s = fs.readFileSync(f, 'utf8');

  // 1) Mask <script>/<style>/<title> contents so we never touch them.
  const masks = [];
  s = s.replace(/<(script|style|title)[^>]*>[\s\S]*?<\/\1>/gi, function (m) {
    masks.push(m);
    return '__BRANDMASK_' + (masks.length - 1) + '__';
  });

  // 2) Inside text runs between > and < only (skips attributes), wrap the brand word.
  var wrapped = 0;
  s = s.replace(/>([^<]+)</g, function (full, text) {
    if (text.indexOf(WORD) === -1) return full;
    var parts = text.split(WORD);
    wrapped += parts.length - 1;
    return '>' + parts.join(WRAP) + '<';
  });

  // 3) Restore masked blocks.
  s = s.replace(/__BRANDMASK_(\d+)__/g, function (x, i) { return masks[+i]; });

  if (wrapped) {
    fs.writeFileSync(f, s);
    totalFiles++;
    totalWrapped += wrapped;
    console.log(wrapped, '->', f);
  }
}

console.log('\nFiles changed:', totalFiles, '| brand words wrapped:', totalWrapped);
