#!/usr/bin/env node
/**
 * Extracts branch photo zips from Downloads, dedupes, converts PNG -> WebP
 * at 1000w (gallery) and 1600w (hero), outputs to assets/img/branches/<slug>/
 * and writes a manifest JSON used by the HTML updater.
 */
const fs = require('fs');
const path = require('path');
const os = require('os');
const sharp = require('sharp');
const AdmZip = (() => { try { return require('adm-zip'); } catch { return null; } })();

const DOWNLOADS = path.join(os.homedir(), 'Downloads');
const PROJECT_ROOT = path.resolve(__dirname, '..');
const OUT_BASE = path.join(PROJECT_ROOT, 'assets', 'img', 'branches');
const MANIFEST_PATH = path.join(PROJECT_ROOT, 'tools', 'branches-photo-manifest.json');

// Map zip-folder-name -> project slug
const ZIP_TO_SLUG = {
  'Al Ain': 'al-ain',
  'Al khaldia': 'khalidiya',
  'Al shahamah new': 'new-shahamah',
  'Al shahamah old': 'old-shahamah',
  'Baniyas spa': 'baniyas-spa',
  'Bin Elgesrin': 'rabdan',
  'Khalifa': 'khalifa-city',
  'Vip muror': 'vip-muroor',
};

function findZip(folderName) {
  const all = fs.readdirSync(DOWNLOADS);
  return all.find(f => f.startsWith(folderName + '-2026') && f.endsWith('.zip'));
}

async function extractZip(zipPath) {
  if (!AdmZip) {
    // Fallback: use built-in via execSync to PowerShell Expand-Archive
    const { execSync } = require('child_process');
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'branchzip-'));
    execSync(`powershell -Command "Expand-Archive -LiteralPath '${zipPath}' -DestinationPath '${tmpDir}' -Force"`, { stdio: 'pipe' });
    return tmpDir;
  }
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'branchzip-'));
  const zip = new AdmZip(zipPath);
  zip.extractAllTo(tmpDir, true);
  return tmpDir;
}

function pickPhotos(extractedDir, folderName) {
  const folder = path.join(extractedDir, folderName);
  let entries = fs.readdirSync(folder).filter(f => /\.(png|jpg|jpeg)$/i.test(f));
  // Dedupe: drop files containing "(1)" if a non-(1) version exists
  const baseSet = new Set(entries.map(e => e.replace(/\(\d+\)/, '')));
  const uniqueByBase = new Map();
  for (const e of entries) {
    const base = e.replace(/\(\d+\)/, '');
    if (!uniqueByBase.has(base)) uniqueByBase.set(base, e);
    // prefer non-(1) version
    else if (!/\(\d+\)/.test(e)) uniqueByBase.set(base, e);
  }
  // Sort by numeric IMG_XXXX where possible
  const sorted = Array.from(uniqueByBase.values()).sort((a, b) => {
    const na = parseInt((a.match(/(\d{3,})/) || [])[1] || 0, 10);
    const nb = parseInt((b.match(/(\d{3,})/) || [])[1] || 0, 10);
    return na - nb;
  });
  return sorted.map(f => path.join(folder, f));
}

async function convertPhoto(srcPath, outDir, slug, idx) {
  await fs.promises.mkdir(outDir, { recursive: true });
  const base1000 = path.join(outDir, `${slug}-${idx}.webp`);
  const base1600 = path.join(outDir, `${slug}-${idx}-1600.webp`);
  await sharp(srcPath).rotate().resize({ width: 1000, withoutEnlargement: true }).webp({ quality: 80 }).toFile(base1000);
  await sharp(srcPath).rotate().resize({ width: 1600, withoutEnlargement: true }).webp({ quality: 82 }).toFile(base1600);
  return { thumb: base1000, hero: base1600 };
}

(async () => {
  if (!fs.existsSync(OUT_BASE)) fs.mkdirSync(OUT_BASE, { recursive: true });
  const manifest = {};
  for (const [folderName, slug] of Object.entries(ZIP_TO_SLUG)) {
    const zipName = findZip(folderName);
    if (!zipName) { console.log(`SKIP ${slug}: no zip found for "${folderName}"`); continue; }
    const zipPath = path.join(DOWNLOADS, zipName);
    process.stdout.write(`\n=== ${slug} (${zipName}) ===\n`);
    const extracted = await extractZip(zipPath);
    const photos = pickPhotos(extracted, folderName).slice(0, 7); // take up to 7 unique photos
    console.log(`  ${photos.length} unique photos selected`);
    const outDir = path.join(OUT_BASE, slug);
    if (fs.existsSync(outDir)) fs.rmSync(outDir, { recursive: true, force: true });
    const results = [];
    for (let i = 0; i < photos.length; i++) {
      const r = await convertPhoto(photos[i], outDir, slug, i + 1);
      const thumbSize = (fs.statSync(r.thumb).size / 1024).toFixed(0);
      const heroSize = (fs.statSync(r.hero).size / 1024).toFixed(0);
      console.log(`  -> ${slug}-${i + 1}.webp (${thumbSize} KB) + 1600 (${heroSize} KB)`);
      results.push({
        thumb: `/assets/img/branches/${slug}/${slug}-${i + 1}.webp`,
        hero: `/assets/img/branches/${slug}/${slug}-${i + 1}-1600.webp`,
      });
    }
    manifest[slug] = results;
    // Clean up extracted temp dir
    fs.rmSync(extracted, { recursive: true, force: true });
  }
  fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2));
  console.log(`\nManifest written: ${MANIFEST_PATH}`);
})().catch(err => { console.error('ERROR:', err); process.exit(1); });
