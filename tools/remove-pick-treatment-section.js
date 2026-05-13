#!/usr/bin/env node
/**
 * Removes the "Pick your treatment." multi-select category picker section
 * from each branch page. The Menu & pricing section below becomes the new
 * way to pick services.
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

function removeSection(relPath, isAr) {
  const full = path.join(PROJECT_ROOT, relPath);
  if (!fs.existsSync(full)) return false;
  let html = fs.readFileSync(full, 'utf8');
  const orig = html;

  // The picker section is identified by the form having data-branch-service-picker.
  // We remove from <section class="section section--light"> wrapping it down to
  // its closing </section>.
  const pattern = /\s*<section class="section section--light">\s*<div class="container">\s*<div class="section-head section-head--left"[^>]*>[\s\S]*?<form data-branch-service-picker=[\s\S]*?<\/form>\s*(?:<div class="branch-social">[\s\S]*?<\/div>)?\s*<\/div>\s*<\/section>/;

  html = html.replace(pattern, '');

  if (html === orig) return false;
  fs.writeFileSync(full, html, 'utf8');
  return true;
}

let updated = 0;
for (const rel of BRANCH_FILES) {
  if (removeSection(rel, false)) { console.log('  UPDATED: ' + rel); updated++; }
  else console.log('  no change: ' + rel);
}
for (const rel of BRANCH_FILES) {
  const arRel = 'ar/' + rel;
  if (removeSection(arRel, true)) { console.log('  UPDATED: ' + arRel); updated++; }
  else console.log('  no change: ' + arRel);
}
console.log('\nTotal: ' + updated + ' files');
