/* ============================================================
   NOIR — auth.js
   Mock Authentication Service

   ARCHITECTURE
   ─────────────────────────────────────────────────────────────
   Three layers, each replaceable independently:

     AuthServiceInterface   defines the public contract
           ↑ implemented by
     MockAuthService        localStorage, simulated delay
           ↓ exposed as
     window.NoirAuth        the one global every page uses

   UPGRADING TO SUPABASE (3 steps, zero other changes)
   ─────────────────────────────────────────────────────────────
   Step 1 — Add Supabase CDN to every HTML page <head>:
     <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>

   Step 2 — Create supabase-auth.js alongside this file:

     const _sb = supabase.createClient(YOUR_URL, YOUR_ANON_KEY);

     class SupabaseAuthService extends AuthServiceInterface {
       constructor() {
         super();
         this._currentUser = null;

         // `ready` resolves once the session has been restored.
         // Page init code does: await window.NoirAuth.ready
         this.ready = _sb.auth.getSession().then(({ data }) => {
           this._currentUser = data.session ? _toPublicUser(data.session.user) : null;
         });

         // Keep _currentUser in sync after the initial load too
         _sb.auth.onAuthStateChange((event, session) => {
           this._currentUser = session ? _toPublicUser(session.user) : null;
           if (event === 'SIGNED_IN')  _dispatch('noir:auth:login',  { user: this._currentUser });
           if (event === 'SIGNED_OUT') _dispatch('noir:auth:logout');
         });
       }
       async login(email, password) {
         const { data, error } = await _sb.auth.signInWithPassword({ email, password });
         if (error) throw new Error(error.message);
         return _toPublicUser(data.user);
       }
       async signup(name, email, password) {
         const { data, error } = await _sb.auth.signUp({
           email, password,
           options: { data: { name, avatar: name[0].toUpperCase() } }
         });
         if (error) throw new Error(error.message);
         return _toPublicUser(data.user);
       }
       async logout() {
         await _sb.auth.signOut();
       }
       getUser() {
         return this._currentUser;
       }
     }
     window.NoirAuth = new SupabaseAuthService();

   Step 3 — Replace auth.js with supabase-auth.js in every HTML <script> tag.
   Done. recommendations.html, profile.html — zero changes needed.

   EVENTS (dispatched on document, caught by page scripts)
   ─────────────────────────────────────────────────────────────
   'noir:auth:login'   → { detail: { user } }
   'noir:auth:signup'  → { detail: { user } }
   'noir:auth:logout'  → { detail: null }

   DEMO ACCOUNT (remove before launch)
   ─────────────────────────────────────────────────────────────
   Email:    demo@noir.com
   Password: demo123
   ============================================================ */

'use strict';

/* ── Storage keys ─────────────────────────────────────────── */
const _CURRENT_KEY  = 'noir_user';      // { id, name, email, avatar, createdAt }
const _REGISTRY_KEY = 'noir_registry';  // [{ ...above + password }]  — mock only

/* ── Seeded demo account ─────────────────────────────────── */
const _DEMO = {
  id: 'demo-001',
  name: 'Demo User',
  email: 'demo@noir.com',
  password: 'demo123',           // plaintext ok for mock; never in production
  avatar: 'D',
  createdAt: '2025-01-01T00:00:00.000Z',
};

/* ── Shared helpers (used by both classes) ────────────────── */
function _dispatch(name, detail = null) {
  document.dispatchEvent(new CustomEvent(name, { detail, bubbles: false }));
}

function _toPublicUser(raw) {
  // Strip password before anything leaves this module
  return { id: raw.id, name: raw.name, email: raw.email,
           avatar: raw.avatar || raw.name[0].toUpperCase(),
           createdAt: raw.createdAt };
}


/* ═══════════════════════════════════════════════════════════
   INTERFACE  — the stable public contract
   Every implementation must provide these five methods.
   Page code calls window.NoirAuth.* and never cares which
   implementation is active underneath.
   ═══════════════════════════════════════════════════════════ */
class AuthServiceInterface {
  /** @returns {Promise<User>} */
  async login(email, password)        { throw Error('Not implemented'); }
  /** @returns {Promise<User>} */
  async signup(name, email, password) { throw Error('Not implemented'); }
  /** @returns {Promise<void>} */
  async logout()                      { throw Error('Not implemented'); }
  /** Sync — must work before first paint. @returns {User|null} */
  getUser()                           { throw Error('Not implemented'); }
  /** @returns {boolean} */
  isAuthenticated()                   { return this.getUser() !== null; }
}


/* ═══════════════════════════════════════════════════════════
   MOCK IMPLEMENTATION — localStorage persistence
   ═══════════════════════════════════════════════════════════ */
class MockAuthService extends AuthServiceInterface {

  constructor() {
    super();
    // Guarantee demo account always exists
    const reg = this._registry();
    if (!reg.find(u => u.email === _DEMO.email)) {
      this._saveRegistry([...reg, _DEMO]);
    }

    /*
     * `ready` — resolves once the auth state is known and safe
     * to read via getUser(). Mock storage is synchronous, so
     * this resolves immediately.
     *
     * SupabaseAuthService MUST also expose this property,
     * resolving after auth.getSession() completes. Page init
     * code awaits `window.NoirAuth.ready` before first render
     * so getUser() never returns a stale `null` on page load.
     */
    this.ready = Promise.resolve();
  }

  /* ── Private helpers ────────────────────────────────────── */
  _registry() {
    try { return JSON.parse(localStorage.getItem(_REGISTRY_KEY) || '[]'); }
    catch { return []; }
  }
  _saveRegistry(arr) {
    localStorage.setItem(_REGISTRY_KEY, JSON.stringify(arr));
  }
  _delay(ms = 450) { return new Promise(r => setTimeout(r, ms)); }

  /* ── login ──────────────────────────────────────────────── */
  async login(email, password) {
    if (!email || !password) throw new Error('Email and password are required.');
    await this._delay();

    const match = this._registry().find(
      u => u.email.toLowerCase() === email.trim().toLowerCase()
        && u.password === password
    );
    if (!match) throw new Error('Incorrect email or password.');

    const user = _toPublicUser(match);
    localStorage.setItem(_CURRENT_KEY, JSON.stringify(user));
    _dispatch('noir:auth:login', { user });
    return user;
  }

  /* ── signup ─────────────────────────────────────────────── */
  async signup(name, email, password) {
    if (!name || !email || !password) throw new Error('All fields are required.');
    if (password.length < 6) throw new Error('Password must be at least 6 characters.');
    await this._delay();

    const reg = this._registry();
    if (reg.find(u => u.email.toLowerCase() === email.trim().toLowerCase())) {
      throw new Error('An account with that email already exists.');
    }

    const raw = {
      id:        `u_${Date.now()}`,
      name:      name.trim(),
      email:     email.trim().toLowerCase(),
      password,                         // mock only
      avatar:    name.trim()[0].toUpperCase(),
      createdAt: new Date().toISOString(),
    };
    this._saveRegistry([...reg, raw]);

    const user = _toPublicUser(raw);
    localStorage.setItem(_CURRENT_KEY, JSON.stringify(user));
    _dispatch('noir:auth:signup', { user });
    return user;
  }

  /* ── logout ─────────────────────────────────────────────── */
  async logout() {
    localStorage.removeItem(_CURRENT_KEY);
    _dispatch('noir:auth:logout');
  }

  /* ── getUser (sync) ─────────────────────────────────────── */
  getUser() {
    try { return JSON.parse(localStorage.getItem(_CURRENT_KEY)); }
    catch { return null; }
  }
}


/* ═══════════════════════════════════════════════════════════
   ACTIVE SINGLETON
   Swap MockAuthService → SupabaseAuthService here only.
   ═══════════════════════════════════════════════════════════ */
window.NoirAuth = new MockAuthService();
