/* ============================================================
   NOIR — supabase-engagement.js
   Real love/save/suggest engagement via Supabase.

   This is a DROP-IN REPLACEMENT for engagement.js.

   TO ACTIVATE:
   In every HTML page, change:
     <script src="../js/engagement.js"></script>
   to:
     <script src="../js/supabase-engagement.js"></script>

   And ensure load order is:
     <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
     <script src="../js/supabase-client.js"></script>
     <script src="../js/supabase-auth.js"></script>
     <script src="../js/supabase-engagement.js"></script>

   No changes needed in recommendations.html or saved.html.

   ── REQUIRED DATABASE TABLES ──────────────────────────────
   You should have already run the schema with `loves`,
   `saves`, and `suggestions` tables + RLS policies. If not,
   see the SQL block at the bottom of this file's comments.

   ── REQUIRED STORAGE BUCKET (for product photo uploads) ────
   1. Supabase Dashboard → Storage → New Bucket
   2. Name: "suggestion-images"
   3. Public bucket: ON
   4. Add this policy so logged-in users can upload to their
      own folder (Storage → suggestion-images → Policies):

        create policy "Users upload own images" on storage.objects
          for insert with check (
            bucket_id = 'suggestion-images'
            and (storage.foldername(name))[1] = auth.uid()::text
          );

   If the bucket doesn't exist yet, image uploads will throw
   a clear error (caught and shown in the suggest modal) —
   everything else (love, save, suggestions without a photo)
   works fine without it.
   ============================================================ */

'use strict';

/* ── Configurable threshold ─────────────────────────────────
 * Same constant as engagement.js — change this one number to
 * adjust the Community Pick rule site-wide.
 * ─────────────────────────────────────────────────────────── */
const COMMUNITY_THRESHOLD = 5;

const STORAGE_BUCKET = 'suggestion-images';


/* ═══════════════════════════════════════════════════════════
   INTERFACE — identical contract to engagement.js
   ═══════════════════════════════════════════════════════════ */
class EngagementInterface {
  async getLoveState(productId)  { throw Error('Not implemented'); }
  async getSaveState(productId)  { throw Error('Not implemented'); }
  async toggleLove(productId)    { throw Error('Not implemented'); }
  async toggleSave(productId)    { throw Error('Not implemented'); }
  async getSavedIds()            { throw Error('Not implemented'); }
  async submitSuggestion(data)   { throw Error('Not implemented'); }
  async getMySubmissions()       { throw Error('Not implemented'); }
}


/* ═══════════════════════════════════════════════════════════
   SUPABASE IMPLEMENTATION
   ═══════════════════════════════════════════════════════════ */
class SupabaseEngagement extends EngagementInterface {

  constructor() {
    super();
    this._sb = window.supabaseClient;

    if (!this._sb) {
      throw new Error(
        '[SupabaseEngagement] window.supabaseClient is not defined. ' +
        'Make sure supabase-client.js loads before supabase-engagement.js.'
      );
    }
  }

  /* ── Helpers ────────────────────────────────────────────── */
  _userId() {
    return window.NoirAuth?.getUser()?.id ?? null;
  }

  _isPick(count) { return count >= COMMUNITY_THRESHOLD; }

  /* ── getLoveState ───────────────────────────────────────── */
  async getLoveState(productId) {
    // Total love count — readable by anyone (RLS: "Anyone can read loves")
    const { count, error: countErr } = await this._sb
      .from('loves')
      .select('*', { count: 'exact', head: true })
      .eq('product_id', productId);

    if (countErr) {
      console.error('[getLoveState] count error:', countErr.message);
      return { count: 0, loved: false, isCommunityPick: false };
    }

    const total = count || 0;
    let loved = false;

    const uid = this._userId();
    if (uid) {
      const { data, error } = await this._sb
        .from('loves')
        .select('id')
        .eq('user_id', uid)
        .eq('product_id', productId)
        .maybeSingle();

      if (error) console.error('[getLoveState] loved-check error:', error.message);
      loved = !!data;
    }

    return { count: total, loved, isCommunityPick: this._isPick(total) };
  }

  /* ── getSaveState ───────────────────────────────────────── */
  async getSaveState(productId) {
    const uid = this._userId();
    if (!uid) return { saved: false };

    const { data, error } = await this._sb
      .from('saves')
      .select('id')
      .eq('user_id', uid)
      .eq('product_id', productId)
      .maybeSingle();

    if (error) {
      console.error('[getSaveState] error:', error.message);
      return { saved: false };
    }
    return { saved: !!data };
  }

  /* ── toggleLove ─────────────────────────────────────────── */
  async toggleLove(productId) {
    const uid = this._userId();
    if (!uid) throw new Error('Sign in to love products.');

    const { data: existing, error: checkErr } = await this._sb
      .from('loves')
      .select('id')
      .eq('user_id', uid)
      .eq('product_id', productId)
      .maybeSingle();

    if (checkErr) throw new Error(checkErr.message);

    if (existing) {
      const { error } = await this._sb.from('loves').delete().eq('id', existing.id);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await this._sb.from('loves')
        .insert({ user_id: uid, product_id: productId });
      if (error) throw new Error(error.message);
    }

    const { count, error: countErr } = await this._sb
      .from('loves')
      .select('*', { count: 'exact', head: true })
      .eq('product_id', productId);

    if (countErr) throw new Error(countErr.message);

    const total = count || 0;
    return { loved: !existing, count: total, isCommunityPick: this._isPick(total) };
  }

  /* ── toggleSave ─────────────────────────────────────────── */
  async toggleSave(productId) {
    const uid = this._userId();
    if (!uid) throw new Error('Sign in to save products.');

    const { data: existing, error: checkErr } = await this._sb
      .from('saves')
      .select('id')
      .eq('user_id', uid)
      .eq('product_id', productId)
      .maybeSingle();

    if (checkErr) throw new Error(checkErr.message);

    if (existing) {
      const { error } = await this._sb.from('saves').delete().eq('id', existing.id);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await this._sb.from('saves')
        .insert({ user_id: uid, product_id: productId });
      if (error) throw new Error(error.message);
    }

    return { saved: !existing };
  }

  /* ── getSavedIds ────────────────────────────────────────── */
  async getSavedIds() {
    const uid = this._userId();
    if (!uid) return [];

    const { data, error } = await this._sb
      .from('saves')
      .select('product_id')
      .eq('user_id', uid)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[getSavedIds] error:', error.message);
      return [];
    }
    return (data || []).map(r => r.product_id);
  }

  /* ── submitSuggestion ───────────────────────────────────── */
  async submitSuggestion({ name, brand, material = '', category, reason, shopUrl = '', imageData = '' }) {
    const uid = this._userId();
    if (!uid) throw new Error('Sign in to suggest products.');
    if (!name.trim() || !brand.trim() || !category || !reason.trim()) {
      throw new Error('Please fill in all required fields.');
    }

    let imageUrl = null;

    /*
     * If an image was attached (base64 data URL from FileReader),
     * upload it to the "suggestion-images" Storage bucket and
     * use the resulting public URL instead of storing the
     * base64 string in the database.
     */
    if (imageData) {
      if (!/^data:image\/(png|jpeg);base64,/.test(imageData)) {
        throw new Error('Product photo must be a PNG or JPG image.');
      }

      try {
        const blob = await (await fetch(imageData)).blob();
        const ext  = blob.type === 'image/png' ? 'png' : 'jpg';
        const path = `${uid}/${Date.now()}.${ext}`;

        const { error: upErr } = await this._sb.storage
          .from(STORAGE_BUCKET)
          .upload(path, blob, { contentType: blob.type });

        if (upErr) {
          throw new Error(`Image upload failed: ${upErr.message}`);
        }

        const { data: urlData } = this._sb.storage
          .from(STORAGE_BUCKET)
          .getPublicUrl(path);

        imageUrl = urlData.publicUrl;
      } catch (err) {
        // Surface a clear error but don't lose the rest of the
        // submission — re-throw so the form shows it and the
        // user can retry (e.g. without the image, or after the
        // bucket is created).
        throw err;
      }
    }

    const { data, error } = await this._sb
      .from('suggestions')
      .insert({
        user_id:   uid,
        name:      name.trim(),
        brand:     brand.trim(),
        material:  material.trim() || null,
        category,
        reason:    reason.trim(),
        shop_url:  shopUrl.trim() || null,
        image_url: imageUrl,
      })
      .select()
      .single();

    if (error) throw new Error(error.message);

    // Map snake_case DB columns back to the camelCase shape
    // used throughout the UI (matches MockEngagement's output)
    return _toSuggestion(data);
  }

  /* ── getMySubmissions ───────────────────────────────────── */
  async getMySubmissions() {
    const uid = this._userId();
    if (!uid) return [];

    const { data, error } = await this._sb
      .from('suggestions')
      .select('*')
      .eq('user_id', uid)
      .order('submitted_at', { ascending: false });

    if (error) {
      console.error('[getMySubmissions] error:', error.message);
      return [];
    }
    return (data || []).map(_toSuggestion);
  }
}


/*
 * Convert a Supabase suggestions row (snake_case) into the
 * camelCase shape used by buildSuggestionRow() in saved.html.
 *
 * Note: `imageData` here holds a public Storage URL (not a
 * base64 string) — but buildSuggestionRow() uses it the same
 * way either way: <img src="${s.imageData}">, since both a
 * base64 data URL and an https:// URL work as an <img> src.
 */
function _toSuggestion(row) {
  return {
    id:          row.id,
    userId:      row.user_id,
    name:        row.name,
    brand:       row.brand,
    material:    row.material || '',
    category:    row.category,
    reason:      row.reason,
    shopUrl:     row.shop_url || '',
    imageData:   row.image_url || '',
    submittedAt: row.submitted_at,
    status:      row.status,
  };
}


/* ═══════════════════════════════════════════════════════════
   ACTIVE SINGLETON
   ═══════════════════════════════════════════════════════════ */
window.NoirEngage = new SupabaseEngagement();


/* ═══════════════════════════════════════════════════════════
   REFERENCE: full database schema (already run if you followed
   the earlier setup guide). Included here for completeness.
   ═══════════════════════════════════════════════════════════

create table loves (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users(id) on delete cascade,
  product_id  text not null,
  created_at  timestamptz default now(),
  unique(user_id, product_id)
);

create table saves (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users(id) on delete cascade,
  product_id  text not null,
  created_at  timestamptz default now(),
  unique(user_id, product_id)
);

create table suggestions (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid references auth.users(id) on delete cascade,
  name         text not null,
  brand        text not null,
  material     text,
  category     text not null,
  reason       text not null,
  shop_url     text,
  image_url    text,
  submitted_at timestamptz default now(),
  status       text default 'pending'
);

alter table loves enable row level security;
alter table saves enable row level security;
alter table suggestions enable row level security;

create policy "Users manage own loves" on loves
  for all using (auth.uid() = user_id);

create policy "Users manage own saves" on saves
  for all using (auth.uid() = user_id);

create policy "Users manage own suggestions" on suggestions
  for all using (auth.uid() = user_id);

create policy "Anyone can read loves" on loves
  for select using (true);

   ═══════════════════════════════════════════════════════════ */
