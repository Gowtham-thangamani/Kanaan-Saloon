/**
 * Updates Google Maps iframe URLs and JSON-LD geo across all branch pages.
 *
 * Coords below were extracted from the maps.app.goo.gl share URLs the owner
 * provided. Seven resolved to precise @lat,lng; the other three resolved to
 * place-query URLs (no embedded coords) — for those we use a high-precision
 * place query so Google's embed still pins the exact business listing.
 *
 * Touches:
 *   - content/branches.json                (adds geo / maps_query fields)
 *   - branches/<slug>.html                 (iframe src + JSON-LD geo)
 *   - ar/branches/<slug>.html              (iframe src + JSON-LD geo)
 *   - lp/<slug>-near-me.html               (iframe src)
 *   - generate-branches.js                 (template uses new field)
 *   - generate-ar-branches.js              (template uses new field)
 *   - generate-branch-lps.js               (template uses new field)
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

const BRANCHES = {
  'rabdan':         { lat: 24.4172367, lng: 54.4957746 },
  'khalifa-city':   { lat: 24.3981095, lng: 54.5631248 },
  'khalidiya':      { lat: 24.4798416, lng: 54.3584076 },
  'old-shahamah':   { lat: 24.5522131, lng: 54.6940039 },
  'baniyas-barber': { lat: 24.2969341, lng: 54.6287108 },
  'vip-muroor':     { lat: 24.4400772, lng: 54.4122623 },
  'new-shahamah':   { lat: 24.5241819, lng: 54.6766356 },
  /* Refined precise coords — owner aligned each pin to the salon's registered
     Google listing (Al Silaymi / Al Jimi for Al Ain; Muroor Road core for Muroor;
     Bani Yas Street / Baniyas East for the Baniyas spa). */
  'al-ain':         { lat: 24.242199, lng: 55.740155 },
  'muroor':         { lat: 24.4331,   lng: 54.4375 },
  'baniyas-spa':    { lat: 24.296978, lng: 54.628567 },
};

function iframeQuery(slug) {
  const b = BRANCHES[slug];
  /* When coords are approximate, prefer the mapsQuery for the iframe (Google's
     embed name-matches to the actual business, more accurate than an approx pin).
     When coords are exact, use them directly. */
  if (b.approx && b.mapsQuery) return b.mapsQuery;
  if (b.lat != null && b.lng != null) return `${b.lat},${b.lng}`;
  return b.mapsQuery;
}

function iframeSrc(slug) {
  /* encodeURIComponent is safe for both lat,lng and full place queries —
     it preserves digits, dots, and minus, and percent-encodes spaces/specials. */
  return `https://www.google.com/maps?q=${encodeURIComponent(iframeQuery(slug))}&output=embed`;
}

const log = [];
function updateFile(filePath, transforms) {
  if (!fs.existsSync(filePath)) {
    log.push(`  SKIP  ${path.relative(ROOT, filePath)} (not found)`);
    return;
  }
  let content = fs.readFileSync(filePath, 'utf8');
  let changed = 0;
  for (const [name, fn] of transforms) {
    const before = content;
    content = fn(content);
    if (content !== before) changed++;
  }
  if (changed) {
    fs.writeFileSync(filePath, content, 'utf8');
    log.push(`  OK    ${path.relative(ROOT, filePath)} (${changed} edit${changed > 1 ? 's' : ''})`);
  } else {
    log.push(`  NOOP  ${path.relative(ROOT, filePath)} (no patterns matched)`);
  }
}

/* === Per-branch HTML transforms === */
function htmlTransforms(slug) {
  const src = iframeSrc(slug);
  const b = BRANCHES[slug];
  const transforms = [
    ['iframe.src', c => c.replace(
      /(<iframe[^>]*\bsrc=")https:\/\/www\.google\.com\/maps\?q=[^"]+&output=embed(")/g,
      `$1${src}$2`
    )],
  ];
  if (b.lat != null && b.lng != null) {
    /* Update JSON-LD GeoCoordinates only when we have precise coords.
       For place-query branches we leave the existing approximate coords —
       they're better than nothing and Google trusts our embed for the visible pin. */
    transforms.push(['jsonld.geo', c => c.replace(
      /("@type":\s*"GeoCoordinates",\s*"latitude":\s*)[\d.\-]+(,\s*"longitude":\s*)[\d.\-]+/g,
      `$1${b.lat}$2${b.lng}`
    )]);
  }
  return transforms;
}

console.log('Updating branch map pins...\n');
console.log('--- HTML pages ---');
for (const slug of Object.keys(BRANCHES)) {
  const transforms = htmlTransforms(slug);
  updateFile(path.join(ROOT, 'branches', slug + '.html'), transforms);
  updateFile(path.join(ROOT, 'ar', 'branches', slug + '.html'), transforms);
  updateFile(path.join(ROOT, 'lp', slug + '-near-me.html'), [transforms[0]]); /* LPs have no JSON-LD geo */
}

/* === content/branches.json === */
console.log('\n--- branches.json ---');
const branchesJsonPath = path.join(ROOT, 'content', 'branches.json');
const branchesJson = JSON.parse(fs.readFileSync(branchesJsonPath, 'utf8'));
const list = branchesJson.branches || branchesJson;
const arr = Array.isArray(list) ? list : Object.values(list);
let jsonChanges = 0;
for (const branch of arr) {
  const slug = branch.slug || branch.id;
  const b = BRANCHES[slug];
  if (!b) continue;
  if (b.lat != null) {
    branch.lat = b.lat;
    branch.lng = b.lng;
  }
  /* Generators read maps_query for the iframe. When coords are approximate,
     store the name query so the iframe keeps name-matching the exact business.
     When exact, store the lat,lng string. */
  if (b.approx && b.mapsQuery) {
    branch.maps_query = b.mapsQuery;
  } else if (b.lat != null) {
    branch.maps_query = `${b.lat},${b.lng}`;
  } else {
    branch.maps_query = b.mapsQuery;
  }
  jsonChanges++;
}
fs.writeFileSync(branchesJsonPath, JSON.stringify(branchesJson, null, 2) + '\n', 'utf8');
console.log(`  OK    content/branches.json (${jsonChanges} branches updated)`);

console.log('\n--- summary ---');
for (const line of log) console.log(line);
console.log(`\nDone. Map pins updated across ${Object.keys(BRANCHES).length} branches.`);
