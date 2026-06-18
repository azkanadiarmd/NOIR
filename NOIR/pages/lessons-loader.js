/* ============================================================
   NOIR — lessons-loader.js
   Renders Learning Hub lessons from Supabase into #lessonList.

   If Supabase is unavailable or no published lessons exist, the
   hardcoded lesson markup already in learning-hub.html is left
   untouched as a fallback — so the page never ends up blank.

   Load order in learning-hub.html:
     supabase-js CDN → supabase-client.js → lessons-loader.js → main.js
   (main.js animates .lesson-item, so it must run AFTER this fills the list.)
   ============================================================ */

'use strict';

(function () {
  function esc(v) {
    return String(v ?? '').replace(/[&<>"']/g, c => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    }[c]));
  }

  function lessonItem(l, i) {
    const num = String(l.number ?? (i + 1)).padStart(2, '0');
    return `
      <div class="lesson-item">
        <div class="lesson-num">${esc(num)}</div>
        <div class="lesson-info">
          <h3>${esc(l.title)}</h3>
          <p>${esc(l.description || '')}</p>
        </div>
        <span class="lesson-duration">${esc(l.duration || '')}</span>
      </div>`;
  }

  async function load() {
    const list = document.getElementById('lessonList');
    const sb   = window.supabaseClient;
    if (!list || !sb) return; // keep the hardcoded fallback

    try {
      const { data, error } = await sb
        .from('lessons')
        .select('*')
        .eq('is_published', true)
        .order('sort_order', { ascending: true });

      if (error || !Array.isArray(data) || !data.length) return; // fallback stays
      list.innerHTML = data.map(lessonItem).join('');
    } catch (e) {
      console.warn('[lessons-loader] DB load failed, keeping fallback:', e.message);
    }
  }

  // Run before main.js's DOMContentLoaded handler wires up animations.
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', load);
  } else {
    load();
  }
})();
