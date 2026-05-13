#!/usr/bin/env node
/**
 * Updates each branch HTML (EN + AR) to use the new branch-specific photos
 * from the manifest. Targets: OG meta, JSON-LD image array, page-hero,
 * split section, gallery grid. Pads gallery with photo #1 when branch has
 * fewer than 6 photos.
 */
const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const MANIFEST = JSON.parse(fs.readFileSync(path.join(__dirname, 'branches-photo-manifest.json'), 'utf8'));

function updateFile(filePath, photos) {
  if (!fs.existsSync(filePath)) {
    console.log(`SKIP missing: ${path.relative(PROJECT_ROOT, filePath)}`);
    return false;
  }
  let html = fs.readFileSync(filePath, 'utf8');
  const orig = html;

  const heroPath = photos[0].hero;
  const heroThumb = photos[0].thumb;
  // For gallery, pad to 6 by repeating from the start if needed
  const galleryPhotos = [];
  for (let i = 0; i < 6; i++) {
    galleryPhotos.push(photos[i % photos.length]);
  }

  // 1. OG image
  html = html.replace(
    /(<meta property="og:image" content=")[^"]+(" \/>)/,
    `$1${heroPath}$2`
  );

  // 2. Twitter image (if present)
  html = html.replace(
    /(<meta (?:property|name)="twitter:image" content=")[^"]+(" \/>)/,
    `$1${heroPath}$2`
  );

  // 3. JSON-LD "image": [...]
  const jsonLdImages = galleryPhotos.map(p => `"${p.thumb}"`).join(',');
  html = html.replace(
    /("image":\s*\[)[^\]]+(\])/,
    `$1${jsonLdImages}$2`
  );

  // 4. Page hero image
  html = html.replace(
    /(<div class="page-hero__media"[^>]*><img src=")[^"]+(")/,
    `$1${heroPath}$2`
  );

  // 5. Split section image — replace any number of occurrences (some pages have 2)
  html = html.replace(
    /(<div class="split__media"[^>]*><img src=")[^"]+(")/g,
    `$1${heroPath}$2`
  );

  // 6. Gallery grid: replace the 6 lightbox <a><img></a> pairs in order
  let galleryIdx = 0;
  html = html.replace(
    /(<a href=")(\/assets\/img\/photos\/[^"]+)(" data-lightbox-trigger><img src=")(\/assets\/img\/photos\/[^"]+)(")/g,
    (match, p1, _oldHref, p3, _oldSrc, p5) => {
      if (galleryIdx >= 6) return match; // safety
      const photo = galleryPhotos[galleryIdx];
      galleryIdx++;
      return `${p1}${photo.hero}${p3}${photo.thumb}${p5}`;
    }
  );

  if (html === orig) {
    console.log(`  NO CHANGES: ${path.relative(PROJECT_ROOT, filePath)}`);
    return false;
  }
  fs.writeFileSync(filePath, html, 'utf8');
  console.log(`  UPDATED: ${path.relative(PROJECT_ROOT, filePath)} (gallery replacements: ${galleryIdx})`);
  return true;
}

let updated = 0;
let skipped = 0;
for (const [slug, photos] of Object.entries(MANIFEST)) {
  console.log(`\n=== ${slug} (${photos.length} photos) ===`);
  const enPath = path.join(PROJECT_ROOT, 'branches', `${slug}.html`);
  const arPath = path.join(PROJECT_ROOT, 'ar', 'branches', `${slug}.html`);
  if (updateFile(enPath, photos)) updated++; else skipped++;
  if (updateFile(arPath, photos)) updated++; else skipped++;
}

console.log(`\n\nTotal: ${updated} updated, ${skipped} skipped/unchanged`);
