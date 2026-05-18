// Adds (or standardizes) the .footer-socials block in every site HTML page.
// Skips admin/, node_modules/, .git/, and pages already wired with social.facebook.
//
// Run:  node tools/add-social-footer.js            # apply
//       node tools/add-social-footer.js --dry-run  # preview only

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const DRY = process.argv.includes('--dry-run');
const SKIP_DIRS = new Set(['admin', 'node_modules', '.git', 'tools', 'content', 'assets', 'src']);

function relPath(p) {
  return path.relative(ROOT, p).split(path.sep).join('/');
}

function depthOf(relativeFile) {
  // Number of directory levels above the file from project root.
  // e.g. "index.html" -> 0, "branches/al-ain.html" -> 1, "ar/branches/al-ain.html" -> 2.
  const parts = relativeFile.split('/');
  return parts.length - 1;
}

function socialsBlock(depth) {
  const prefix = depth === 0 ? '' : '../'.repeat(depth);
  const I = `${prefix}assets/img/icons.svg`;
  return `      <div class="footer-socials" aria-label="Social">
        <a href="#" data-bind-attr-href="social.instagram" aria-label="Instagram" target="_blank" rel="noopener"><svg class="icon"><use href="${I}#i-instagram"/></svg></a>
        <a href="#" data-bind-attr-href="social.tiktok" aria-label="TikTok" target="_blank" rel="noopener"><svg class="icon"><use href="${I}#i-tiktok"/></svg></a>
        <a href="#" data-bind-attr-href="social.snapchat" aria-label="Snapchat" target="_blank" rel="noopener"><svg class="icon"><use href="${I}#i-snapchat"/></svg></a>
        <a href="#" data-bind-attr-href="social.facebook" aria-label="Facebook" target="_blank" rel="noopener"><svg class="icon"><use href="${I}#i-facebook"/></svg></a>
        <a href="#" data-bind-attr-href="contact.wa_url" aria-label="WhatsApp" target="_blank" rel="noopener"><svg class="icon"><use href="${I}#i-whatsapp"/></svg></a>
      </div>`;
}

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP_DIRS.has(entry.name) || entry.name.startsWith('.')) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (entry.name.endsWith('.html')) out.push(full);
  }
  return out;
}

const files = walk(ROOT);
let updated = 0;
let skippedAlreadyDone = 0;
let skippedNoFooter = 0;

for (const file of files) {
  const rel = relPath(file);
  let src = fs.readFileSync(file, 'utf8');

  // Already wired with Facebook? Leave it alone.
  if (src.includes('social.facebook') && src.includes('i-facebook')) {
    skippedAlreadyDone++;
    continue;
  }

  const depth = depthOf(rel);
  const block = socialsBlock(depth);
  let next = src;

  if (src.includes('class="footer-socials"')) {
    // Pre-existing footer-socials block missing Facebook. Replace whole block.
    // Match from `<div class="footer-socials"` through its closing `</div>` (non-greedy).
    next = next.replace(
      /[ \t]*<div class="footer-socials"[\s\S]*?<\/div>/,
      block
    );
  } else if (src.includes('class="footer-newsletter"')) {
    // Inject before footer-newsletter. Collapse the trailing whitespace-only line that some
    // pages leave between <div class="container"> and the newsletter block.
    next = next.replace(
      /(    <div class="container">\r?\n)([ \t]*\r?\n)?(\s*)(<div class="footer-newsletter")/,
      `$1${block}\n\n$3$4`
    );
  } else if (src.includes('class="footer-bottom"')) {
    // No newsletter — inject before the footer-bottom block.
    next = next.replace(
      /(    <div class="container">\r?\n)([ \t]*\r?\n)?(\s*)(<div class="footer-bottom")/,
      `$1${block}\n\n$3$4`
    );
  } else {
    // No recognized footer structure (e.g. landing pages with bare footer or admin pages).
    skippedNoFooter++;
    continue;
  }

  if (next !== src) {
    if (!DRY) fs.writeFileSync(file, next, 'utf8');
    console.log(`${DRY ? '[dry] ' : ''}updated: ${rel}  (depth=${depth})`);
    updated++;
  } else {
    skippedNoFooter++;
    console.log(`no-op: ${rel}`);
  }
}

console.log(`\n${DRY ? 'Would update' : 'Updated'}: ${updated}`);
console.log(`Already wired with Facebook: ${skippedAlreadyDone}`);
console.log(`Skipped (no recognized footer): ${skippedNoFooter}`);
