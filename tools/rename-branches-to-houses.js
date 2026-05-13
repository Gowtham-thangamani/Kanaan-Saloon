#!/usr/bin/env node
/**
 * Renames user-visible "Branches"/"Branch" → "Houses"/"House" in English HTML.
 * Preserves CSS classes (.branch-card, .branches-grid, etc.), URLs (branches.html),
 * JS identifiers, and Arabic content (الفروع stays). Safe replacements only.
 */
const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = path.resolve(__dirname, '..');

// Each pair: [pattern, replacement]. Patterns are anchored on visible-text contexts
// (text inside tags, well-known button labels) — they never match attribute values,
// URLs, or CSS identifiers.
const REPLACEMENTS = [
  // Nav / footer / heading text inside tags
  [/>Branches</g,                              '>Houses<'],
  [/>BRANCHES</g,                              '>HOUSES<'],
  [/>Branch</g,                                '>House<'],
  // Common CTA / inline body phrases
  [/Find Your Branch/g,                        'Find Your House'],
  [/All 10 Branches/g,                         'All 10 Houses'],
  [/All 10 branches/g,                         'All 10 houses'],
  [/View all branches/g,                       'View all houses'],
  [/view all branches/g,                       'view all houses'],
  [/our 10 branches/g,                         'our 10 houses'],
  [/Our 10 branches/g,                         'Our 10 houses'],
  [/10 branches/g,                             '10 houses'],
];

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, files);
    else if (entry.isFile() && /\.html$/i.test(entry.name)) files.push(full);
  }
  return files;
}

const allHtml = walk(PROJECT_ROOT);
// Skip Arabic files - "branches" word doesn't appear there in user-visible text
// (they use الفروع), and any incidental English in <html lang> tags is fine.
const filesToProcess = allHtml.filter(f => !/[\\/]ar[\\/]/.test(f));

let totalChanges = 0;
let filesChanged = 0;
const log = [];

for (const file of filesToProcess) {
  let content = fs.readFileSync(file, 'utf8');
  const original = content;
  let fileChanges = 0;
  for (const [pattern, repl] of REPLACEMENTS) {
    const matches = content.match(pattern);
    if (matches) {
      fileChanges += matches.length;
      content = content.replace(pattern, repl);
    }
  }
  if (content !== original) {
    fs.writeFileSync(file, content, 'utf8');
    filesChanged++;
    totalChanges += fileChanges;
    log.push(`  ${path.relative(PROJECT_ROOT, file)}: ${fileChanges} replacements`);
  }
}

console.log(log.join('\n'));
console.log(`\nTotal: ${totalChanges} replacements across ${filesChanged} files`);
console.log(`(Skipped ${allHtml.length - filesToProcess.length} Arabic files)`);
