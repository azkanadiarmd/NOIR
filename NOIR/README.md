# NOIR — Activewear Intelligence Platform
### University Project · Educational Use Only

---

## 📁 Folder Structure

```
noir/
│
├── index.html                  ← Landing page (start here)
│
├── css/
│   └── style.css               ← ALL styles for the entire site
│
├── js/
│   └── main.js                 ← Shared JS: navbar, scroll, animations
│
├── pages/
│   ├── learning-hub.html       ← Module 01: Lesson list
│   ├── material-guide.html     ← Module 02: Fabric cards with ratings
│   ├── spec-checker.html       ← Module 03: Interactive spec decoder tool
│   ├── quiz.html               ← Module 04: 6-question recommendation quiz
│   └── recommendations.html   ← Module 05: Curated product examples
│
└── README.md                   ← This file
```

---

## 🗂️ What Each File Does

| File | Purpose |
|------|---------|
| `index.html` | Landing page with hero, features grid, and the "why Noir" section |
| `css/style.css` | Design tokens, typography, all components (navbar, cards, quiz, spec tool) |
| `js/main.js` | Navbar scroll behaviour, mobile hamburger menu, scroll animations |
| `pages/learning-hub.html` | List of 8 lessons (connect each to its own lesson file as you grow) |
| `pages/material-guide.html` | 9 fabric cards rendered from a JS data array — easy to expand |
| `pages/spec-checker.html` | Working tool: enter fabric %, get performance breakdown |
| `pages/quiz.html` | Fully working 6-step quiz with scoring logic and fabric result |
| `pages/recommendations.html` | Filterable product cards (by fabric type & activity) |

---

## 🚀 How to Run Locally

### Option A — Just open the file (simplest)
1. Download or unzip the project folder
2. Open `noir/index.html` in your browser (double-click it)
3. All links between pages will work since they use relative paths

> ⚠️ If any features feel broken (fonts not loading), try Option B.

---

### Option B — Live Server via VS Code (recommended)
Best for seeing live edits as you save files.

1. Install [VS Code](https://code.visualstudio.com/)
2. Open VS Code → `File → Open Folder` → select the `noir/` folder
3. Install the **Live Server** extension:
   - Click Extensions icon (left sidebar) → search "Live Server" → Install
4. Right-click `index.html` → **Open with Live Server**
5. Your browser opens at `http://127.0.0.1:5500/index.html`

---

### Option C — Python local server (if Python is installed)
1. Open Terminal / Command Prompt
2. Navigate into the `noir/` folder:
   ```bash
   cd path/to/noir
   ```
3. Run:
   ```bash
   # Python 3
   python -m http.server 5500

   # Python 2 (older systems)
   python -m SimpleHTTPServer 5500
   ```
4. Open browser → `http://localhost:5500`

---

## 🧩 How to Expand the Project

### Adding a new lesson
1. Create `pages/lessons/lesson-01.html` (copy a page shell from any existing page)
2. In `learning-hub.html`, wrap each `.lesson-item` in an `<a href="lessons/lesson-01.html">`

### Adding a new material to the guide
Open `pages/material-guide.html` and add an object to the `materials` array:
```js
{
  name: 'Your Fabric',
  type: 'Fabric category',
  tags: ['tag1', 'tag2', 'tag3'],
  tagTypes: ['good', 'warn', 'neut'],   // controls tag colour
  ratings: {
    'Breathability':       80,
    'Moisture-Wicking':    70,
    'Odor Resistance':     60,
    'Stretch (natural)':   15,
    'Tropical Suitability': 75,
  }
}
```

### Adding a new product to recommendations
Open `pages/recommendations.html` and add an object to the `products` array:
```js
{
  icon: '👕',
  type: 'Product Category',
  name: 'Product Name',
  spec: '80% Polyester / 20% Spandex',
  category: ['synthetic', 'running'],   // used for filtering
  desc: 'Educational description of why this fabric composition works.'
}
```

### Adding a new quiz question
Open `pages/quiz.html`, add to the `questions` array and add matching score
rules to the `scoring` object.

---

## 🎨 Design System Quick Reference

| Token | Value | Used for |
|-------|-------|---------|
| `--bg` | `#080808` | Page background |
| `--accent` | `#C8FF00` | Lime green — primary highlight colour |
| `--text` | `#F0EDE8` | Body text |
| `--text-muted` | 45% white | Secondary text |
| `--font-display` | Playfair Display | All headings |
| `--font-mono` | IBM Plex Mono | Labels, numbers, tags |
| `--font-body` | DM Sans | Body copy |

To change the accent colour site-wide, edit one line in `css/style.css`:
```css
--accent: #C8FF00;   /* change this to any colour */
```

---

## 📋 Project Checklist

- [x] Landing page with hero + features
- [x] Learning Hub (lesson list)
- [x] Material Guide (9 fabric cards with ratings)
- [x] Spec Checker (working interactive tool)
- [x] Recommendation Quiz (6 questions, scoring logic)
- [x] Curated Recommendations (filterable cards)
- [x] Responsive layout (mobile + desktop)
- [x] Shared navigation across all pages
- [ ] Individual lesson pages (to build out)
- [ ] Image assets (add a `/images/` folder)
- [ ] Print stylesheet (optional)

---

*Noir — Educational Platform · Not a commercial product*
