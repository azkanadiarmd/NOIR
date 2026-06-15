/* ============================================================
   NOIR — supabase-client.js
   Single shared Supabase client instance.

   Load this AFTER the Supabase CDN script, and BEFORE
   auth.js / engagement.js, on every page that needs auth
   or engagement features:

     <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
     <script src="../js/supabase-client.js"></script>
     <script src="../js/auth.js"></script>
     <script src="../js/engagement.js"></script>

   The publishable/anon key below is SAFE to expose in frontend
   code — it has no special privileges. All data protection comes
   from the Row Level Security (RLS) policies defined in your
   Supabase database, not from keeping this key secret.
   ============================================================ */

'use strict';

const SUPABASE_URL = 'https://xlioqyevvfwlgxaefozl.supabase.co';
const SUPABASE_KEY = 'sb_publishable_CEstOsI-qjGpdCMyAleEyA__CjucCbH';

window.supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
