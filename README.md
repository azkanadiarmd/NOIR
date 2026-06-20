# NOIR — Activewear Intelligence Platform
### University Project · Educational Use Only

🔗 **Live site:** [noir-activewear.vercel.app]

NOIR is an educational web platform that teaches people how to choose activewear
for a tropical climate — how fabrics breathe, wick sweat, resist odour, and stretch.
It pairs static learning content with interactive tools and a Supabase-backed layer
for user accounts, engagement (love / save / suggest), and an **admin console** for
managing all curated content.

---


## ✨ Features

- **Learning Hub** — fabric & performance lessons (loaded from the database).
- **Material Guide** — fabric cards with performance ratings.
- **Spec Checker** — enter a fabric blend, get a weighted performance breakdown.
- **Recommendation Quiz** — 6 questions that suggest a suitable fabric.
- **Curated Recommendations** — product catalogue users can filter, love, and save.
- **User accounts** — real sign-up / sign-in via Supabase Auth.
- **Engagement** — logged-in users can love, save, and suggest products.
- **Admin console** — approve suggestions, manage products & sponsors, publish lessons.

---

## 🧱 Tech Stack

| Layer | Choice |
|-------|--------|
| Frontend | Vanilla HTML, CSS, JavaScript (no framework / build step) |
| Backend | [Supabase](https://supabase.com) — Postgres, Auth, Row Level Security, Storage |
| Hosting | Static host (e.g. Vercel) — see `vercel.json` |

There is **no build step**. Every page is plain HTML that loads the Supabase JS
client from a CDN plus a few small local scripts.

---

## 📁 Folder Structure

```
noir/
│
├── index.html                  ← Landing page (start here)
│
├── css/
│   └── style.css               ← ALL styles + design tokens for the whole site
│
├── js/
│   ├── main.js                 ← Shared: navbar, mobile menu, scroll animations
│   ├── supabase-client.js      ← Creates the shared Supabase client (URL + anon key)
│   ├── supabase-auth.js        ← Real auth (sign up / in / out) → window.NoirAuth
│   ├── supabase-engagement.js  ← Love / save / suggest          → window.NoirEngage
│   ├── products-data.js        ← Product + sponsor catalogue (loads from DB, hardcoded fallback)
│   ├── lessons-loader.js       ← Fills the Learning Hub from the DB (hardcoded fallback)
│   ├── admin.js                ← Admin console logic (suggestions, products, sponsors, lessons)
│   ├── auth.js                 ← Mock auth (reference only — NOT loaded)
│   └── engagement.js           ← Mock engagement (reference only — NOT loaded)
│
├── pages/
│   ├── learning-hub.html       ← Module 01: lesson list (DB-driven)
│   ├── material-guide.html     ← Module 02: fabric cards with ratings
│   ├── spec-checker.html       ← Module 03: interactive spec decoder tool
│   ├── quiz.html               ← Module 04: 6-question recommendation quiz
│   ├── recommendations.html    ← Module 05: curated products (love / save / suggest)
│   ├── saved.html              ← A user's saved products + their suggestions
│   └── admin.html              ← 🔒 Admin console (admins only)
│
├── sql/
│   └── admin-schema.sql        ← One-time database setup: tables, RLS, seed data
│
├── img/                        ← Product / hero imagery
└── README.md                   ← This file
```

> **Note:** `js/auth.js` and `js/engagement.js` are the original *mock* implementations
> kept for reference. The live site loads only the `supabase-*` versions.

---

## 🗄️ Data Model (Supabase)

All tables are created by `sql/admin-schema.sql` and protected by Row Level Security.

| Table | Purpose | Who can read | Who can write |
|-------|---------|--------------|---------------|
| `profiles` | One row per user; holds the `is_admin` flag | Owner (+ admins) | Set only via SQL editor |
| `products` | Recommendation catalogue | Anyone (active rows) | Admins |
| `sponsors` | Sponsored products | Anyone (active rows) | Admins |
| `lessons` | Learning Hub content | Anyone (published rows) | Admins |
| `loves` | Per-user product loves | Anyone (count) | Owner |
| `saves` | Per-user saved products | Owner | Owner |
| `suggestions` | User-submitted product ideas | Owner (+ admins) | Owner; admins update status |

---

## 🚀 Setup & Running
Website preview can be accessed through the link mentioned at the beginning of this file.
This steps are only for running project from source code, local developing, debugging, or feature development

### 1. Configure Supabase (one time)

1. Create a project at [supabase.com](https://supabase.com).
2. Open **SQL Editor → New query**, paste the contents of `sql/admin-schema.sql`, and **Run**.
   This creates every table, RLS policy, the `is_admin()` helper, and seeds the
   existing catalogue so the site looks complete immediately.
3. Open `js/supabase-client.js` and confirm `SUPABASE_URL` and `SUPABASE_KEY` match
   your project (Settings → API). The **publishable / anon key is safe to expose** —
   all data protection comes from RLS, not from hiding this key.

### 2. Run the site locally

Because the pages talk to Supabase over HTTPS, use a local server (opening the file
directly with `file://` can break some browser features).

**VS Code Live Server (recommended)**
1. Install the **Live Server** extension.
2. Right-click `index.html` → **Open with Live Server** → opens at `http://127.0.0.1:5500`.

**Python**
```bash
cd path/to/noir
python -m http.server 5500
# then open http://localhost:5500
```

### 3. Deploy

The included `vercel.json` lets you deploy to Vercel as a static site. Every push to
the connected GitHub branch redeploys automatically — this is how the live link
above stays up to date.

---

## 🔒 Accessing the Admin Page

The admin console lives at **`/pages/admin.html`** — on the live site, that's:
**`https://your-noir-project.vercel.app/pages/admin.html`**

Access requires an account that is **(1) signed in** and **(2) marked as an admin**
(`profiles.is_admin = true`). A sign-in form is built into the admin page itself,
so an admin can log in there directly — no separate setup needed.

### 👩‍🏫 For graders / reviewers

Just open the admin URL above and log in with:

> - Email: `admin@noir.com`
> - Password: `admin123`

No installation, no Supabase account, no local server required — this works
directly on the deployed Vercel site.

---

### Make a different account an admin (optional, for project maintainers)

After the account exists, run this once in **Supabase → SQL Editor** (replace the email):

```sql
update public.profiles set is_admin = true
where id = (select id from auth.users where email = 'admin@noir.com');
```

To create a brand-new admin account that skips email confirmation:

1. Supabase Dashboard → **Authentication → Users → Add user**.
2. Enter an email + password and **tick "Auto Confirm User"** (this skips email confirmation).
3. Run the `update ... set is_admin = true` query above for that email.
4. Open `/pages/admin.html`, enter the credentials, and you're in.

*(Alternative: to let anyone sign up and log in instantly, turn off
**Authentication → Sign In / Providers → Email → "Confirm email"** for the duration
of grading. This relaxes security for all users, so re-enable it afterwards.)*

---

## 🛠️ Admin Console Features

Once signed in as an admin, `admin.html` has four tabs:

| Tab | What you can do |
|-----|-----------------|
| **Suggestions** | Review user-submitted products; **Approve** / **Reject**, or **Use as product →** to turn a suggestion straight into a catalogue item. |
| **Products** | Add / edit / delete recommendation products. Toggle *Active* to hide without deleting. |
| **Sponsors** | Add / edit / delete sponsored products shown on the Recommendations page. |
| **Learning Hub** | Create / edit / delete lessons. *Published* lessons appear on the Learning Hub. |

Changes are reflected on the public site immediately, because the public pages now
read products, sponsors, and lessons from the database (with the original hardcoded
content kept as a fallback if the database is unreachable).

---

## 🛡️ Security Notes

- **RLS is the real gate.** The admin UI only hides controls; every write is still
  checked server-side by the `is_admin()` policy. A non-admin who opens `admin.html`
  cannot change anything.
- **`is_admin` can't be self-assigned.** There is no API path to set it — only the
  SQL editor (service role) can, so users cannot promote themselves.
- **Output is escaped.** All user-supplied text (suggestions, names) is HTML-escaped
  before rendering to prevent stored XSS, and shop URLs are validated as `http(s)`.

---

## 🧩 Extending the Project

- **Add a product / sponsor / lesson** — just use the admin console. No code changes.
- **Bulk-seed content** — add `insert` statements to `sql/admin-schema.sql`.
- **Individual lesson pages** — the `lessons.body` column already stores long-form
  content; build a lesson template page that reads it by id.
- **Individual product card page** — the `shop.url` already displayed at the mock-up.
  content; build a full product content page that reads it by id.
- **Change the accent colour site-wide** — edit one line in `css/style.css`:
  ```css
  --accent: #FF7704;
  ```

---

## 🎨 Design System Quick Reference

| Token | Value | Used for |
|-------|-------|----------|
| `--bg` | `#0d0d0d` | Page background |
| `--surface` | `#1a1a1e` | Cards & panels |
| `--accent` | `#FF7704` | Primary highlight (orange) |
| `--text` | `#ffffff` | Body text |
| `--text-muted` | 50% white | Secondary text |
| `--font-display` | Aileron / serif | Headings |
| `--font-body` / `--font-mono` | Inter | Body copy, labels, data |

---

## 📋 Project Checklist

- [x] Landing page with hero + features
- [x] Learning Hub (DB-driven lesson list)
- [x] Material Guide (fabric cards with ratings)
- [x] Spec Checker (interactive tool)
- [x] Recommendation Quiz (scoring logic)
- [x] Curated Recommendations (filter + love + save + suggest)
- [x] User accounts (Supabase Auth)
- [x] Saved products & user suggestions
- [x] Admin console (suggestions, products, sponsors, lessons)
- [x] Row Level Security on all tables
- [x] Integrated admin submission and user page (suggestions, products, sponsors, lessons)
- [ ] Individual lesson pages (uses `lessons.body`)
- [ ] Product individual card page (requier: `products.shop_url` column and long form `products.description` on DB)

---

## 🤖 Development Process & AI Usage

This project was built with AI assistance (Claude) for code generation, used as a 
pair-programming tool rather than an autopilot. My role throughout:

- **Architecture decisions** — chose the mock-service pattern (interface → mock → 
  singleton) specifically so auth and engagement could be swapped to Supabase 
  later without refactoring every page.
- **Debugging** — diagnosed and directed fixes for issues AI-generated code 
  introduced, e.g. incorrect path, missing CSS image classes for cards.
- **Flow & UX decisions** — defined the guest-vs-logged-in permission model 
  (browse freely, sign in only to love/save/suggest), the pending-action replay 
  after login, and the admin approval workflow.
- **Design customization** — set the visual direction (palette, typography, 
  layout system) and iterated on it across multiple rounds based on my own 
  judgment of what looked right.
- **Data modeling** — designed the database schema (tables, RLS policies, 
  admin role logic) to match the actual product requirements.
- **Business plan** — define how monetization applies at the website for future development
  and weighing integrity risk for recommendation web model to decide the feature.

AI was used to accelerate writing boilerplate HTML/CSS/JS and to scaffold features 
from my specifications. Every architectural choice, bug fix prioritization, and 
design decision was directed and reviewed by me.

---

## 👤 Author

**Azka Nadia Ramadhani**
Padjadjaran University — Website Development Course
(https://www.linkedin.com/in/azkanadiaramadhani/)

*Noir — Activewear Recommendation Platform · A mock-up affiliates and sponsorship website*
