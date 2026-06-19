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
    icon: '🏃', type: 'Running Tee',
    name: 'Classic Poly Performance Tee-A',
    spec: '88% Polyester / 12% Spandex',
    category: ['synthetic', 'running'],
    curation: 'noir',
    desc: 'The go-to blend for tropical runners. High wicking speed pulls sweat away in seconds. The 12% spandex allows full range of motion without restricting stride.',
  },
  {
    id: 'bamboo-flow-tank',
    icon: '🧘', type: 'Yoga Top',
    name: 'Bamboo Flow Tank',
    spec: '95% Bamboo / 5% Spandex',
    category: ['natural', 'eco', 'yoga'],
    curation: 'noir',
    desc: "Bamboo's natural antibacterial properties shine in low-intensity activities. Stays odour-free through extended sessions and feels incredibly soft against skin.",
  },
  {
    id: 'nylon-trail-shirt',
    icon: '🥾', type: 'Hiking Shirt',
    name: 'Nylon Trail Shirt (LS)',
    spec: '100% Ripstop Nylon',
    category: ['synthetic', 'hiking'],
    desc: 'Ripstop nylon offers unmatched abrasion resistance for trail use. Lightweight, fast-drying, with a tighter weave that provides meaningful UV protection.',
  },
  {
    id: 'tencel-everyday-active',
    icon: '🌿', type: 'Training Tee',
    name: 'Tencel Everyday Active',
    spec: '90% Tencel / 10% Spandex',
    category: ['natural', 'eco', 'yoga'],
    curation: 'noir',
    desc: 'Tencel (lyocell) is produced via a closed-loop water process — one of the more sustainable fabric choices. Exceptionally breathable and moisture-absorbent.',
  },
  {
    id: 'rpet-performance-short',
    icon: '♻️', type: 'Running Shorts',
    name: 'rPET Performance Short',
    spec: '100% Recycled Polyester (rPET)',
    category: ['synthetic', 'eco', 'running'],
    desc: 'Made from post-consumer plastic bottles. Performs identically to virgin polyester in moisture-wicking and quick-dry, with a lower carbon footprint.',
  },
  {
    id: 'merino-hike-base',
    icon: '🏔️', type: 'Hike Baselayer',
    name: 'Merino Hike Base',
    spec: '100% 150gsm Merino Wool',
    category: ['natural', 'hiking'],
    desc: "Merino's lanolin content provides natural odour resistance across multi-day use — ideal for extended hikes where laundry isn't possible.",
  },
  {
    id: 'poly-mesh-aero-jersey',
    icon: '🚴', type: 'Cycling Jersey',
    name: 'Poly-Mesh Aero Jersey',
    spec: '80% Polyester / 20% Elastane',
    category: ['synthetic', 'running'],
    desc: 'Higher elastane (20%) provides the compression and aerodynamic fit needed for cycling. Polyester body wicks moisture efficiently at high effort levels.',
  },
  {
    id: 'modal-studio-short',
    icon: '🧵', type: 'Versatile Shorts',
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
    icon: '🏅',
    brand: 'AeroWeave × Noir',
    name: 'UltraLite Pro Running Tee',
    spec: '92% Recycled Polyester / 8% Elastane',
    desc: "AeroWeave's flagship moisture-wicking tee for tropical runners. Flat-seam construction eliminates chafe on long runs.",
  },
  {
    icon: '🌊',
    brand: 'CoralCore × Noir',
    name: 'Bamboo-Nylon Trail Short',
    spec: '60% Bamboo / 35% Nylon / 5% Spandex',
    desc: 'Bamboo-nylon hybrid for soft comfort with trail-grade durability. UPF 40+ rated for full-sun hikes.',
  },
];
