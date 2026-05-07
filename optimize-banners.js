// Re-encode all banners at tighter compression so they arrive faster.
// Targets: <120 KB for 1600w, <60 KB for 1000w, <30 KB for 600w.
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const SRC = path.join(__dirname, 'assets', 'img', 'photos');
const files = fs.readdirSync(SRC).filter(f => /\.png$/i.test(f));

(async () => {
  let saved = 0, total = 0;
  for (const f of files) {
    const base = f.replace(/\.png$/i, '');
    const src = path.join(SRC, f);
    const sizes = [
      { w: 1600, q: 65, name: base + '-1600.webp' },
      { w: 1000, q: 62, name: base + '-1000.webp' },
      { w: 600,  q: 60, name: base + '-600.webp' }
    ];
    for (const s of sizes) {
      const out = path.join(SRC, s.name);
      const before = fs.existsSync(out) ? fs.statSync(out).size : 0;
      await sharp(src)
        .resize({ width: s.w, withoutEnlargement: true })
        .webp({ quality: s.q, effort: 6 })
        .toFile(out);
      const after = fs.statSync(out).size;
      total += after;
      saved += (before - after);
      console.log(s.name.padEnd(50), Math.round(after/1024) + ' KB', before ? '(was ' + Math.round(before/1024) + ')' : '');
    }
  }
  console.log('\nTotal photos size:', Math.round(total/1024) + ' KB');
  console.log('Saved:', Math.round(saved/1024) + ' KB');
})();
