/* ============================================================
   NOIR — engagement.js
   Love & Save system for product recommendations

   ARCHITECTURE
   ─────────────────────────────────────────────────────────────
   Same pattern as auth.js — interface → mock → singleton.

     EngagementInterface   public contract (5 methods)
           ↑ implemented by
     MockEngagement        localStorage, seeded demo data
           ↓ exposed as
     window.NoirEngage     used by recommendations.html

   COMMUNITY PICK BADGE — how it works
   ─────────────────────────────────────────────────────────────
   Every product has a love count stored in localStorage.
   When that count reaches COMMUNITY_THRESHOLD the badge is
   rendered automatically — no manual assignment needed.

   Threshold is one constant at the top of this file.
   Change it once; everything updates automatically.

   Badge rule:
     loves[productId].count >= COMMUNITY_THRESHOLD  →  badge on
     loves[productId].count <  COMMUNITY_THRESHOLD  →  badge off

   The badge can coexist with the manual "✦ Curated by Noir"
   badge — they stack vertically in the card image corner.

   UPGRADING TO SUPABASE
   ─────────────────────────────────────────────────────────────
   Create supabase-engagement.js:

     const _sb = supabase.createClient(URL, KEY);   // reuse client

     class SupabaseEngagement extends EngagementInterface {

       // Loves table schema:
       //   loves(id, user_id, product_id, created_at)
       // Saves table schema:
       //   saves(id, user_id, product_id, created_at)

       async toggleLove(productId) {
         const user = window.NoirAuth.getUser();
         // Check if row exists
         const { data } = await _sb.from('loves')
           .select('id').eq('user_id', user.id).eq('product_id', productId).single();
         if (data) {
           await _sb.from('loves').delete().eq('id', data.id);
         } else {
           await _sb.from('loves').insert({ user_id: user.id, product_id: productId });
         }
         // Get new count
         const { count } = await _sb.from('loves')
           .select('*', { count: 'exact', head: true }).eq('product_id', productId);
         return { loved: !data, count, isCommunityPick: count >= COMMUNITY_THRESHOLD };
       }

       async toggleSave(productId) {
         const user = window.NoirAuth.getUser();
         const { data } = await _sb.from('saves')
           .select('id').eq('user_id', user.id).eq('product_id', productId).single();
         if (data) { await _sb.from('saves').delete().eq('id', data.id); }
         else { await _sb.from('saves').insert({ user_id: user.id, product_id: productId }); }
         return { saved: !data };
       }

       // getLoveState / getSaveState: SELECT + count from Supabase
       // getSavedIds: SELECT product_id WHERE user_id = current user
     }
     window.NoirEngage = new SupabaseEngagement();

   Replace engagement.js with supabase-engagement.js in HTML.
   recommendations.html needs zero other changes.

   STORAGE KEYS (mock only)
   ─────────────────────────────────────────────────────────────
   'noir_loves'    → { [productId]: { count, lovedBy: [userId, …] } }
   'noir_saves'    → { [userId]:    [productId, …] }
   'noir_seeded'   → 'yes'  (prevents re-seeding on reload)
   ============================================================ */

'use strict';

/* ── Configurable threshold ─────────────────────────────────
 * Change this one number to adjust the Community Pick rule
 * site-wide. Recommended values:
 *   3–5   for demo / small community (badges appear quickly)
 *   20+   for a live platform       (badge is genuinely earned)
 * ─────────────────────────────────────────────────────────── */
const COMMUNITY_THRESHOLD = 5;

/* ── Storage keys ─────────────────────────────────────────── */
const _LOVES_KEY       = 'noir_loves';
const _SAVES_KEY       = 'noir_saves';
const _SUGGESTIONS_KEY = 'noir_suggestions';
const _SEEDED_KEY      = 'noir_seeded';

/* ── Demo seed data ─────────────────────────────────────────
 * Pre-populates realistic love counts so the demo looks alive.
 * Seed user IDs ('_s1' … '_s7') are fake and will never match
 * a real user, so real users can love seeded products normally.
 *
 * On first page load:
 *   classic-poly-tee       → 7 loves  ✓ already Community Pick
 *   bamboo-flow-tank       → 4 loves  (one love away — good demo)
 *   tencel-everyday-active → 3 loves  (building momentum)
 *   nylon-trail-shirt      → 2 loves
 *   others                 → 0 loves
 * ─────────────────────────────────────────────────────────── */
const _SEED = {
  'classic-poly-tee':       { count: 7, lovedBy: ['_s1','_s2','_s3','_s4','_s5','_s6','_s7'] },
  'bamboo-flow-tank':       { count: 4, lovedBy: ['_s1','_s2','_s3','_s4'] },
  'tencel-everyday-active': { count: 3, lovedBy: ['_s1','_s2','_s3'] },
  'nylon-trail-shirt':      { count: 2, lovedBy: ['_s1','_s2'] },
};


/* ═══════════════════════════════════════════════════════════
   INTERFACE
   ═══════════════════════════════════════════════════════════ */
class EngagementInterface {
  /*
   * NOTE ON ASYNC:
   * Every method here is declared `async` — including in the
   * Mock implementation — even though localStorage access is
   * synchronous. This makes every call site use `await`
   * consistently, so swapping in SupabaseEngagement (whose
   * methods genuinely are async network calls) requires zero
   * changes to recommendations.html or saved.html.
   */

  /**
   * @returns {Promise<{ count: number, loved: boolean, isCommunityPick: boolean }>}
   */
  async getLoveState(productId)  { throw Error('Not implemented'); }

  /**
   * @returns {Promise<{ saved: boolean }>}
   */
  async getSaveState(productId)  { throw Error('Not implemented'); }

  /**
   * Toggle love for the signed-in user.
   * Throws if called while not authenticated.
   * @returns {Promise<{ loved: boolean, count: number, isCommunityPick: boolean }>}
   */
  async toggleLove(productId)    { throw Error('Not implemented'); }

  /**
   * Toggle save/bookmark for the signed-in user.
   * Throws if called while not authenticated.
   * @returns {Promise<{ saved: boolean }>}
   */
  async toggleSave(productId)    { throw Error('Not implemented'); }

  /**
   * All product IDs saved by the current user.
   * @returns {Promise<string[]>}
   */
  async getSavedIds()            { throw Error('Not implemented'); }

  /**
   * Submit a product suggestion for the Noir team to review.
   * Throws if not authenticated or required fields are missing.
   *
   * @param {{ name: string, brand: string, material: string,
   *           category: string, reason: string,
   *           shopUrl?: string, imageData?: string }} data
   *
   *   shopUrl    — link to where the product can be bought (optional)
   *   imageData  — base64 data URL from FileReader, PNG/JPG, max 4MB (optional)
   *
   * @returns {Promise<Suggestion>} — the saved suggestion object
   *
   * Suggestion shape:
   *   { id, userId, name, brand, material, category,
   *     reason, shopUrl, imageData, submittedAt, status }
   *
   * status is always 'pending' on creation.
   * The Noir team changes it to 'approved' or 'rejected'.
   *
   * ── IMAGE STORAGE NOTE ────────────────────────────────────
   * The mock stores the image as a base64 data URL directly in
   * localStorage. This is fine for a demo but NOT for production —
   * base64 strings are ~33% larger than the original file and bloat
   * the database. See the Supabase upgrade notes below for the
   * correct approach using Supabase Storage.
   *
   * TO UPGRADE TO SUPABASE:
   *   async submitSuggestion(data) {
   *     const user = window.NoirAuth.getUser();
   *     let imageUrl = null;
   *
   *     // If an image was attached, upload it to Storage first
   *     if (data.imageData) {
   *       const blob = await (await fetch(data.imageData)).blob();
   *       const ext  = blob.type === 'image/png' ? 'png' : 'jpg';
   *       const path = `${user.id}/${Date.now()}.${ext}`;
   *
   *       const { error: upErr } = await _sb.storage
   *         .from('suggestion-images')
   *         .upload(path, blob, { contentType: blob.type });
   *       if (upErr) throw new Error(upErr.message);
   *
   *       const { data: urlData } = _sb.storage
   *         .from('suggestion-images')
   *         .getPublicUrl(path);
   *       imageUrl = urlData.publicUrl;
   *     }
   *
   *     const { data: row, error } = await _sb.from('suggestions').insert({
   *       user_id:   user.id,
   *       name:      data.name,
   *       brand:     data.brand,
   *       material:  data.material,
   *       category:  data.category,
   *       reason:    data.reason,
   *       shop_url:  data.shopUrl || null,
   *       image_url: imageUrl,
   *     }).select().single();
   *     if (error) throw new Error(error.message);
   *     return row;
   *   }
   *
   * Supabase table (run once in SQL Editor):
   *   create table suggestions (
   *     id           uuid primary key default gen_random_uuid(),
   *     user_id      uuid references auth.users(id) on delete cascade,
   *     name         text not null,
   *     brand        text not null,
   *     material     text,
   *     category     text not null,
   *     reason       text not null,
   *     shop_url     text,
   *     image_url    text,
   *     submitted_at timestamptz default now(),
   *     status       text default 'pending'
   *   );
   *   alter table suggestions enable row level security;
   *   create policy "Users manage own suggestions" on suggestions
   *     for all using (auth.uid() = user_id);
   *
   * Storage bucket setup (one-time, in Dashboard → Storage):
   *   1. Create bucket named "suggestion-images"
   *   2. Set it to Public (or add a SELECT policy for public read)
   *   3. Add an INSERT policy so authenticated users can upload:
   *        create policy "Users upload own images" on storage.objects
   *          for insert with check (
   *            bucket_id = 'suggestion-images'
   *            and (storage.foldername(name))[1] = auth.uid()::text
   *          );
   */
  async submitSuggestion(data)   { throw Error('Not implemented'); }

  /**
   * All suggestions submitted by the current user, newest first.
   * @returns {Promise<Suggestion[]>}
   *
   * TO UPGRADE TO SUPABASE:
   *   async getMySubmissions() {
   *     const user = window.NoirAuth.getUser();
   *     const { data, error } = await _sb.from('suggestions')
   *       .select('*')
   *       .eq('user_id', user.id)
   *       .order('submitted_at', { ascending: false });
   *     if (error) throw new Error(error.message);
   *     return data || [];
   *   }
   */
  async getMySubmissions()       { throw Error('Not implemented'); }
}


/* ═══════════════════════════════════════════════════════════
   MOCK IMPLEMENTATION — localStorage
   ═══════════════════════════════════════════════════════════ */
class MockEngagement extends EngagementInterface {

  constructor() {
    super();
    if (!localStorage.getItem(_SEEDED_KEY)) {
      localStorage.setItem(_LOVES_KEY, JSON.stringify(_SEED));
      localStorage.setItem(_SEEDED_KEY, 'yes');
    }
  }

  /* ── Helpers ────────────────────────────────────────────── */
  _loves() {
    try { return JSON.parse(localStorage.getItem(_LOVES_KEY) || '{}'); }
    catch { return {}; }
  }
  _saveLoves(data) { localStorage.setItem(_LOVES_KEY, JSON.stringify(data)); }

  _saves() {
    try { return JSON.parse(localStorage.getItem(_SAVES_KEY) || '{}'); }
    catch { return {}; }
  }
  _saveSaves(data) { localStorage.setItem(_SAVES_KEY, JSON.stringify(data)); }

  _suggestions() {
    try { return JSON.parse(localStorage.getItem(_SUGGESTIONS_KEY) || '[]'); }
    catch { return []; }
  }
  _saveSuggestions(data) { localStorage.setItem(_SUGGESTIONS_KEY, JSON.stringify(data)); }

  _userId() {
    return window.NoirAuth?.getUser()?.id ?? null;
  }

  /* Single source of truth for the Community Pick rule */
  _isPick(count) { return count >= COMMUNITY_THRESHOLD; }

  /* ── getLoveState ───────────────────────────────────────── */
  async getLoveState(productId) {
    const entry  = this._loves()[productId] || { count: 0, lovedBy: [] };
    const uid    = this._userId();
    const loved  = uid ? entry.lovedBy.includes(uid) : false;
    return { count: entry.count, loved, isCommunityPick: this._isPick(entry.count) };
  }

  /* ── getSaveState ───────────────────────────────────────── */
  async getSaveState(productId) {
    const uid = this._userId();
    if (!uid) return { saved: false };
    return { saved: (this._saves()[uid] || []).includes(productId) };
  }

  /* ── toggleLove ─────────────────────────────────────────── */
  async toggleLove(productId) {
    const uid = this._userId();
    if (!uid) throw new Error('Sign in to love products.');

    const loves = this._loves();
    const entry = loves[productId] || { count: 0, lovedBy: [] };
    const wasLoved = entry.lovedBy.includes(uid);

    if (wasLoved) {
      entry.lovedBy = entry.lovedBy.filter(id => id !== uid);
      entry.count   = Math.max(0, entry.count - 1);
    } else {
      entry.lovedBy.push(uid);
      entry.count += 1;
    }

    loves[productId] = entry;
    this._saveLoves(loves);

    return { loved: !wasLoved, count: entry.count, isCommunityPick: this._isPick(entry.count) };
  }

  /* ── toggleSave ─────────────────────────────────────────── */
  async toggleSave(productId) {
    const uid = this._userId();
    if (!uid) throw new Error('Sign in to save products.');

    const saves = this._saves();
    const list  = saves[uid] || [];
    const wasSaved = list.includes(productId);

    saves[uid] = wasSaved
      ? list.filter(id => id !== productId)
      : [...list, productId];

    this._saveSaves(saves);
    return { saved: !wasSaved };
  }

  /* ── getSavedIds ────────────────────────────────────────── */
  async getSavedIds() {
    const uid = this._userId();
    if (!uid) return [];
    return this._saves()[uid] || [];
  }

  /* ── submitSuggestion ───────────────────────────────────── */
  async submitSuggestion({ name, brand, material = '', category, reason, shopUrl = '', imageData = '' }) {
    const uid = this._userId();
    if (!uid) throw new Error('Sign in to suggest products.');
    if (!name.trim() || !brand.trim() || !category || !reason.trim()) {
      throw new Error('Please fill in all required fields.');
    }

    /*
     * Basic shape validation for the optional image data URL.
     * Real size/type checks happen client-side at the file input
     * (recommendations.html) — this is a defensive backstop in
     * case submitSuggestion is ever called directly.
     */
    if (imageData && !/^data:image\/(png|jpeg);base64,/.test(imageData)) {
      throw new Error('Product photo must be a PNG or JPG image.');
    }

    const suggestion = {
      id:          `sug_${Date.now()}`,
      userId:      uid,
      name:        name.trim(),
      brand:       brand.trim(),
      material:    material.trim(),
      category,
      reason:      reason.trim(),
      shopUrl:     shopUrl.trim(),
      /*
       * imageData — base64 data URL (mock only).
       * Supabase upgrade: this becomes `imageUrl`, a public
       * Storage URL, set by submitSuggestion() after uploading
       * the file — see interface comment above for the full flow.
       */
      imageData:   imageData,
      submittedAt: new Date().toISOString(),
      /*
       * status lifecycle (managed by the Noir team):
       *   'pending'  → just submitted, awaiting review
       *   'approved' → added to the curated list
       *   'rejected' → not a fit, user notified
       * In the mock this always stays 'pending'.
       * In Supabase the team updates this column directly.
       */
      status: 'pending',
    };

    this._saveSuggestions([...this._suggestions(), suggestion]);
    return suggestion;
  }

  /* ── getMySubmissions ───────────────────────────────────── */
  async getMySubmissions() {
    const uid = this._userId();
    if (!uid) return [];
    return this._suggestions()
      .filter(s => s.userId === uid)
      .sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt));
  }
}


/* ═══════════════════════════════════════════════════════════
   ACTIVE SINGLETON
   Swap MockEngagement → SupabaseEngagement here only.
   ═══════════════════════════════════════════════════════════ */
window.NoirEngage = new MockEngagement();
