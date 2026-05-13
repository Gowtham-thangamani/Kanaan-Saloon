#!/usr/bin/env node
/**
 * For each branch detail page (EN + AR), rewrites the "Services at this house"
 * section's links from /services/<x>.html → /book.html?branch=<this-branch>&service=<x>
 * so clicking a service starts the booking flow with both already chosen.
 * Also updates the section heading + eyebrow to be action-oriented.
 */
const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = path.resolve(__dirname, '..');

const BRANCH_FILES = [
  'branches/al-ain.html',
  'branches/khalifa-city.html',
  'branches/khalidiya.html',
  'branches/baniyas-spa.html',
  'branches/baniyas-barber.html',
  'branches/rabdan.html',
  'branches/old-shahamah.html',
  'branches/new-shahamah.html',
  'branches/muroor.html',
  'branches/vip-muroor.html',
];

function slugFromPath(p) {
  return path.basename(p, '.html');
}

function updateFile(relPath, isAr) {
  const full = path.join(PROJECT_ROOT, relPath);
  if (!fs.existsSync(full)) {
    console.log(`SKIP missing: ${relPath}`);
    return;
  }
  const slug = slugFromPath(relPath);
  let html = fs.readFileSync(full, 'utf8');
  const orig = html;

  // Rewrite each service link in this branch page to start the booking flow
  // pre-filled with branch + service.
  html = html.replace(
    /href="\.\.\/services\/([a-z0-9-]+)\.html"/g,
    (m, serviceSlug) => `href="../book.html?branch=${slug}&service=${serviceSlug}"`
  );

  // Update the section eyebrow + heading to be action-oriented (English version).
  if (!isAr) {
    html = html.replace(
      /<span class="eyebrow"([^>]*)>Available Here<\/span>\s*<h2([^>]*)>Services at this house\.<\/h2>/,
      '<span class="eyebrow"$1>Book a service</span>\n        <h2$2>Pick your treatment.</h2>\n        <p class="section-head__lede">Tap any service below to start booking at this house.</p>'
    );
  } else {
    // Arabic equivalents
    html = html.replace(
      /<span class="eyebrow"([^>]*)>متوفّر هنا<\/span>\s*<h2([^>]*)>الخدمات في هذا البيت\.<\/h2>/,
      '<span class="eyebrow"$1>احجز خدمة</span>\n        <h2$2>اختر علاجك.</h2>\n        <p class="section-head__lede">اضغط على أي خدمة لبدء الحجز في هذا البيت.</p>'
    );
  }

  if (html === orig) {
    console.log(`  no change: ${relPath}`);
    return false;
  }
  fs.writeFileSync(full, html, 'utf8');
  console.log(`  UPDATED: ${relPath}`);
  return true;
}

let updated = 0;
console.log('=== English branch pages ===');
for (const rel of BRANCH_FILES) {
  if (updateFile(rel, false)) updated++;
}
console.log('\n=== Arabic branch pages ===');
for (const rel of BRANCH_FILES) {
  if (updateFile('ar/' + rel, true)) updated++;
}
console.log(`\nTotal updated: ${updated} files`);
