#!/usr/bin/env node
/**
 * Converts the single-service link row on each branch page into a multi-select
 * checkbox grid + "Book Selected" button. Picker logic lives in main.js.
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

const SERVICE_META = {
  en: {
    'hair-beard':        { title: 'Hair & Beard',         meta: 'Cut, shave, sculpt · ~45 min' },
    'facial-skin-care':  { title: 'Facial & Skin',        meta: 'Purify, hydrate · ~45 min' },
    'massage':           { title: 'Massage',              meta: '30 / 60 / 90 min' },
    'moroccan-bath':     { title: 'Moroccan Bath',        meta: 'Hammam ritual · ~60 min' },
    'manicure-pedicure': { title: 'Manicure & Pedicure',  meta: 'Hand & foot care · ~60 min' },
    'hair-treatment':    { title: 'Hair Treatment',       meta: 'Protein / keratin · ~75 min' },
    'grooming-packages': { title: 'Grooming Packages',    meta: 'Curated multi-service ritual' },
  },
  ar: {
    'hair-beard':        { title: 'الشعر واللحية',         meta: 'قصّ، حلاقة، نحت · ~٤٥ دقيقة' },
    'facial-skin-care':  { title: 'العناية بالبشرة',       meta: 'تنقية وترطيب · ~٤٥ دقيقة' },
    'massage':           { title: 'المساج',                meta: '٣٠ / ٦٠ / ٩٠ دقيقة' },
    'moroccan-bath':     { title: 'الحمّام المغربي',       meta: 'طقس حمّام · ~٦٠ دقيقة' },
    'manicure-pedicure': { title: 'العناية بالأظافر',      meta: 'يدين وقدمين · ~٦٠ دقيقة' },
    'hair-treatment':    { title: 'علاجات الشعر',          meta: 'بروتين / كيراتين · ~٧٥ دقيقة' },
    'grooming-packages': { title: 'باقات العناية',         meta: 'باقات مجمّعة' },
  },
};

function escapeHtml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function updateFile(relPath, isAr) {
  const full = path.join(PROJECT_ROOT, relPath);
  if (!fs.existsSync(full)) return false;
  const branchSlug = path.basename(relPath, '.html');
  let html = fs.readFileSync(full, 'utf8');
  const orig = html;
  const meta = isAr ? SERVICE_META.ar : SERVICE_META.en;

  // Match the existing "flex gap-3" service-link row plus its inner links.
  // The row currently looks like:
  //   <div class="flex gap-3" style="flex-wrap: wrap;">
  //     <a href="../book.html?branch=X&service=Y" class="...">Label</a>
  //     ...
  //   </div>
  const rowRegex = /<div class="flex gap-3" style="flex-wrap: wrap;">\s*([\s\S]*?)<\/div>/;
  const rowMatch = html.match(rowRegex);
  if (!rowMatch) return false;

  // Extract service slugs from links — supports both formats:
  //   1. href="../book.html?branch=X&service=Y" (EN, after earlier redirect pass)
  //   2. href="../../services/Y.html"           (AR, original raw links)
  const linkRegex = /href="(?:\.\.\/book\.html\?[^"]*?service=([a-z0-9-]+)|\.{2,}\/(?:\.\.\/)?services\/([a-z0-9-]+)\.html)"/g;
  const slugs = [];
  let m;
  while ((m = linkRegex.exec(rowMatch[1])) !== null) {
    const slug = m[1] || m[2];
    if (slug && !slugs.includes(slug) && meta[slug]) slugs.push(slug);
  }
  if (slugs.length === 0) return false;

  const subhead = isAr
    ? 'اختر خدمة واحدة أو أكثر، ثم تابع لاختيار التاريخ والوقت.'
    : 'Select one or more services, then continue to date & time.';
  const btnLabel = isAr ? 'اختر خدمة للمتابعة' : 'Select a service to continue';

  const choices = slugs.map(slug => {
    const s = meta[slug];
    return `        <label class="choice"><input type="checkbox" name="service" value="${slug}" hidden /><div class="choice__title">${escapeHtml(s.title)}</div><div class="choice__meta">${escapeHtml(s.meta)}</div></label>`;
  }).join('\n');

  const newSection = `<form data-branch-service-picker="${branchSlug}" action="javascript:void(0);" onsubmit="return false;">
      <div class="choice-grid">
${choices}
      </div>
      <div style="text-align: center; margin-top: var(--s-7);">
        <button type="button" data-branch-book-btn class="btn btn--lg" disabled>${btnLabel}</button>
      </div>
    </form>`;

  // Replace the old row with the new form.
  html = html.replace(rowRegex, newSection);

  // Also update the section subhead text to reflect multi-select.
  if (!isAr) {
    html = html.replace(
      /<p class="section-head__lede">Tap any service below to start booking at this house\.<\/p>/,
      `<p class="section-head__lede">${subhead}</p>`
    );
  } else {
    html = html.replace(
      /<p class="section-head__lede">اضغط على أي خدمة لبدء الحجز في هذا البيت\.<\/p>/,
      `<p class="section-head__lede">${subhead}</p>`
    );
  }

  if (html === orig) return false;
  fs.writeFileSync(full, html, 'utf8');
  return true;
}

let updated = 0;
for (const rel of BRANCH_FILES) {
  if (updateFile(rel, false)) { console.log('  UPDATED: ' + rel); updated++; }
  else console.log('  no change: ' + rel);
}
for (const rel of BRANCH_FILES) {
  const arRel = 'ar/' + rel;
  if (updateFile(arRel, true)) { console.log('  UPDATED: ' + arRel); updated++; }
  else console.log('  no change: ' + arRel);
}
console.log('\nTotal updated: ' + updated + ' files');
