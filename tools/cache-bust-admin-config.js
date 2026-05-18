// One-shot: add ?v=2 cache buster to <script src="../assets/js/config.js"> in every admin page.
const fs = require('fs');
const path = require('path');
const ADMIN = path.join(__dirname, '..', 'admin');
const FROM = '<script src="../assets/js/config.js"></script>';
const TO   = '<script src="../assets/js/config.js?v=2"></script>';
let changed = 0;
for (const name of fs.readdirSync(ADMIN)) {
  if (!name.endsWith('.html')) continue;
  const full = path.join(ADMIN, name);
  const txt  = fs.readFileSync(full, 'utf8');
  if (!txt.includes(FROM)) { console.log(`skip  ${name}`); continue; }
  fs.writeFileSync(full, txt.split(FROM).join(TO), 'utf8');
  console.log(`patch ${name}`);
  changed++;
}
console.log(`---\n${changed} files patched`);
