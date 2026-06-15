/* ============================================================
   NOIR — supabase-auth.js
   Real authentication via Supabase Auth.

   This is a DROP-IN REPLACEMENT for auth.js.

   TO ACTIVATE:
   In every HTML page, change:
     <script src="../js/auth.js"></script>
   to:
     <script src="../js/supabase-auth.js"></script>

   And make sure these load BEFORE it, in this order:
     <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
     <script src="../js/supabase-client.js"></script>
     <script src="../js/supabase-auth.js"></script>
     <script src="../js/supabase-engagement.js"></script>

   No changes needed in recommendations.html or saved.html —
   they only ever call window.NoirAuth.* and window.NoirEngage.*.

   ── HOW SESSION RESTORATION WORKS ──────────────────────────
   Supabase persists the session in localStorage automatically
   (under a key like 'sb-<project-ref>-auth-token'). On page
   load, getSession() reads that and restores the user.

   Because this is asynchronous, getUser() may return null for
   a brief moment after the script loads, even if the user is
   actually logged in. Page init code MUST wait for `ready`:

     await window.NoirAuth.ready;
     // now getUser() is reliable

   recommendations.html and saved.html already do this.

   ── EVENTS ──────────────────────────────────────────────────
   Same as the mock: 'noir:auth:login', 'noir:auth:signup',
   'noir:auth:logout' — dispatched on `document`.
   ============================================================ */

'use strict';

/* ── Shared helpers ───────────────────────────────────────── */
function _dispatch(name, detail = null) {
  document.dispatchEvent(new CustomEvent(name, { detail, bubbles: false }));
}

/*
 * Convert a Supabase auth user object into Noir's User shape.
 * Name and avatar come from user_metadata, set during signup.
 * Falls back to deriving from email if metadata is missing
 * (e.g. for users created directly in the Supabase dashboard).
 */
function _toPublicUser(raw) {
  if (!raw) return null;
  const meta = raw.user_metadata || {};
  const name = meta.name || raw.email.split('@')[0];
  return {
    id:        raw.id,
    name,
    email:     raw.email,
    avatar:    meta.avatar || name.charAt(0).toUpperCase(),
    createdAt: raw.created_at,
  };
}


/* ═══════════════════════════════════════════════════════════
   INTERFACE — identical contract to auth.js's AuthServiceInterface
   ═══════════════════════════════════════════════════════════ */
class AuthServiceInterface {
  async login(email, password)        { throw Error('Not implemented'); }
  async signup(name, email, password) { throw Error('Not implemented'); }
  async logout()                      { throw Error('Not implemented'); }
  getUser()                            { throw Error('Not implemented'); }
  isAuthenticated()                    { return this.getUser() !== null; }
}


/* ═══════════════════════════════════════════════════════════
   SUPABASE IMPLEMENTATION
   ═══════════════════════════════════════════════════════════ */
class SupabaseAuthService extends AuthServiceInterface {

  constructor() {
    super();
    this._user = null;
    this._sb   = window.supabaseClient;

    if (!this._sb) {
      throw new Error(
        '[SupabaseAuthService] window.supabaseClient is not defined. ' +
        'Make sure supabase-client.js loads before supabase-auth.js.'
      );
    }

    /*
     * `ready` resolves once the existing session (if any) has
     * been restored from localStorage. Page init code awaits
     * this before the first render — see recommendations.html
     * and saved.html's init()/initPage() functions.
     */
    this.ready = this._sb.auth.getSession().then(({ data, error }) => {
      if (error) {
        console.error('[SupabaseAuthService] getSession error:', error.message);
        return;
      }
      this._user = _toPublicUser(data.session?.user ?? null);
    });

    /*
     * Keep _user in sync for the rest of the session, and
     * dispatch the same events the Mock implementation does
     * so page code doesn't need to know which is active.
     *
     * Note: signInWithPassword / signUp below ALSO resolve
     * with the user — but onAuthStateChange is the single
     * source of truth for _user, avoiding duplicate/late
     * dispatches if Supabase fires SIGNED_IN slightly after
     * the promise resolves.
     */
    this._sb.auth.onAuthStateChange((event, session) => {
      const prevUser = this._user;
      this._user = _toPublicUser(session?.user ?? null);

      if (event === 'SIGNED_IN' && (!prevUser || prevUser.id !== this._user?.id)) {
        _dispatch('noir:auth:login', { user: this._user });
      }
      if (event === 'SIGNED_OUT') {
        _dispatch('noir:auth:logout');
      }
    });
  }

  /* ── login ──────────────────────────────────────────────── */
  async login(email, password) {
    if (!email || !password) throw new Error('Email and password are required.');

    const { data, error } = await this._sb.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });

    if (error) throw new Error(_friendlyError(error));

    this._user = _toPublicUser(data.user);
    return this._user;
    // Note: onAuthStateChange will also fire SIGNED_IN and
    // dispatch 'noir:auth:login' — this is intentional and
    // harmless (the duplicate-check above prevents double events).
  }

  /* ── signup ─────────────────────────────────────────────── */
  async signup(name, email, password) {
    if (!name || !email || !password) throw new Error('All fields are required.');
    if (password.length < 6) throw new Error('Password must be at least 6 characters.');

    const { data, error } = await this._sb.auth.signUp({
      email: email.trim().toLowerCase(),
      password,
      options: {
        data: {
          name:   name.trim(),
          avatar: name.trim().charAt(0).toUpperCase(),
        },
      },
    });

    if (error) throw new Error(_friendlyError(error));

    /*
     * If email confirmation is ENABLED in your Supabase project,
     * data.session will be null here — the user must click the
     * confirmation link before they can log in. In that case we
     * surface a clear message instead of silently "succeeding"
     * with no session.
     */
    if (!data.session) {
      throw new Error(
        'Account created! Check your email to confirm your address ' +
        'before signing in.'
      );
    }

    this._user = _toPublicUser(data.user);
    _dispatch('noir:auth:signup', { user: this._user });
    return this._user;
  }

  /* ── logout ─────────────────────────────────────────────── */
  async logout() {
    const { error } = await this._sb.auth.signOut();
    if (error) throw new Error(error.message);
    // onAuthStateChange handles dispatching 'noir:auth:logout'
  }

  /* ── getUser (sync) ─────────────────────────────────────── */
  getUser() {
    return this._user;
  }
}


/*
 * Translate raw Supabase error messages into friendlier text
 * for common cases. Falls back to the original message.
 */
function _friendlyError(error) {
  const msg = error.message || '';
  if (/invalid login credentials/i.test(msg)) {
    return 'Incorrect email or password.';
  }
  if (/user already registered/i.test(msg) || /already registered/i.test(msg)) {
    return 'An account with that email already exists.';
  }
  if (/email not confirmed/i.test(msg)) {
    return 'Please confirm your email address before signing in. Check your inbox.';
  }
  return msg;
}


/* ═══════════════════════════════════════════════════════════
   ACTIVE SINGLETON
   ═══════════════════════════════════════════════════════════ */
window.NoirAuth = new SupabaseAuthService();
