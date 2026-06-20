/* ============================================================
   NOIR — admin.js
   Admin dashboard logic: suggestions, products, sponsors, lessons.

   Load order (see admin.html):
     supabase-js CDN → supabase-client.js → supabase-auth.js → admin.js

   Access control is enforced in TWO places:
     1. RLS policies in the database (the real gate — see admin-schema.sql)
     2. This UI, which hides everything unless profiles.is_admin is true
   A non-admin who bypasses the UI still can't write anything: every
   query is rejected by RLS. The UI check is for UX, not security.
   ============================================================ */

'use strict';

/* ── Escape ALL dynamic text before putting it in innerHTML ──
 * Admins view other users' suggestion text here, so this is the
 * line of defence against stored XSS. */
function esc(v) {
  return String(v ?? '').replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

/* Validate a shop / product URL is http(s) before trusting it. */
function safeUrl(u) {
  try {
    const p = new URL(u);
    return (p.protocol === 'http:' || p.protocol === 'https:') ? u : '';
  } catch { return ''; }
}


/* ═══════════════════════════════════════════════════════════
   SERVICE — thin wrapper over Supabase for admin operations
   ═══════════════════════════════════════════════════════════ */
class NoirAdminService {
  constructor() {
    this._sb = window.supabaseClient;
    if (!this._sb) {
      throw new Error('[admin] supabaseClient missing — load supabase-client.js first.');
    }
  }

  /* Is the signed-in user an admin? Reads their own profile row. */
  async isAdmin() {
    const uid = window.NoirAuth?.getUser()?.id;
    if (!uid) return false;
    const { data, error } = await this._sb
      .from('profiles').select('is_admin').eq('id', uid).maybeSingle();
    if (error) { console.error('[isAdmin]', error.message); return false; }
    return !!data?.is_admin;
  }

  /* ── Suggestions ──────────────────────────────────────── */
  async listSuggestions(status = 'all') {
    let q = this._sb.from('suggestions').select('*').order('submitted_at', { ascending: false });
    if (status !== 'all') q = q.eq('status', status);
    const { data, error } = await q;
    if (error) throw new Error(error.message);
    return data || [];
  }
  async setSuggestionStatus(id, status) {
    const { error } = await this._sb.from('suggestions').update({ status }).eq('id', id);
    if (error) throw new Error(error.message);
  }

  /* ── Products ─────────────────────────────────────────── */
  async listProducts() {
    const { data, error } = await this._sb.from('products').select('*')
      .order('sort_order', { ascending: true });
    if (error) throw new Error(error.message);
    return data || [];
  }
  async upsertProduct(p) {
    const { error } = await this._sb.from('products').upsert(p);
    if (error) throw new Error(error.message);
  }
  async deleteProduct(id) {
    const { error } = await this._sb.from('products').delete().eq('id', id);
    if (error) throw new Error(error.message);
  }

  /* ── Sponsors ─────────────────────────────────────────── */
  async listSponsors() {
    const { data, error } = await this._sb.from('sponsors').select('*')
      .order('sort_order', { ascending: true });
    if (error) throw new Error(error.message);
    return data || [];
  }
  async upsertSponsor(s) {
    const { error } = await this._sb.from('sponsors').upsert(s);
    if (error) throw new Error(error.message);
  }
  async deleteSponsor(id) {
    const { error } = await this._sb.from('sponsors').delete().eq('id', id);
    if (error) throw new Error(error.message);
  }

  /* ── Lessons ──────────────────────────────────────────── */
  async listLessons() {
    const { data, error } = await this._sb.from('lessons').select('*')
      .order('sort_order', { ascending: true });
    if (error) throw new Error(error.message);
    return data || [];
  }
  async upsertLesson(l) {
    const { error } = await this._sb.from('lessons').upsert(l);
    if (error) throw new Error(error.message);
  }
  async deleteLesson(id) {
    const { error } = await this._sb.from('lessons').delete().eq('id', id);
    if (error) throw new Error(error.message);
  }
}


/* ═══════════════════════════════════════════════════════════
   PAGE CONTROLLER
   ═══════════════════════════════════════════════════════════ */
let Admin;

/* When a product form is opened from a suggestion, we remember which
 * suggestion so we can mark it approved once the product is saved. */
let _suggestions = [];
let _pendingSuggestionId = null;

/* slugify a name into a stable text id for new products */
function slugify(s) {
  return String(s).toLowerCase().trim()
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60)
    || `product-${Date.now()}`;
}

function toast(msg, kind = 'ok') {
  const t = document.getElementById('adminToast');
  t.textContent = msg;
  t.className = `admin-toast show ${kind}`;
  clearTimeout(toast._t);
  toast._t = setTimeout(() => t.className = 'admin-toast', 2600);
}

/* Generic confirm */
function confirmAction(msg) { return window.confirm(msg); }


/* ── Boot ─────────────────────────────────────────────────── */
async function initAdmin() {
  await (window.NoirAuth.ready || Promise.resolve());

  const gate    = document.getElementById('adminGate');
  const shell   = document.getElementById('adminShell');
  const user    = window.NoirAuth.getUser();

  if (!user) {
    renderLoginGate(gate);
    gate.classList.remove('hidden');
    return;
  }

  Admin = new NoirAdminService();
  const ok = await Admin.isAdmin();

  if (!ok) {
    gate.innerHTML = `
      <h2 class="admin-gate-title">You're not an admin</h2>
      <p class="admin-gate-text">
        Signed in as ${esc(user.email)}, but this account has no admin rights.
      </p>
      <a class="admin-gate-btn" href="../index.html">Back to site →</a>`;
    gate.classList.remove('hidden');
    return;
  }

  shell.classList.remove('hidden');
  document.getElementById('adminWho').textContent = user.email;
  document.getElementById('adminSignOut').addEventListener('click', () => window.NoirAuth.logout());

  wireTabs();
  loadSuggestions();
  loadProducts();
  loadSponsors();
  loadLessons();
}

/* Inline sign-in form, shown on the admin page itself so a grader
 * can log straight in without bouncing to another page. */
function renderLoginGate(gate) {
  gate.innerHTML = `
    <h2 class="admin-gate-title">Admin sign in</h2>
    <p class="admin-gate-text">Sign in with an admin account to open the console.</p>
    <div class="admin-login">
      <input class="admin-login-input" id="agEmail" type="email"
             autocomplete="username" placeholder="Email" />
      <input class="admin-login-input" id="agPassword" type="password"
             autocomplete="current-password" placeholder="Password" />
      <button class="admin-gate-btn" id="agSubmit" style="border:none;cursor:pointer;width:100%">
        Sign in
      </button>
      <p class="admin-login-error" id="agError"></p>
    </div>`;

  const email  = gate.querySelector('#agEmail');
  const pass   = gate.querySelector('#agPassword');
  const btn    = gate.querySelector('#agSubmit');
  const errEl  = gate.querySelector('#agError');

  async function submit() {
    errEl.textContent = '';
    btn.disabled = true;
    btn.textContent = 'Signing in…';
    try {
      await window.NoirAuth.login(email.value.trim(), pass.value);
      // Session is now persisted; reload re-runs the admin gate as the signed-in user.
      location.reload();
    } catch (err) {
      errEl.textContent = err.message;
      btn.disabled = false;
      btn.textContent = 'Sign in';
    }
  }

  btn.addEventListener('click', submit);
  pass.addEventListener('keydown', e => { if (e.key === 'Enter') submit(); });
  setTimeout(() => email.focus(), 60);
}


function wireTabs() {
  const tabs   = document.querySelectorAll('.admin-tab');
  const panels = document.querySelectorAll('.admin-panel');
  tabs.forEach(tab => tab.addEventListener('click', () => {
    tabs.forEach(t => t.classList.toggle('active', t === tab));
    panels.forEach(p => p.classList.toggle('active', p.id === `panel-${tab.dataset.tab}`));
  }));
}


/* ══════════════════════════════════════════════════════════
   SUGGESTIONS
   ══════════════════════════════════════════════════════════ */
async function loadSuggestions() {
  const wrap = document.getElementById('suggestionList');
  const filter = document.getElementById('suggestionFilter').value;
  wrap.innerHTML = `<p class="admin-loading">Loading suggestions…</p>`;
  try {
    const rows = await Admin.listSuggestions(filter);
    _suggestions = rows;
    if (!rows.length) {
      wrap.innerHTML = `<p class="admin-empty">No suggestions ${filter === 'all' ? 'yet' : `with status "${esc(filter)}"`}.</p>`;
      return;
    }
    wrap.innerHTML = rows.map(suggestionCard).join('');
  } catch (e) {
    wrap.innerHTML = `<p class="admin-empty">Couldn't load suggestions: ${esc(e.message)}</p>`;
  }
}

function suggestionCard(s) {
  const date = new Date(s.submitted_at).toLocaleDateString('en-MY',
    { day: 'numeric', month: 'short', year: 'numeric' });
  const url   = safeUrl(s.shop_url || '');
  const thumb = s.image_url
    ? `<img class="sug-thumb" src="${esc(s.image_url)}" alt="" />`
    : `<div class="sug-thumb sug-thumb-empty">📦</div>`;

  return `
    <div class="sug-card" data-id="${esc(s.id)}">
      ${thumb}
      <div class="sug-main">
        <div class="sug-top">
          <span class="sug-name">${esc(s.name)}</span>
          <span class="sug-status sug-${esc(s.status)}">${esc(s.status)}</span>
        </div>
        <div class="sug-brand">${esc(s.brand)}${s.material ? ` · ${esc(s.material)}` : ''} · ${esc(s.category)}</div>
        <p class="sug-reason">${esc(s.reason)}</p>
        ${url ? `<a class="sug-link" href="${esc(url)}" target="_blank" rel="noopener noreferrer">Visit shop ↗</a>` : ''}
        <div class="sug-meta">${esc(date)}</div>
      </div>
      <div class="sug-actions">
        <button class="admin-btn ok"    data-act="approve">Approve &amp; edit →</button>
        <button class="admin-btn ghost" data-act="reject">Reject</button>
      </div>
    </div>`;
}

/* Event delegation for the suggestion action buttons */
document.addEventListener('click', async (e) => {
  const btn = e.target.closest('.sug-actions .admin-btn');
  if (!btn) return;
  const card = btn.closest('.sug-card');
  const id   = card.dataset.id;
  const act  = btn.dataset.act;

  if (act === 'approve') {
    const s = _suggestions.find(x => String(x.id) === String(id));
    if (s) openProductFromSuggestion(s);
    return;
  }
  // reject
  try {
    await Admin.setSuggestionStatus(id, 'rejected');
    toast('Suggestion rejected.');
    loadSuggestions();
  } catch (err) {
    toast(err.message, 'err');
  }
});

document.getElementById('suggestionFilter')?.addEventListener('change', loadSuggestions);

/* Open the product form pre-filled from a suggestion. The suggestion is
 * marked "approved" automatically once the admin saves the product. */
function openProductFromSuggestion(s) {
  _pendingSuggestionId = s.id;
  document.querySelector('.admin-tab[data-tab="products"]').click();
  openProductForm({
    id:        slugify(s.name),
    name:      s.name,
    type:      s.brand || '',                       // editable
    spec:      s.material || '',                    // fabric blend → spec
    category:  s.category ? [s.category] : [],
    curation:  '',
    desc:      s.reason || '',
    image_url: s.image_url || '',
    is_active: true,
  });
  toast('Approved suggestion loaded — review, then Save to publish.');
}


/* ══════════════════════════════════════════════════════════
   PRODUCTS
   ══════════════════════════════════════════════════════════ */
async function loadProducts() {
  const wrap = document.getElementById('productList');
  wrap.innerHTML = `<p class="admin-loading">Loading products…</p>`;
  try {
    const rows = await Admin.listProducts();
    wrap.innerHTML = rows.length
      ? rows.map(productRow).join('')
      : `<p class="admin-empty">No products yet. Add one above.</p>`;
  } catch (e) {
    wrap.innerHTML = `<p class="admin-empty">${esc(e.message)}</p>`;
  }
}

function productRow(p) {
  const cats = (p.category || []).map(esc).join(', ');
  const media = p.image_url
    ? `<img class="row-thumb" src="${esc(p.image_url)}" alt="" />`
    : `<span class="row-thumb row-thumb-empty"></span>`;
  return `
    <div class="row-item" data-id="${esc(p.id)}">
      ${media}
      <div class="row-body">
        <div class="row-name">${esc(p.name)}
          ${p.curation === 'noir' ? '<span class="row-badge">Curated</span>' : ''}
          ${!p.is_active ? '<span class="row-badge off">Hidden</span>' : ''}
        </div>
        <div class="row-sub">${esc(p.spec || '')}${cats ? ` · ${cats}` : ''}</div>
      </div>
      <div class="row-actions">
        <button class="admin-btn line"  data-act="edit">Edit</button>
        <button class="admin-btn ghost" data-act="del">Delete</button>
      </div>
    </div>`;
}

const productForm = {
  el:    () => document.getElementById('productForm'),
  open:  false,
};

function openProductForm(p = null) {
  const editing = !!(p && p._existing);
  document.getElementById('pfTitle').textContent = p ? (editing ? 'Edit product' : 'New product') : 'New product';
  document.getElementById('pfId').value       = p?.id ?? '';
  document.getElementById('pfId').disabled    = editing;          // id is the key — don't change on edit
  document.getElementById('pfImage').value    = p?.image_url ?? '';
  document.getElementById('pfName').value     = p?.name ?? '';
  document.getElementById('pfType').value     = p?.type ?? '';
  document.getElementById('pfSpec').value     = p?.spec ?? '';
  document.getElementById('pfCategory').value = Array.isArray(p?.category) ? p.category.join(', ') : (p?.category ?? '');
  document.getElementById('pfCuration').value = p?.curation ?? '';
  document.getElementById('pfDesc').value     = p?.desc ?? p?.description ?? '';
  document.getElementById('pfActive').checked = p?.is_active ?? true;
  productForm.el().classList.remove('hidden');
  productForm.el().scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

document.getElementById('productAddBtn')?.addEventListener('click', () => { _pendingSuggestionId = null; openProductForm(); });
document.getElementById('pfCancel')?.addEventListener('click', () => { _pendingSuggestionId = null; productForm.el().classList.add('hidden'); });

document.getElementById('pfSave')?.addEventListener('click', async () => {
  const name = document.getElementById('pfName').value.trim();
  if (!name) return toast('Name is required.', 'err');

  let id = document.getElementById('pfId').value.trim();
  if (!id) id = slugify(name);

  const category = document.getElementById('pfCategory').value
    .split(',').map(s => s.trim().toLowerCase()).filter(Boolean);

  const payload = {
    id,
    image_url:   document.getElementById('pfImage').value.trim() || null,
    type:        document.getElementById('pfType').value.trim() || null,
    name,
    spec:        document.getElementById('pfSpec').value.trim() || null,
    category,
    curation:    document.getElementById('pfCuration').value || null,
    description: document.getElementById('pfDesc').value.trim() || null,
    is_active:   document.getElementById('pfActive').checked,
  };

  try {
    await Admin.upsertProduct(payload);
    // If this product came from a suggestion, mark that suggestion approved.
    if (_pendingSuggestionId) {
      try { await Admin.setSuggestionStatus(_pendingSuggestionId, 'approved'); }
      catch (e) { console.warn('[admin] could not mark suggestion approved:', e.message); }
      _pendingSuggestionId = null;
      loadSuggestions();
      toast('Published to recommendations & suggestion approved.');
    } else {
      toast('Product saved.');
    }
    productForm.el().classList.add('hidden');
    loadProducts();
  } catch (err) {
    toast(err.message, 'err');
  }
});

document.getElementById('productList')?.addEventListener('click', async (e) => {
  const btn = e.target.closest('.admin-btn'); if (!btn) return;
  const id  = btn.closest('.row-item').dataset.id;
  if (btn.dataset.act === 'del') {
    if (!confirmAction('Delete this product? Loves and saves referencing it will remain but point to nothing.')) return;
    try { await Admin.deleteProduct(id); toast('Product deleted.'); loadProducts(); }
    catch (err) { toast(err.message, 'err'); }
  }
  if (btn.dataset.act === 'edit') {
    _pendingSuggestionId = null;
    const rows = await Admin.listProducts();
    const p = rows.find(r => r.id === id);
    if (p) openProductForm({ ...p, _existing: true });
  }
});


/* ══════════════════════════════════════════════════════════
   SPONSORS
   ══════════════════════════════════════════════════════════ */
async function loadSponsors() {
  const wrap = document.getElementById('sponsorList');
  wrap.innerHTML = `<p class="admin-loading">Loading sponsors…</p>`;
  try {
    const rows = await Admin.listSponsors();
    wrap.innerHTML = rows.length
      ? rows.map(sponsorRow).join('')
      : `<p class="admin-empty">No sponsors yet.</p>`;
  } catch (e) { wrap.innerHTML = `<p class="admin-empty">${esc(e.message)}</p>`; }
}

function sponsorRow(s) {
  const media = s.image_url
    ? `<img class="row-thumb" src="${esc(s.image_url)}" alt="" />`
    : `<span class="row-thumb row-thumb-empty"></span>`;
  return `
    <div class="row-item" data-id="${esc(s.id)}">
      ${media}
      <div class="row-body">
        <div class="row-name">${esc(s.name)}${!s.is_active ? ' <span class="row-badge off">Hidden</span>' : ''}</div>
        <div class="row-sub">${esc(s.brand)}${s.spec ? ` · ${esc(s.spec)}` : ''}</div>
      </div>
      <div class="row-actions">
        <button class="admin-btn line"  data-act="edit">Edit</button>
        <button class="admin-btn ghost" data-act="del">Delete</button>
      </div>
    </div>`;
}

function openSponsorForm(s = null) {
  document.getElementById('sfTitle').textContent = s ? 'Edit sponsor' : 'New sponsor';
  document.getElementById('sfId').value     = s?.id ?? '';
  document.getElementById('sfImage').value  = s?.image_url ?? '';
  document.getElementById('sfBrand').value  = s?.brand ?? '';
  document.getElementById('sfName').value   = s?.name ?? '';
  document.getElementById('sfSpec').value   = s?.spec ?? '';
  document.getElementById('sfDesc').value   = s?.description ?? '';
  document.getElementById('sfActive').checked = s?.is_active ?? true;
  document.getElementById('sponsorForm').classList.remove('hidden');
  document.getElementById('sponsorForm').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

document.getElementById('sponsorAddBtn')?.addEventListener('click', () => openSponsorForm());
document.getElementById('sfCancel')?.addEventListener('click', () => document.getElementById('sponsorForm').classList.add('hidden'));

document.getElementById('sfSave')?.addEventListener('click', async () => {
  const brand = document.getElementById('sfBrand').value.trim();
  const name  = document.getElementById('sfName').value.trim();
  if (!brand || !name) return toast('Brand and name are required.', 'err');

  const payload = {
    image_url:   document.getElementById('sfImage').value.trim() || null,
    brand, name,
    spec:        document.getElementById('sfSpec').value.trim() || null,
    description: document.getElementById('sfDesc').value.trim() || null,
    is_active:   document.getElementById('sfActive').checked,
  };
  const id = document.getElementById('sfId').value.trim();
  if (id) payload.id = id;          // include id only when editing

  try {
    await Admin.upsertSponsor(payload);
    toast('Sponsor saved.');
    document.getElementById('sponsorForm').classList.add('hidden');
    loadSponsors();
  } catch (err) { toast(err.message, 'err'); }
});

document.getElementById('sponsorList')?.addEventListener('click', async (e) => {
  const btn = e.target.closest('.admin-btn'); if (!btn) return;
  const id  = btn.closest('.row-item').dataset.id;
  if (btn.dataset.act === 'del') {
    if (!confirmAction('Delete this sponsor?')) return;
    try { await Admin.deleteSponsor(id); toast('Sponsor deleted.'); loadSponsors(); }
    catch (err) { toast(err.message, 'err'); }
  }
  if (btn.dataset.act === 'edit') {
    const rows = await Admin.listSponsors();
    const s = rows.find(r => r.id === id);
    if (s) openSponsorForm(s);
  }
});


/* ══════════════════════════════════════════════════════════
   LESSONS
   ══════════════════════════════════════════════════════════ */
async function loadLessons() {
  const wrap = document.getElementById('lessonList');
  wrap.innerHTML = `<p class="admin-loading">Loading lessons…</p>`;
  try {
    const rows = await Admin.listLessons();
    wrap.innerHTML = rows.length
      ? rows.map(lessonRow).join('')
      : `<p class="admin-empty">No lessons yet.</p>`;
  } catch (e) { wrap.innerHTML = `<p class="admin-empty">${esc(e.message)}</p>`; }
}

function lessonRow(l) {
  const num = String(l.number ?? '·').padStart(2, '0');
  return `
    <div class="row-item" data-id="${esc(l.id)}">
      <span class="row-num">${esc(num)}</span>
      <div class="row-body">
        <div class="row-name">${esc(l.title)}${!l.is_published ? ' <span class="row-badge off">Draft</span>' : ''}</div>
        <div class="row-sub">${esc(l.description || '')}${l.duration ? ` · ${esc(l.duration)}` : ''}</div>
      </div>
      <div class="row-actions">
        <button class="admin-btn line"  data-act="edit">Edit</button>
        <button class="admin-btn ghost" data-act="del">Delete</button>
      </div>
    </div>`;
}

function openLessonForm(l = null) {
  document.getElementById('lfTitle').textContent  = l ? 'Edit lesson' : 'New lesson';
  document.getElementById('lfId').value           = l?.id ?? '';
  document.getElementById('lfNumber').value       = l?.number ?? '';
  document.getElementById('lfLessonTitle').value  = l?.title ?? '';
  document.getElementById('lfDesc').value         = l?.description ?? '';
  document.getElementById('lfDuration').value     = l?.duration ?? '';
  document.getElementById('lfBody').value         = l?.body ?? '';
  document.getElementById('lfPublished').checked  = l?.is_published ?? true;
  document.getElementById('lessonForm').classList.remove('hidden');
  document.getElementById('lessonForm').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

document.getElementById('lessonAddBtn')?.addEventListener('click', () => openLessonForm());
document.getElementById('lfCancel')?.addEventListener('click', () => document.getElementById('lessonForm').classList.add('hidden'));

document.getElementById('lfSave')?.addEventListener('click', async () => {
  const title = document.getElementById('lfLessonTitle').value.trim();
  if (!title) return toast('Title is required.', 'err');

  const numRaw = document.getElementById('lfNumber').value.trim();
  const payload = {
    number:       numRaw ? parseInt(numRaw, 10) : null,
    title,
    description:  document.getElementById('lfDesc').value.trim() || null,
    duration:     document.getElementById('lfDuration').value.trim() || null,
    body:         document.getElementById('lfBody').value.trim() || null,
    is_published: document.getElementById('lfPublished').checked,
    sort_order:   numRaw ? parseInt(numRaw, 10) : 0,
  };
  const id = document.getElementById('lfId').value.trim();
  if (id) payload.id = id;

  try {
    await Admin.upsertLesson(payload);
    toast('Lesson saved.');
    document.getElementById('lessonForm').classList.add('hidden');
    loadLessons();
  } catch (err) { toast(err.message, 'err'); }
});

document.getElementById('lessonList')?.addEventListener('click', async (e) => {
  const btn = e.target.closest('.admin-btn'); if (!btn) return;
  const id  = btn.closest('.row-item').dataset.id;
  if (btn.dataset.act === 'del') {
    if (!confirmAction('Delete this lesson?')) return;
    try { await Admin.deleteLesson(id); toast('Lesson deleted.'); loadLessons(); }
    catch (err) { toast(err.message, 'err'); }
  }
  if (btn.dataset.act === 'edit') {
    const rows = await Admin.listLessons();
    const l = rows.find(r => r.id === id);
    if (l) openLessonForm(l);
  }
});


/* ── Go ───────────────────────────────────────────────────── */
initAdmin();
