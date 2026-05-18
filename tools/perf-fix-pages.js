/*
 * One-shot: roll the homepage perf fixes through every other HTML page.
 *
 * For each .html file under the project (excluding admin/, node_modules/, .git/):
 *
 *   1. For every <img ...> tag that lacks width="" / height="":
 *        - Look up the src's intrinsic dimensions from the local file
 *          (via sharp); add explicit width/height. SVG logos get 567x567.
 *
 *   2. For every <img ...> with loading="eager" fetchpriority="high"
 *      whose src ends in -1600.webp:
 *        - Add srcset listing all 3 width variants + sizes="100vw".
 *        - The hero LCP image now downloads the right size on mobile.
 *
 *   3. For every <link rel="preload" as="image" href="...-1600.webp"
 *      fetchpriority="high"> in <head>:
 *        - Upgrade to imagesrcset + imagesizes so mobile preloads the
 *          smaller variant (Chrome/Edge/Safari respect this).
 *
 * Skipped:
 *   - <img> with remote src (https://…)            — no local dims
 *   - <img> with src whose file we can't introspect — left alone
 *   - admin/* pages                                  — internal audience
 */

const fs    = require('fs');
const path  = require('path');
const sharp = require('sharp');

const ROOT   = path.resolve(__dirname, '..');
const PHOTOS = path.join(ROOT, 'assets', 'img', 'photos');

// ---------------------------------------------------------------------------
// 1. Build dim cache: filename → { w, h }
// ---------------------------------------------------------------------------
const dimCache = new Map();
async function dimsOf(absPath) {
  if (dimCache.has(absPath)) return dimCache.get(absPath);
  let dims = null;
  try {
    const m = await sharp(absPath).metadata();
    if (m.width && m.height) dims = { w: m.width, h: m.height };
  } catch {}
  dimCache.set(absPath, dims);
  return dims;
}

// Build stem → [variants present] map for known hero photos
const photoFiles = fs.existsSync(PHOTOS) ? fs.readdirSync(PHOTOS) : [];
const variantSet = new Set(photoFiles.filter(f => /-(600|1000|1600)\.webp$/.test(f)));

// ---------------------------------------------------------------------------
// 2. Walk every .html under ROOT
// ---------------------------------------------------------------------------
const SKIP_DIRS = new Set(['node_modules', '.git', 'admin', '.cache', 'dist']);
function* walkHtml(dir) {
  for (const name of fs.readdirSync(dir, { withFileTypes: true })) {
    if (name.isDirectory()) {
      if (SKIP_DIRS.has(name.name)) continue;
      yield* walkHtml(path.join(dir, name.name));
    } else if (name.isFile() && name.name.endsWith('.html')) {
      yield path.join(dir, name.name);
    }
  }
}

// Resolve a src like "assets/img/photos/foo.webp" or "../assets/..."
// relative to the HTML file's directory. Returns absolute path or null.
function resolveSrc(htmlAbsPath, src) {
  if (/^https?:|^data:|^#/.test(src)) return null;
  const dir = path.dirname(htmlAbsPath);
  const abs = path.resolve(dir, src.replace(/[?#].*$/, ''));
  if (!fs.existsSync(abs)) return null;
  return abs;
}

// Build srcset from a 1600 variant URL — but only if -600 + -1000 also exist.
function srcsetFor(srcAttr) {
  const m = srcAttr.match(/^(.+?)-1600\.webp(\?[^"']*)?$/);
  if (!m) return null;
  const stem = m[1];
  const stemBase = path.basename(stem);
  if (!variantSet.has(stemBase + '-600.webp')) return null;
  if (!variantSet.has(stemBase + '-1000.webp')) return null;
  return `${stem}-600.webp 600w, ${stem}-1000.webp 1000w, ${stem}-1600.webp 1600w`;
}

// Build a single attribute string from an attrs object, preserving original
// order where possible. We re-emit width/height/srcset/sizes at the end.
function emitImgTag(attrs, order) {
  const pairs = [];
  for (const k of order) if (attrs[k] !== undefined) pairs.push(`${k}="${attrs[k]}"`);
  for (const k of Object.keys(attrs)) if (!order.includes(k)) pairs.push(`${k}="${attrs[k]}"`);
  return `<img ${pairs.join(' ')} />`;
}

// Parse an <img ...> tag into an attrs object + the original order of keys.
function parseImgTag(tag) {
  // tag includes the leading <img and trailing /> or >
  const body = tag.replace(/^<img\s*/i, '').replace(/\s*\/?>\s*$/, '');
  const attrs = {};
  const order = [];
  const re = /([a-zA-Z_:][-a-zA-Z0-9_:.]*)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g;
  let m;
  while ((m = re.exec(body)) !== null) {
    const k = m[1];
    const v = m[2] ?? m[3] ?? m[4] ?? '';
    attrs[k] = v;
    order.push(k);
  }
  return { attrs, order };
}

// ---------------------------------------------------------------------------
// 3. Main loop
// ---------------------------------------------------------------------------
(async function main() {
  let filesScanned = 0, filesChanged = 0, imgsPatched = 0, heroesPatched = 0, preloadsPatched = 0;
  const report = [];

  for (const htmlPath of walkHtml(ROOT)) {
    filesScanned++;
    const original = fs.readFileSync(htmlPath, 'utf8');
    let txt = original;
    let pageImgs = 0, pageHeroes = 0, pagePreload = 0;

    // --- (a) Patch <img> tags ---
    // Match any <img ...> (single-line or multi-line, self-closing or not).
    const imgRe = /<img\b[^>]*\/?>/gi;
    const matches = [...txt.matchAll(imgRe)];
    // Walk back to front so indices stay valid as we splice.
    for (let i = matches.length - 1; i >= 0; i--) {
      const [tag] = matches[i];
      const idx = matches[i].index;
      const { attrs, order } = parseImgTag(tag);
      if (!attrs.src) continue;

      let mutated = false;

      // (a1) Add width/height if missing.
      const hasW = attrs.width !== undefined;
      const hasH = attrs.height !== undefined;
      if (!hasW || !hasH) {
        if (/\.svg(\?|$)/i.test(attrs.src)) {
          // All site SVGs in use are square (logo.svg = 567x567). Safe default.
          if (!hasW) { attrs.width  = '567'; order.push('width');  }
          if (!hasH) { attrs.height = '567'; order.push('height'); }
          mutated = true;
        } else {
          const abs = resolveSrc(htmlPath, attrs.src);
          if (abs) {
            const d = await dimsOf(abs);
            if (d) {
              // If inline style forces aspect-ratio:4/5 — preserve that ratio
              // in the width/height we emit, to maximise CLS prevention.
              const styleMatch = (attrs.style || '').match(/aspect-ratio\s*:\s*(\d+)\s*\/\s*(\d+)/);
              let w = d.w, h = d.h;
              if (styleMatch) {
                const ar = parseInt(styleMatch[1], 10) / parseInt(styleMatch[2], 10);
                w = 800; h = Math.round(800 / ar);
              }
              if (!hasW) { attrs.width  = String(w); order.push('width');  }
              if (!hasH) { attrs.height = String(h); order.push('height'); }
              mutated = true;
            }
          }
        }
      }

      // (a2) Hero srcset: eager + fetchpriority=high + -1600.webp src.
      const isHero = attrs.loading === 'eager' && attrs.fetchpriority === 'high';
      if (isHero && !attrs.srcset) {
        const set = srcsetFor(attrs.src);
        if (set) {
          attrs.srcset = set;
          attrs.sizes  = attrs.sizes || '100vw';
          if (!order.includes('srcset')) order.push('srcset');
          if (!order.includes('sizes'))  order.push('sizes');
          mutated = true;
          pageHeroes++;
        }
      }

      if (mutated) {
        const newTag = emitImgTag(attrs, order);
        txt = txt.slice(0, idx) + newTag + txt.slice(idx + tag.length);
        pageImgs++;
      }
    }

    // --- (b) Upgrade <link rel="preload" as="image" href="...-1600.webp" ...> ---
    // Only if it doesn't already carry an imagesrcset.
    txt = txt.replace(
      /<link\s+([^>]*\brel="preload"[^>]*\bas="image"[^>]*)\/?>/gi,
      (full, inner) => {
        if (/\bimagesrcset=/i.test(inner)) return full;          // already done
        // Strip the trailing self-close slash if [^>]* captured it; otherwise
        // we'd end up emitting "... fetchpriority='high' / />".
        const cleanInner = inner.replace(/\s*\/?\s*$/, '');
        const href = (cleanInner.match(/\bhref="([^"]+-1600\.webp)"/) || [])[1];
        if (!href) return full;
        const set = srcsetFor(href);
        if (!set) return full;
        const upgraded = cleanInner.replace(
          /\bhref="[^"]+"/,
          (h) => `${h}\n        imagesrcset="${set}"\n        imagesizes="100vw"`
        );
        pagePreload++;
        return `<link ${upgraded} />`;
      }
    );

    if (txt !== original) {
      fs.writeFileSync(htmlPath, txt, 'utf8');
      filesChanged++;
      imgsPatched     += pageImgs;
      heroesPatched   += pageHeroes;
      preloadsPatched += pagePreload;
      report.push(`${path.relative(ROOT, htmlPath).padEnd(50)} imgs+${pageImgs} hero+${pageHeroes} preload+${pagePreload}`);
    }
  }

  console.log(report.join('\n'));
  console.log('---');
  console.log(`scanned ${filesScanned} files, changed ${filesChanged}`);
  console.log(`patched ${imgsPatched} <img>, ${heroesPatched} hero srcsets, ${preloadsPatched} preload tags`);
})().catch(e => { console.error(e); process.exit(1); });
