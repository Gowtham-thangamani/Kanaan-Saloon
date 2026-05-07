/* Kanaan Admin — auth + utilities */

(function () {
  'use strict';

  // -------- Theme toggle (persists in localStorage) --------
  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    try { localStorage.setItem('kanaan_admin_theme', theme); } catch (_) {}
  }
  applyTheme(localStorage.getItem('kanaan_admin_theme') || 'dark');

  // Inject toggle into the sidebar after DOM ready
  document.addEventListener('DOMContentLoaded', () => {
    const sideUser = document.querySelector('.admin-side__user');
    if (!sideUser || sideUser.querySelector('.theme-toggle')) return;
    const btn = document.createElement('button');
    btn.className = 'theme-toggle';
    btn.type = 'button';
    btn.setAttribute('aria-label', 'Toggle theme');
    const cur = localStorage.getItem('kanaan_admin_theme') || 'dark';
    btn.textContent = cur === 'dark' ? '☾ Dark' : '☀ Light';
    btn.addEventListener('click', () => {
      const newTheme = (localStorage.getItem('kanaan_admin_theme') || 'dark') === 'dark' ? 'light' : 'dark';
      applyTheme(newTheme);
      btn.textContent = newTheme === 'dark' ? '☾ Dark' : '☀ Light';
    });
    sideUser.appendChild(btn);
  });

  // === Auth ===========================================================
  // For a static prototype we use a simple shared password hashed in localStorage.
  // For production, swap this for OAuth (Auth0, GitHub, etc.) or move admin to a
  // server with proper authentication.
  const PASSWORD_HASH_KEY = 'kanaan_admin_pw_hash';
  const SESSION_KEY = 'kanaan_admin_session';

  // Default password if none set: "kanaan2026" — admin will change on first login.
  const DEFAULT_HASH = '5e8e1e5dac1a9e2d5d54a6a76e1a6f88'; // md5('kanaan2026')

  async function hash(str) {
    // Simple SHA-256 via SubtleCrypto — md5 placeholder above is for default only
    if (window.crypto && crypto.subtle) {
      const buf = new TextEncoder().encode(str);
      const h = await crypto.subtle.digest('SHA-256', buf);
      return Array.from(new Uint8Array(h)).map(b => b.toString(16).padStart(2, '0')).join('');
    }
    // Fallback — extremely weak, but never reached in modern browsers
    let h = 0; for (let i = 0; i < str.length; i++) h = ((h << 5) - h + str.charCodeAt(i)) | 0;
    return String(h);
  }

  window.KANAAN_ADMIN = {
    async login(pw) {
      const stored = localStorage.getItem(PASSWORD_HASH_KEY);
      if (!stored) {
        // First time — accept default and store its SHA-256
        if (pw === 'kanaan2026') {
          const h = await hash(pw);
          localStorage.setItem(PASSWORD_HASH_KEY, h);
          sessionStorage.setItem(SESSION_KEY, '1');
          return true;
        }
        return false;
      }
      const h = await hash(pw);
      if (h === stored) { sessionStorage.setItem(SESSION_KEY, '1'); return true; }
      return false;
    },
    async setPassword(newPw) {
      const h = await hash(newPw);
      localStorage.setItem(PASSWORD_HASH_KEY, h);
    },
    isLoggedIn() { return sessionStorage.getItem(SESSION_KEY) === '1'; },
    logout() { sessionStorage.removeItem(SESSION_KEY); location.href = 'index.html'; },
    requireAuth() {
      if (!this.isLoggedIn()) { location.href = 'index.html'; return false; }
      return true;
    },
    toast(msg) {
      let t = document.querySelector('.toast');
      if (!t) {
        t = document.createElement('div'); t.className = 'toast';
        document.body.appendChild(t);
      }
      t.textContent = msg; t.classList.add('is-shown');
      setTimeout(() => t.classList.remove('is-shown'), 2400);
    },
    // === Content I/O =================================================
    async loadJSON(path) {
      const local = localStorage.getItem('kanaan_content_' + path);
      if (local) return JSON.parse(local);
      const r = await fetch('../' + path);
      return r.json();
    },
    saveJSON(path, data) {
      localStorage.setItem('kanaan_content_' + path, JSON.stringify(data));
      this.toast('Saved locally — click "Download JSON" to publish');
    },
    download(path, data) {
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = path.split('/').pop();
      document.body.appendChild(a); a.click(); a.remove();
      URL.revokeObjectURL(url);
    },
    // === Leads (Google Sheet CSV) ====================================
    async loadLeads() {
      let local = [], remote = [], supa = [];
      try { local = JSON.parse(localStorage.getItem('kanaan_bookings') || '[]'); } catch (_) {}

      // Supabase: live read from Postgres (primary source)
      const sb = (window.KANAAN_CONFIG && window.KANAAN_CONFIG.supabase) || {};
      if (sb.url && sb.anonKey) {
        try {
          const r = await fetch(sb.url + '/rest/v1/' + (sb.table || 'bookings') + '?select=*&order=created_at.desc&limit=1000', {
            headers: { 'apikey': sb.anonKey, 'Authorization': 'Bearer ' + sb.anonKey }
          });
          if (r.ok) {
            const rows = await r.json();
            // Normalize to admin shape
            supa = rows.map(b => ({
              bookingId: b.id,
              timestamp: b.created_at,
              status:    b.status,
              branch:    b.branch,
              service:   b.service,
              date:      b.booking_date,
              time:      b.booking_time,
              name:      b.name,
              phone:     b.phone,
              email:     b.email,
              dob:       b.dob,
              message:   b.message,
              source:    b.source,
              campaign:  b.campaign,
              locale:    b.locale
            }));
          } else {
            console.warn('[admin] supabase fetch', r.status);
          }
        } catch (e) {
          console.warn('[admin] supabase error', e);
        }
      }

      // Optional fallback: published Google Sheet CSV
      const url = localStorage.getItem('kanaan_leads_csv_url') || '';
      if (url) {
        try {
          const r = await fetch(url);
          const csv = await r.text();
          remote = this.parseCSV(csv);
        } catch (e) { console.warn('[admin] csv fetch failed', e); }
      }

      // De-dupe — prefer Supabase > CSV > local
      const map = new Map();
      [...local, ...remote, ...supa].forEach(b => {
        const key = b.bookingId || b.id || (b.timestamp + '|' + b.phone);
        if (key) map.set(key, b);
      });
      return Array.from(map.values()).sort((a, b) => {
        const ta = new Date(a.timestamp || a.createdAt || 0).getTime();
        const tb = new Date(b.timestamp || b.createdAt || 0).getTime();
        return tb - ta;
      });
    },

    /* Supabase usage stats — for the 500 MB cap monitor */
    async loadSupabaseUsage() {
      const sb = (window.KANAAN_CONFIG && window.KANAAN_CONFIG.supabase) || {};
      if (!sb.url || !sb.anonKey) return null;
      try {
        const r = await fetch(sb.url + '/rest/v1/' + (sb.table || 'bookings') + '?select=*', {
          method: 'HEAD',
          headers: {
            'apikey': sb.anonKey,
            'Authorization': 'Bearer ' + sb.anonKey,
            'Prefer': 'count=exact',
            'Range-Unit': 'items',
            'Range': '0-0'
          }
        });
        const range = r.headers.get('content-range') || '';
        const count = parseInt(range.split('/').pop(), 10) || 0;
        const estBytesPerRow = 380; // realistic average for our schema
        const estMB = (count * estBytesPerRow) / (1024 * 1024);
        const max = sb.maxSizeMB || 500;
        return { count: count, mb: estMB, maxMB: max, pct: (estMB / max) * 100 };
      } catch (e) { return null; }
    },
    parseCSV(text) {
      const lines = text.trim().split(/\r?\n/);
      if (!lines.length) return [];
      const headers = this.splitCSVLine(lines[0]).map(h => h.trim());
      return lines.slice(1).map(line => {
        const cells = this.splitCSVLine(line);
        const o = {};
        headers.forEach((h, i) => o[h] = (cells[i] || '').trim());
        return o;
      });
    },
    /* Image upload helper — converts a chosen file to a base64 data URL.
       Use this in admin editors as a quick alternative to hosting images
       elsewhere. Suitable for small images (<200 KB). For production, host
       images on Cloudinary/S3 and paste the URL into the image field instead. */
    fileToDataURL(file, maxKB) {
      maxKB = maxKB || 200;
      return new Promise((resolve, reject) => {
        if (!file) return reject(new Error('no file'));
        if (file.size > maxKB * 1024) return reject(new Error(`File too large (${Math.round(file.size/1024)} KB > ${maxKB} KB). Host on Cloudinary/S3 and paste the URL instead.`));
        const r = new FileReader();
        r.onload = () => resolve(r.result);
        r.onerror = () => reject(r.error);
        r.readAsDataURL(file);
      });
    },
    /* Wire an <input type="file"> next to a URL field. When the user picks
       an image, it's converted to a data URL and written into the URL field. */
    wireImagePicker(fileInput, urlInput) {
      fileInput.addEventListener('change', async () => {
        const f = fileInput.files[0];
        if (!f) return;
        try {
          const url = await this.fileToDataURL(f);
          urlInput.value = url;
          urlInput.dispatchEvent(new Event('input'));
          this.toast('Image embedded as data URL — save the JSON to persist.');
        } catch (e) {
          this.toast(e.message);
        }
      });
    },
    splitCSVLine(line) {
      const out = []; let cur = ''; let inQ = false;
      for (let i = 0; i < line.length; i++) {
        const c = line[i];
        if (c === '"') { if (inQ && line[i + 1] === '"') { cur += '"'; i++; } else inQ = !inQ; }
        else if (c === ',' && !inQ) { out.push(cur); cur = ''; }
        else cur += c;
      }
      out.push(cur);
      return out;
    }
  };
})();
