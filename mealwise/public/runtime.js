// Mealwise web runtime: provides the same `claude.use()` surface the app uses
// inside claude.ai, backed by Supabase (sign-in + private storage) and the
// /api/ai endpoint (Claude, with the API key kept on the server).
'use strict';
(() => {
  const CFG = {
    url: 'https://hmkhglqychrtdifkxwhd.supabase.co',
    key: 'sb_publishable_vRoL7Kj220RX_I2KtHvjvQ_TP_ceLP0',
  };
  window.MEALWISE_HOST = 'web';
  const LS = 'mealwise.session.v1';
  const clone = x => (x === undefined ? undefined : JSON.parse(JSON.stringify(x)));
  const err = code => ({ code, message: code });

  /* ---------- Session ---------- */
  let session = null;
  try { session = JSON.parse(localStorage.getItem(LS) || 'null'); } catch { session = null; }
  const saveSession = s => { session = s; try { s ? localStorage.setItem(LS, JSON.stringify(s)) : localStorage.removeItem(LS); } catch {} };
  function takeSession(j) {
    if (!j || !j.access_token) return false;
    saveSession({ access_token: j.access_token, refresh_token: j.refresh_token, expires_at: j.expires_at || Math.floor(Date.now() / 1000) + (j.expires_in || 3600), user: { id: j.user.id, email: j.user.email } });
    return true;
  }
  async function authPost(path, body) {
    const r = await fetch(CFG.url + '/auth/v1' + path, { method: 'POST', headers: { apikey: CFG.key, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    let j = null; try { j = await r.json(); } catch {}
    return { ok: r.ok, status: r.status, j: j || {} };
  }
  let refreshing = null;
  async function refresh() {
    if (!session || !session.refresh_token) return false;
    refreshing = refreshing || (async () => {
      try { const { ok, j } = await authPost('/token?grant_type=refresh_token', { refresh_token: session.refresh_token }); if (ok && takeSession(j)) return true; } catch { return null; }
      saveSession(null); return false;
    })().finally(() => setTimeout(() => { refreshing = null; }, 0));
    return refreshing;
  }
  async function token() {
    if (!session) throw err('session_expired');
    if (session.expires_at * 1000 < Date.now() + 60000) { const r = await refresh(); if (r === false) { signedOut(); throw err('session_expired'); } }
    return session.access_token;
  }
  async function api(path, init = {}, retry = true) {
    const t = await token();
    let r;
    try { r = await fetch(CFG.url + path, { ...init, headers: { apikey: CFG.key, Authorization: 'Bearer ' + t, 'Content-Type': 'application/json', ...(init.headers || {}) } }); }
    catch { throw err('unavailable'); }
    if (r.status === 401 && retry) { const ok = await refresh(); if (ok) return api(path, init, false); signedOut(); throw err('revoked'); }
    if (r.status === 401 || r.status === 403) throw err('not_granted');
    if (r.status === 413) throw err('invalid_argument');
    if (r.status >= 400 && r.status < 500) throw err('invalid_argument');
    if (!r.ok) throw err('unavailable');
    return r;
  }
  function signedOut() { saveSession(null); if (!document.getElementById('mwAuth')) location.reload(); }
  window.mealwiseSignOut = async () => {
    try { if (session) await fetch(CFG.url + '/auth/v1/logout', { method: 'POST', headers: { apikey: CFG.key, Authorization: 'Bearer ' + session.access_token } }); } catch {}
    saveSession(null); location.reload();
  };
  window.mealwiseEmail = () => (session && session.user.email) || '';

  /* ---------- Document store over the `docs` table ---------- */
  const enc = encodeURIComponent;
  const parentOf = p => p.split('/').slice(0, -1).join('/');
  const docs = new Map();            // path -> data (known to exist)
  const missing = new Set();         // paths known not to exist
  const cols = new Map();            // collection path -> Set(paths) loaded from server
  const listeners = new Set();
  function snapDoc(path) {
    const d = docs.get(path);
    return { id: path.split('/').pop(), exists: d !== undefined, data: () => clone(d), metadata: { fromCache: false, hasPendingWrites: false } };
  }
  function snapCol(l) {
    const set = cols.get(l.path) || new Set();
    let list = [...set].filter(p => docs.has(p)).map(p => ({ p, d: docs.get(p) }));
    if (l.ord) { const [f, dir] = l.ord; list.sort((a, b) => { const x = a.d[f], y = b.d[f]; const c = x == null ? 1 : y == null ? -1 : String(x).localeCompare(String(y)); return dir === 'desc' ? -c : c; }); }
    else list.sort((a, b) => a.p.localeCompare(b.p));
    list = list.slice(0, l.lim || 1000);
    const out = list.map(x => snapDoc(x.p));
    return { docs: out, size: out.length, empty: !out.length, docChanges: () => [], metadata: { fromCache: false, hasPendingWrites: false } };
  }
  function emit(path) {
    for (const l of listeners) {
      if (l.kind === 'doc' && l.path === path) l.next(snapDoc(path));
      if (l.kind === 'col' && l.path === parentOf(path) && l.loaded) l.next(snapCol(l));
    }
  }
  async function loadDoc(path) {
    const r = await api(`/rest/v1/docs?select=data&path=eq.${enc(path)}`);
    const rows = await r.json();
    if (rows.length) { docs.set(path, rows[0].data); missing.delete(path); } else { docs.delete(path); missing.add(path); }
  }
  async function loadCol(path, ord, lim) {
    const order = ord ? `&order=data->>${enc(ord[0])}.${ord[1] === 'desc' ? 'desc' : 'asc'}.nullslast` : '&order=path.asc';
    const r = await api(`/rest/v1/docs?select=path,data&parent=eq.${enc(path)}${order}&limit=${lim || 1000}`);
    const rows = await r.json();
    const set = new Set();
    for (const row of rows) { docs.set(row.path, row.data); set.add(row.path); }
    // documents of this collection that the server no longer has
    for (const p of cols.get(path) || []) if (!set.has(p)) docs.delete(p);
    cols.set(path, set);
  }
  async function putDoc(path, data) {
    const t = JSON.stringify(data);
    if (t.length > 262144) throw err('invalid_argument');
    await api('/rest/v1/docs?on_conflict=user_id,path', { method: 'POST', headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
      body: JSON.stringify({ user_id: session.user.id, path, parent: parentOf(path), data: JSON.parse(t), updated_at: new Date().toISOString() }) });
    docs.set(path, JSON.parse(t)); missing.delete(path);
    const c = cols.get(parentOf(path)); if (c) c.add(path); else cols.set(parentOf(path), new Set([path]));
    emit(path);
  }
  const merge = (a, b) => {
    const out = { ...a };
    for (const [k, v] of Object.entries(b)) out[k] = v && typeof v === 'object' && !Array.isArray(v) && a[k] && typeof a[k] === 'object' && !Array.isArray(a[k]) ? merge(a[k], v) : v;
    return out;
  };
  function docRef(path) {
    return {
      id: path.split('/').pop(), path,
      async get() { await loadDoc(path); return snapDoc(path); },
      async set(data) { await putDoc(path, data); },
      async update(data) {
        if (!docs.has(path)) await loadDoc(path);
        if (!docs.has(path)) throw err('invalid_argument');
        await putDoc(path, merge(docs.get(path), clone(data)));
      },
      async delete() {
        await api(`/rest/v1/docs?path=eq.${enc(path)}`, { method: 'DELETE', headers: { Prefer: 'return=minimal' } });
        docs.delete(path); missing.add(path); const c = cols.get(parentOf(path)); if (c) c.delete(path); emit(path);
      },
      onSnapshot(next, error) {
        const l = { kind: 'doc', path, next, error };
        listeners.add(l);
        l.refresh = () => loadDoc(path).then(() => next(snapDoc(path)), e => { if (e.code !== 'unavailable') { listeners.delete(l); error && error(e); } });
        l.refresh();
        return () => listeners.delete(l);
      },
      collection: sub => colRef(path + '/' + sub),
    };
  }
  function colRef(path, ord, lim) {
    return {
      path,
      doc: id => docRef(path + '/' + (id || ('d' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8)))),
      orderBy: (f, dir) => colRef(path, [f, dir || 'asc'], lim),
      limit: n => colRef(path, ord, n),
      where() { throw new TypeError('where() is not supported in this runtime'); },
      async get() { await loadCol(path, ord, lim); return snapCol({ path, ord, lim }); },
      async add(data) { const r = docRef(path + '/' + ('d' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8))); await r.set(data); return r; },
      onSnapshot(next, error) {
        const l = { kind: 'col', path, ord, lim, next, error, loaded: false };
        listeners.add(l);
        l.refresh = () => loadCol(path, ord, lim).then(() => { l.loaded = true; next(snapCol(l)); }, e => { if (e.code !== 'unavailable') { listeners.delete(l); error && error(e); } });
        l.refresh();
        return () => listeners.delete(l);
      },
    };
  }
  const db = { doc: docRef, collection: p => colRef(p) };
  // Other devices' changes arrive on focus and every 30 seconds.
  const poll = () => { if (document.visibilityState === 'visible' && session) for (const l of listeners) l.refresh && l.refresh(); };
  setInterval(poll, 30000);
  document.addEventListener('visibilitychange', poll);

  /* ---------- Claude through /api/ai ---------- */
  const toB64 = blob => new Promise((res, rej) => { const fr = new FileReader(); fr.onload = () => res(String(fr.result).split(',')[1]); fr.onerror = () => rej(err('image_rejected')); fr.readAsDataURL(blob); });
  async function json(prompt, opts = {}) {
    if (typeof prompt !== 'string' || !prompt) throw err('invalid_request');
    const imgs = opts.images ? Array.from(opts.images.length !== undefined ? opts.images : [opts.images]) : [];
    const images = [];
    for (const b of imgs) images.push({ media_type: ['image/jpeg', 'image/png', 'image/webp'].includes(b.type) ? b.type : 'image/jpeg', data: await toB64(b) });
    let t; try { t = await token(); } catch (e) { throw e; }
    let r;
    try {
      r = await fetch('/api/ai', { method: 'POST', signal: opts.signal, headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + t }, body: JSON.stringify({ prompt, images, tier: opts.modelTier || 'default' }) });
    } catch (e) { throw err(e && e.name === 'AbortError' ? 'cancelled' : 'upstream_error'); }
    let j = null; try { j = await r.json(); } catch {}
    if (j && j.error) throw err(j.error.code || 'upstream_error');
    if (!r.ok || !j || !('json' in j)) throw err(r.status === 413 ? 'image_rejected' : 'upstream_error');
    return j.json;
  }
  const sample = Object.assign(async () => { throw err('capability_removed'); }, {
    json,
    limits: async () => ({ maxPromptBytes: 120000, images: { maxCount: 2, maxInputBytes: 25 * 1024 * 1024, mediaTypes: ['image/jpeg', 'image/png', 'image/webp'] } }),
  });

  /* ---------- Downloads ---------- */
  const downloads = {
    async save({ filename, data }) {
      const blob = data instanceof Blob ? data : new Blob([data]);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = filename; a.rel = 'noopener';
      document.body.append(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 30000);
      return { status: 'saved' };
    },
  };
  const user = { id: async () => session && session.user.id, isOwner: () => true, canEdit: () => true, can: () => true };

  /* ---------- Sign-in screen ---------- */
  let ready;
  const readyP = new Promise(r => { ready = r; });
  async function checkAllowed() {
    try { const r = await api('/rest/v1/rpc/is_allowed', { method: 'POST', body: '{}' }); return (await r.json()) === true; } catch { return null; }
  }
  function authScreen(msg) {
    const wrap = document.createElement('div');
    wrap.id = 'mwAuth';
    wrap.setAttribute('role', 'dialog'); wrap.setAttribute('aria-modal', 'true'); wrap.setAttribute('aria-labelledby', 'mwAuthTitle');
    wrap.innerHTML = `
      <form class="card stack" novalidate>
        <div class="brand"><b>Mealwise</b><span>Your Nigerian Food Diary</span></div>
        <h2 id="mwAuthTitle">Sign in</h2>
        <p class="muted small" id="mwAuthLead">Your meals are stored privately in your account and sync across your devices.</p>
        <label class="f" for="mwEmail">Email<input id="mwEmail" type="email" autocomplete="email" inputmode="email" required></label>
        <label class="f" for="mwPass">Password<input id="mwPass" type="password" autocomplete="current-password" minlength="8" required></label>
        <div id="mwMsg" aria-live="polite"></div>
        <button class="btn primary block" type="submit" id="mwGo">Sign in</button>
        <button class="linkbtn" type="button" id="mwToggle">First time here? Create your account</button>
      </form>`;
    document.body.append(wrap);
    const $ = s => wrap.querySelector(s);
    let mode = 'in';
    const say = (t, kind = 'warn') => { const m = $('#mwMsg'); m.replaceChildren(); if (t) { const p = document.createElement('p'); p.className = 'notice ' + kind; p.textContent = t; m.append(p); } };
    if (msg) say(msg);
    $('#mwToggle').onclick = () => {
      mode = mode === 'in' ? 'up' : 'in';
      $('#mwAuthTitle').textContent = mode === 'in' ? 'Sign in' : 'Create your account';
      $('#mwGo').textContent = mode === 'in' ? 'Sign in' : 'Create account';
      $('#mwPass').autocomplete = mode === 'in' ? 'current-password' : 'new-password';
      $('#mwToggle').textContent = mode === 'in' ? 'First time here? Create your account' : 'Already have an account? Sign in';
      say('');
    };
    wrap.querySelector('form').onsubmit = async e => {
      e.preventDefault();
      const email = $('#mwEmail').value.trim().toLowerCase(), password = $('#mwPass').value;
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return say('Enter a valid email address.');
      if (password.length < 8) return say('Use a password of at least 8 characters.');
      $('#mwGo').disabled = true; say('');
      try {
        const res = mode === 'in' ? await authPost('/token?grant_type=password', { email, password }) : await authPost('/signup', { email, password });
        if (res.ok && takeSession(res.j)) {
          const allowed = await checkAllowed();
          if (allowed === false) { saveSession(null); $('#mwGo').disabled = false; return say('This email isn’t set up to use Mealwise.'); }
          wrap.remove(); ready(); return;
        }
        if (mode === 'up' && res.ok) { $('#mwToggle').click(); say('Account created. Open the confirmation email we just sent, tap the link, then come back here and sign in. (The page the link opens may show an error; that’s fine.)', ''); }
        else if (res.status === 400 && /confirm/i.test(JSON.stringify(res.j))) say('Confirm your email first: open the link in the email we sent you, then sign in.');
        else if (res.status === 400 || res.status === 401) say(mode === 'in' ? 'Wrong email or password.' : (res.j.msg || res.j.error_description || 'That account couldn’t be created.'));
        else if (res.status === 429) say('Too many attempts. Wait a minute, then try again.');
        else say('Couldn’t reach the sign-in service. Check your connection.');
      } catch { say('Couldn’t reach the sign-in service. Check your connection.'); }
      $('#mwGo').disabled = false;
    };
    setTimeout(() => $('#mwEmail').focus(), 50);
  }
  (async () => {
    if (session) {
      const ok = await refresh();
      if (ok === null) { ready(); return; }          // offline: keep the stored session
      if (ok) { ready(); return; }
    }
    const start = () => authScreen();
    document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', start) : start();
  })();

  const caps = { db, user, sample, downloads };
  window.claude = { use: async name => { await readyP; return caps[name] || null; } };
})();
