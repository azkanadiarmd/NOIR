/* ============================================================
   NOIR — products-data.js
   Single source of truth for all product and sponsor data.

   Both recommendations.html and saved.html import this file.
   Edit products here — both pages update automatically.

   When upgrading to a real backend, replace these arrays with
   an async fetch and set window.NOIR_PRODUCTS from the response:

     const res  = await fetch('/api/products');
     window.NOIR_PRODUCTS = await res.json();

   ============================================================ */

/* ── Curated product catalogue ────────────────────────────────
   id        must be unique; used as the key in engagement.js
   curation  'noir' = manual Curated badge; omit = no badge
             Community Pick badge is earned by love count only
   category  array; used by the filter row
   ─────────────────────────────────────────────────────────── */
window.NOIR_PRODUCTS = [
  {
    id: 'classic-poly-tee',
    image_url: '../img/running.jpg', type: 'Running Tee',
    name: 'Classic Poly Performance Tee',
    spec: '88% Polyester / 12% Spandex',
    category: ['synthetic', 'running'],
    curation: 'noir',
    desc: 'The go-to blend for tropical runners. High wicking speed pulls sweat away in seconds. The 12% spandex allows full range of motion without restricting stride.',
  },
  {
    id: 'bamboo-flow-tank',
    image_url: '../img/bamboo.jpg', type: 'Yoga Top',
    name: 'Bamboo Flow Tank',
    spec: '95% Bamboo / 5% Spandex',
    category: ['natural', 'eco', 'yoga'],
    curation: 'noir',
    desc: "Bamboo's natural antibacterial properties shine in low-intensity activities. Stays odour-free through extended sessions and feels incredibly soft against skin.",
  },
  {
    id: 'nylon-trail-shirt',
    image_url: '../img/trail.jpg', type: 'Hiking Shirt',
    name: 'Nylon Trail Shirt (LS)',
    spec: '100% Ripstop Nylon',
    category: ['synthetic', 'hiking'],
    desc: 'Ripstop nylon offers unmatched abrasion resistance for trail use. Lightweight, fast-drying, with a tighter weave that provides meaningful UV protection.',
  },
  {
    id: 'tencel-everyday-active',
    image_url: '../img/training.jpg', type: 'Training Tee',
    name: 'Tencel Everyday Active',
    spec: '90% Tencel / 10% Spandex',
    category: ['natural', 'eco', 'yoga'],
    curation: 'noir',
    desc: 'Tencel (lyocell) is produced via a closed-loop water process — one of the more sustainable fabric choices. Exceptionally breathable and moisture-absorbent.',
  },
  {
    id: 'rpet-performance-short',
    image_url: '../img/performance.jpg', type: 'Running Shorts',
    name: 'rPET Performance Short',
    spec: '100% Recycled Polyester (rPET)',
    category: ['synthetic', 'eco', 'running'],
    desc: 'Made from post-consumer plastic bottles. Performs identically to virgin polyester in moisture-wicking and quick-dry, with a lower carbon footprint.',
  },
  {
    id: 'merino-hike-base',
    image_url: '../img/hike.jpg', type: 'Hike Baselayer',
    name: 'Merino Hike Base',
    spec: '100% 150gsm Merino Wool',
    category: ['natural', 'hiking'],
    desc: "Merino's lanolin content provides natural odour resistance across multi-day use — ideal for extended hikes where laundry isn't possible.",
  },
  {
    id: 'poly-mesh-aero-jersey',
    image_url: '../img/cycling.jpg', type: 'Cycling Jersey',
    name: 'Poly-Mesh Aero Jersey',
    spec: '80% Polyester / 20% Elastane',
    category: ['synthetic', 'running'],
    desc: 'Higher elastane (20%) provides the compression and aerodynamic fit needed for cycling. Polyester body wicks moisture efficiently at high effort levels.',
  },
  {
    id: 'modal-studio-short',
    image_url: '../img/yoga.jpg', type: 'Versatile Shorts',
    name: 'Modal Studio Short',
    spec: '92% Modal / 8% Spandex',
    category: ['natural', 'yoga'],
    curation: 'noir',
    desc: "Modal's silky texture is ideal for studio activities and casual active use. Softer than cotton, more breathable than synthetic blends.",
  },
];

/* ── Sponsored products ───────────────────────────────────── */
window.NOIR_SPONSORED = [
  {
    image_url: '../img/aerowave.jpg',
    brand: 'AeroWeave × Noir',
    name: 'UltraLite Pro Running Tee',
    spec: '92% Recycled Polyester / 8% Elastane',
    desc: "AeroWeave's flagship moisture-wicking tee for tropical runners. Flat-seam construction eliminates chafe on long runs.",
  },
  {
    image_url: '../img/flow.jpg',
    brand: 'CoralCore × Noir',
    name: 'Bamboo-Nylon Trail Short',
    spec: '60% Bamboo / 35% Nylon / 5% Spandex',
    desc: 'Bamboo-nylon hybrid for soft comfort with trail-grade durability. UPF 40+ rated for full-sun hikes.',
  },
];


/* ════════════════════════════════════════════════════════════
   DB-BACKED LOADING  (added for the admin console)

   The arrays above now act as an INSTANT FALLBACK / seed. On load
   we fetch the live catalogue from Supabase and replace the array
   CONTENTS IN PLACE — so existing code like
       const PRODUCTS = window.NOIR_PRODUCTS;
   keeps pointing at the same (now-updated) array.

   Pages should await window.NOIR_DATA_READY before first render:
       await (window.NOIR_DATA_READY || Promise.resolve());
   ════════════════════════════════════════════════════════════ */
(function () {
  function replaceInPlace(arr, items) { arr.length = 0; items.forEach(i => arr.push(i)); }

  function mapProduct(r) {
    return {
      id: r.id, type: r.type, name: r.name, spec: r.spec,
      category: r.category || [], curation: r.curation || undefined,
      desc: r.description || '', image_url: r.image_url || null,
    };
  }
  function mapSponsor(r) {
    return {
      brand: r.brand, name: r.name, spec: r.spec,
      desc: r.description || '', image_url: r.image_url || null,
    };
  }

  window.NOIR_DATA_READY = (async function () {
    const sb = window.supabaseClient;
    if (!sb) return; // no Supabase on this page → keep hardcoded fallback

    try {
      const [{ data: prods, error: pErr }, { data: spons, error: sErr }] = await Promise.all([
        sb.from('products').select('*').eq('is_active', true).order('sort_order', { ascending: true }),
        sb.from('sponsors').select('*').eq('is_active', true).order('sort_order', { ascending: true }),
      ]);

      if (!pErr && Array.isArray(prods) && prods.length) {
        replaceInPlace(window.NOIR_PRODUCTS, prods.map(mapProduct));
        console.info(`[NOIR data] Loaded ${prods.length} product(s) from Supabase.`);
      } else {
        console.warn('[NOIR data] Showing HARDCODED fallback products. Reason:',
          pErr ? pErr.message
               : '0 active rows returned (seed the products table or add products in admin).');
      }
      if (!sErr && Array.isArray(spons)) {
        replaceInPlace(window.NOIR_SPONSORED, spons.map(mapSponsor));
        console.info(`[NOIR data] Loaded ${spons.length} sponsor(s) from Supabase.`);
      } else if (sErr) {
        console.warn('[NOIR data] Sponsor load failed:', sErr.message);
      }
    } catch (e) {
      console.warn('[products-data] DB load failed, using fallback catalogue:', e.message);
    }
  })();
})();


/* ── Shared photo renderer (image-only) ───────────────────────
 * Returns an <img> filling the card's image area, or a neutral
 * placeholder when the item has no image_url. Kept for backward
 * compatibility; the pages now inline their own copy.
 * `image_url` may be a repo path ("../img/running.jpg") or a full URL. */
window.noirIconMarkup = function (item) {
  const escAttr = s => String(s ?? '')
    .replace(/&/g, '&amp;').replace(/"/g, '&quot;')
    .replace(/</g, '&lt;').replace(/>/g, '&gt;');
  if (item && item.image_url) {
    return `<img src="${escAttr(item.image_url)}" alt="${escAttr(item.name || '')}"
            loading="lazy"
            style="width:100%;height:100%;object-fit:cover;display:block">`;
  }
  return `<span class="card-img-empty">No image</span>`;
};
