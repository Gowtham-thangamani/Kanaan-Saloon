/* Kanaan Admin — Supabase-Auth based access + utilities

   Authentication:
     - Admins must log in via Supabase Auth (email + password).
     - The session token from Supabase is used for *all* read/update/delete
       calls, so RLS policies that allow only `authenticated` users will work.
     - There is no client-side password hash, no "default password" in
       localStorage, and no shared secret in the page source.

   Server prerequisites (one-time, in the Supabase dashboard):
     1. Authentication → Providers → Email: enable email/password.
     2. Authentication → Users: invite each admin (set their password, or
        let them set it via the magic link / reset-password flow).
     3. Run the migrations under /supabase/migrations so RLS only allows
        authenticated UPDATE / DELETE / SELECT on bookings & co.
*/

(function () {
  'use strict';

  // -------- Theme toggle (persists in localStorage) --------
  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    try { localStorage.setItem('kanaan_admin_theme', theme); } catch (_) {}
  }
  applyTheme(localStorage.getItem('kanaan_admin_theme') || 'dark');

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

  // === Supabase Auth ==================================================
  const SESSION_KEY = 'kanaan_admin_supa_session';

  function supaCfg() {
    return (window.KANAAN_CONFIG && window.KANAAN_CONFIG.supabase) || {};
  }

  function readSession() {
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      if (!raw) return null;
      const s = JSON.parse(raw);
      // expiry check
      if (s.expires_at && Date.now() / 1000 > s.expires_at) return null;
      return s;
    } catch (_) { return null; }
  }

  function writeSession(s) {
    try { localStorage.setItem(SESSION_KEY, JSON.stringify(s)); } catch (_) {}
  }

  function clearSession() {
    try { localStorage.removeItem(SESSION_KEY); } catch (_) {}
  }

  /* Auth headers — uses access_token if logged in, otherwise anon key.
     INSERT calls (public booking form, contact form, etc.) should use the
     anon key. SELECT/UPDATE/DELETE in admin should use the access_token. */
  function authHeaders(useUserToken) {
    const sb = supaCfg();
    const session = readSession();
    const token = (useUserToken && session && session.access_token) ? session.access_token : sb.anonKey;
    return {
      'apikey': sb.anonKey || '',
      'Authorization': 'Bearer ' + (token || ''),
      'Content-Type': 'application/json'
    };
  }

  window.KANAAN_ADMIN = {
    /* === Auth === */
    async login(email, pw) {
      const sb = supaCfg();
      if (!sb.url || !sb.anonKey) {
        return { ok: false, error: 'Supabase not configured (assets/js/config.js).' };
      }
      try {
        const r = await fetch(sb.url + '/auth/v1/token?grant_type=password', {
          method: 'POST',
          headers: {
            'apikey': sb.anonKey,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ email: email, password: pw })
        });
        const j = await r.json().catch(() => ({}));
        if (!r.ok) {
          return { ok: false, error: j.error_description || j.msg || j.error || ('HTTP ' + r.status) };
        }
        // j: { access_token, refresh_token, expires_in, expires_at, user, ... }
        writeSession(j);
        return { ok: true, user: j.user };
      } catch (e) {
        return { ok: false, error: e.message || String(e) };
      }
    },
    async logout() {
      const sb = supaCfg();
      const session = readSession();
      if (sb.url && sb.anonKey && session && session.access_token) {
        try {
          await fetch(sb.url + '/auth/v1/logout', {
            method: 'POST',
            headers: {
              'apikey': sb.anonKey,
              'Authorization': 'Bearer ' + session.access_token
            }
          });
        } catch (_) {}
      }
      clearSession();
      location.href = 'index.html';
    },
    /* Send a "reset your password" email via Supabase Auth.
       Returns { ok, error }. The email contains a magic link that lands on
       /admin/reset.html with a recovery access_token in the URL hash. */
    async requestPasswordReset(email, redirectTo) {
      const sb = supaCfg();
      if (!sb.url || !sb.anonKey) return { ok: false, error: 'Supabase not configured' };
      if (!email) return { ok: false, error: 'Email required' };
      try {
        const body = redirectTo
          ? { email: email, redirect_to: redirectTo }
          : { email: email };
        const r = await fetch(sb.url + '/auth/v1/recover', {
          method: 'POST',
          headers: {
            'apikey': sb.anonKey,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(body)
        });
        if (!r.ok) {
          const j = await r.json().catch(() => ({}));
          return { ok: false, error: j.error_description || j.msg || j.error || ('HTTP ' + r.status) };
        }
        // Supabase returns 200 even when the email doesn't exist (anti-enumeration).
        // That's fine — we always tell the user "if the account exists, an email is on the way".
        return { ok: true };
      } catch (e) {
        return { ok: false, error: e.message || String(e) };
      }
    },
    /* Persist a recovery session (parsed from the URL hash on /admin/reset.html)
       so the next setPassword() call goes through with that token. */
    consumeRecoveryToken(tokens) {
      // tokens = { access_token, refresh_token, expires_in, expires_at, ... }
      if (!tokens || !tokens.access_token) return false;
      writeSession(tokens);
      return true;
    },
    isLoggedIn() {
      const s = readSession();
      return !!(s && s.access_token);
    },
    currentUserEmail() {
      const s = readSession();
      return s && s.user && s.user.email;
    },
    /* Validate a candidate password against the salon's policy:
        - 8+ characters
        - at least one letter
        - at least one digit
        - at least one non-alphanumeric symbol
       Returns { ok: true } or { ok: false, error: '...' }. */
    validatePasswordStrength(pw) {
      if (!pw || pw.length < 8) return { ok: false, error: 'Use at least 8 characters.' };
      if (!/[A-Za-z]/.test(pw))  return { ok: false, error: 'Include at least one letter.' };
      if (!/\d/.test(pw))        return { ok: false, error: 'Include at least one number.' };
      if (!/[^A-Za-z0-9]/.test(pw)) return { ok: false, error: 'Include at least one symbol (! @ # $ etc).' };
      if (pw.length > 72)        return { ok: false, error: 'Maximum 72 characters.' };
      return { ok: true };
    },
    /* Check whether `candidatePw` is identical to the user's current password.
       Returns { same: boolean, error?: string }. We do this by firing a raw
       sign-in attempt against Supabase Auth and inspecting the response — we
       never persist the resulting session, so the calling page's existing
       (recovery or normal) session stays untouched. */
    async isSameAsCurrentPassword(email, candidatePw) {
      const sb = supaCfg();
      if (!sb.url || !sb.anonKey) return { same: false, error: 'Supabase not configured' };
      if (!email) return { same: false, error: 'Email not available' };
      try {
        const r = await fetch(sb.url + '/auth/v1/token?grant_type=password', {
          method: 'POST',
          headers: {
            'apikey': sb.anonKey,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ email: email, password: candidatePw })
        });
        // 200 → sign-in succeeded → candidate === current password.
        // 400 / 401 → wrong password → candidate is different.
        if (r.ok) return { same: true };
        return { same: false };
      } catch (e) {
        // If the network is flaky, fail-open — don't block the user from updating.
        return { same: false, error: e.message || String(e) };
      }
    },
    /* Update the signed-in user's password via Supabase Auth.
       Returns { ok, error }. */
    async setPassword(newPw) {
      const sb = supaCfg();
      const session = readSession();
      if (!sb.url || !sb.anonKey) return { ok: false, error: 'Supabase not configured' };
      if (!session || !session.access_token) return { ok: false, error: 'Not signed in' };
      try {
        const r = await fetch(sb.url + '/auth/v1/user', {
          method: 'PUT',
          headers: {
            'apikey': sb.anonKey,
            'Authorization': 'Bearer ' + session.access_token,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ password: newPw })
        });
        const j = await r.json().catch(() => ({}));
        if (!r.ok) return { ok: false, error: j.error_description || j.msg || j.error || ('HTTP ' + r.status) };
        return { ok: true };
      } catch (e) {
        return { ok: false, error: e.message || String(e) };
      }
    },
    requireAuth() {
      if (!this.isLoggedIn()) { location.href = 'index.html'; return false; }
      return true;
    },
    authHeaders: authHeaders,

    /* === UI helper — toast === */
    toast(msg) {
      let t = document.querySelector('.toast');
      if (!t) {
        t = document.createElement('div'); t.className = 'toast';
        document.body.appendChild(t);
      }
      t.textContent = msg; t.classList.add('is-shown');
      setTimeout(() => t.classList.remove('is-shown'), 2400);
    },

    /* === Content I/O — local-edit + JSON download (server persistence
           still requires manual deploy; see admin/integrations.html) === */
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

    /* === Bookings / leads — Supabase reads (authenticated) === */
    async loadLeads() {
      let local = [], remote = [], supa = [];
      try { local = JSON.parse(localStorage.getItem('kanaan_bookings') || '[]'); } catch (_) {}

      const sb = supaCfg();
      if (sb.url && sb.anonKey && this.isLoggedIn()) {
        try {
          const r = await fetch(sb.url + '/rest/v1/' + (sb.table || 'bookings') + '?select=*&order=created_at.desc&limit=1000', {
            headers: authHeaders(true)
          });
          if (r.ok) {
            const rows = await r.json();
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
          } else if (r.status === 401) {
            clearSession();
            location.href = 'index.html';
            return [];
          } else {
            console.warn('[admin] supabase fetch', r.status);
          }
        } catch (e) {
          console.warn('[admin] supabase error', e);
        }
      }

      const url = localStorage.getItem('kanaan_leads_csv_url') || '';
      if (url) {
        try {
          const r = await fetch(url);
          const csv = await r.text();
          remote = this.parseCSV(csv);
        } catch (e) { console.warn('[admin] csv fetch failed', e); }
      }

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

    /* PATCH a booking's status via Supabase. Returns { ok, error }. */
    async updateBookingStatus(id, status) {
      const sb = supaCfg();
      if (!sb.url || !sb.anonKey) return { ok: false, error: 'Supabase not configured' };
      if (!this.isLoggedIn()) return { ok: false, error: 'Not signed in' };
      try {
        const r = await fetch(sb.url + '/rest/v1/' + (sb.table || 'bookings') + '?id=eq.' + encodeURIComponent(id), {
          method: 'PATCH',
          headers: Object.assign({}, authHeaders(true), { 'Prefer': 'return=minimal' }),
          body: JSON.stringify({ status: status })
        });
        if (!r.ok) {
          const txt = await r.text().catch(() => '');
          return { ok: false, error: 'HTTP ' + r.status + ' ' + txt };
        }
        return { ok: true };
      } catch (e) {
        return { ok: false, error: e.message || String(e) };
      }
    },

    /* DELETE a booking via Supabase. Returns { ok, error }. */
    async deleteBooking(id) {
      const sb = supaCfg();
      if (!sb.url || !sb.anonKey) return { ok: false, error: 'Supabase not configured' };
      if (!this.isLoggedIn()) return { ok: false, error: 'Not signed in' };
      try {
        const r = await fetch(sb.url + '/rest/v1/' + (sb.table || 'bookings') + '?id=eq.' + encodeURIComponent(id), {
          method: 'DELETE',
          headers: Object.assign({}, authHeaders(true), { 'Prefer': 'return=minimal' })
        });
        if (!r.ok) {
          const txt = await r.text().catch(() => '');
          return { ok: false, error: 'HTTP ' + r.status + ' ' + txt };
        }
        return { ok: true };
      } catch (e) {
        return { ok: false, error: e.message || String(e) };
      }
    },

    /* Generic table read (contacts, newsletter, careers, vouchers) */
    async loadTable(table, opts) {
      opts = opts || {};
      const sb = supaCfg();
      if (!sb.url || !sb.anonKey) return [];
      if (!this.isLoggedIn()) return [];
      const limit = opts.limit || 1000;
      try {
        const r = await fetch(sb.url + '/rest/v1/' + table + '?select=*&order=created_at.desc&limit=' + limit, {
          headers: authHeaders(true)
        });
        if (!r.ok) {
          if (r.status === 401) { clearSession(); location.href = 'index.html'; }
          return [];
        }
        return await r.json();
      } catch (e) { return []; }
    },

    /* === Supabase usage stats — for the 500 MB cap monitor === */
    async loadSupabaseUsage() {
      const sb = supaCfg();
      if (!sb.url || !sb.anonKey || !this.isLoggedIn()) return null;
      try {
        const r = await fetch(sb.url + '/rest/v1/' + (sb.table || 'bookings') + '?select=*', {
          method: 'HEAD',
          headers: Object.assign({}, authHeaders(true), {
            'Prefer': 'count=exact',
            'Range-Unit': 'items',
            'Range': '0-0'
          })
        });
        const range = r.headers.get('content-range') || '';
        const count = parseInt(range.split('/').pop(), 10) || 0;
        const estBytesPerRow = 380;
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
    fileToDataURL(file, maxKB) {
      maxKB = maxKB || 200;
      return new Promise((resolve, reject) => {
        if (!file) return reject(new Error('no file'));
        if (file.size > maxKB * 1024) return reject(new Error('File too large (' + Math.round(file.size/1024) + ' KB > ' + maxKB + ' KB). Host on Cloudinary/S3 and paste the URL instead.'));
        const r = new FileReader();
        r.onload = () => resolve(r.result);
        r.onerror = () => reject(r.error);
        r.readAsDataURL(file);
      });
    },
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
