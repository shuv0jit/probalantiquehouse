# Probal Antique House

A product-showcase website for a physical jewellery/antique showroom, plus an admin panel to run the catalogue.

**Stack:** Vite + React 18 · Express (one Vercel serverless function) · Cloudflare D1 · Backblaze B2 · JWT cookie auth

---

## 1. Run it locally

```bash
npm install
cp .env.example .env      # fill in the values (section 2)
npm run hash -- "your-admin-password"   # paste the output line into .env
node server/scripts/migrate-local.js    # create the tables in D1
npm run dev               # http://localhost:5173
```

One command runs everything. `vite.config.js` mounts the real Express app as dev
middleware, so `/api/*` behaves in development exactly as it does on Vercel.

Admin panel: <http://localhost:5173/admin>

---

## 2. Environment variables

| Variable | What it is |
|---|---|
| `CF_ACCOUNT_ID` | Cloudflare account id |
| `CF_D1_DATABASE_ID` | D1 database id |
| `CF_API_TOKEN` | API token with **D1 Edit** permission |
| `B2_KEY_ID` / `B2_APPLICATION_KEY` | Backblaze application key |
| `B2_ENDPOINT` | e.g. `https://s3.us-west-004.backblazeb2.com` |
| `B2_BUCKET` / `B2_REGION` | bucket name and region |
| `PUBLIC_IMAGE_BASE_URL` | public URL prefix objects are served from (bucket URL or your CDN) |
| `ADMIN_EMAIL` | the one admin login |
| `ADMIN_PASSWORD_HASH` | from `npm run hash -- "password"` |
| `JWT_SECRET` | long random string — `openssl rand -base64 48` |
| `SETUP_TOKEN` | optional; enables `POST /api/admin/migrate` once, then delete it |
| `VITE_WHATSAPP_NUMBER` | optional; enables the enquiry button, e.g. `8801700000000` |

**Never prefix a secret with `VITE_`** — that would bundle it into the browser.
Only `VITE_WHATSAPP_NUMBER` is meant to be public.

### B2 bucket CORS

Images upload from the browser straight to B2, so the bucket must allow it:

```json
[{
  "corsRuleName": "pahUploads",
  "allowedOrigins": ["https://your-domain.com", "http://localhost:5173"],
  "allowedOperations": ["s3_put", "s3_head", "s3_get"],
  "allowedHeaders": ["*"],
  "exposeHeaders": ["etag"],
  "maxAgeSeconds": 3600
}]
```

The bucket should be **public** for reads (or fronted by a CDN), since product
photos are served directly to customers.

---

## 3. Deploy to Vercel

1. Push the repo, then import it in Vercel. Framework preset: **Vite**.
2. Add every variable from section 2 under *Settings → Environment Variables*.
3. Deploy. `vercel.json` routes `/api/*` to the single serverless function and
   everything else to the SPA.
4. Run the migration once, then remove `SETUP_TOKEN`:

```bash
curl -X POST https://your-domain.com/api/admin/migrate -H "x-setup-token: $SETUP_TOKEN"
```

D1 is accessed over its REST API, so serverless functions work fine — there is
no local SQLite file to persist and nothing about this depends on a warm
filesystem.

---

## 4. How the important parts work

### Live sync

The `meta` table holds one integer, `revision`, bumped by every mutation.
Clients find out three ways:

1. **Local echo** — every admin API response returns the new revision, so the
   tab that made the change updates immediately.
2. **BroadcastChannel** — that revision is pushed to other tabs in the same
   browser, which also update immediately.
3. **Polling** — other devices poll `GET /api/revision` every 4s. It is one
   tiny query, it pauses while the tab is hidden, and it fires instantly on
   focus/online.

Anything that must stay fresh uses `useSyncEffect()` in `src/lib/store.jsx`,
which re-runs when the revision moves. Add a product on your phone and the
catalogue on the shop's display updates within a few seconds without a reload.

### 6-digit product codes

Format `BBSSSS`: a 2-digit bucket permanently assigned to the collection, plus a
4-digit sequence inside it. That keeps codes grouped by collection while staying
exactly six digits — the literal `1xxxxx / 101xxx / 11xxxx` scheme in the brief
cannot do both once you pass 9 collections. Capacity is 90 collections ×
10,000 pieces; past that, products fall back to a random unused 6-digit code.
A `UNIQUE` index on `products.code` is the hard guarantee. See `server/codes.js`.

### Pricing

Three separate concepts, never mixed (`server/pricing.js`):

- **base** — the real admin price in the database.
- **compare** — presentation only: base × a stable factor between 1.10 and 1.30,
  derived from the product code so it never changes on reload.
- **final** — what the customer pays: base minus the real configured sale
  discount, always.

`compare > final` is enforced, so the display can never contradict itself. If
the admin sets 5%, the customer is charged exactly 5% less; the struck-through
number is a reference price, not a fake discount calculation.

### Sales

A sale targets collections and cascades to every descendant, so "Jewellery" also
discounts "Jewellery › Necklace › Gold Necklace". Overlapping sales resolve to
the **highest** discount. Expired sales disappear from the storefront on their
own — nothing needs switching off manually.

### Deletion

Delete is a soft delete: rows get `deleted_at`, disappear from the storefront,
and appear under **Deleted Items** for restore. Permanent delete needs a second
confirmation, cascades through the hierarchy, and removes the B2 objects.
Restoring a child whose parent is still deleted is blocked, so nothing can end
up orphaned and invisible.

### Auth

Password is never in the bundle. Login POSTs to the server, which checks it
against a scrypt hash, then sets an **httpOnly** `SameSite=Lax` cookie holding a
signed JWT valid for 365 days. Every `/api/admin/*` route re-verifies it
server-side. There is no `localStorage.isAdmin` anywhere.

### Image uploads

Browser → B2 directly via a short-lived presigned PUT. No 4.5 MB serverless body
limit, real progress bars, four parallel uploads. All images are uploaded
*before* any database write; then products and image rows are written together,
with compensating deletes if anything fails midway — so a failed batch never
leaves half-built products.

---

## 5. Structure

```
api/index.js           Vercel entry (re-exports the Express app)
server/
  app.js               every API route
  d1.js                Cloudflare D1 client
  auth.js              JWT + password verification
  codes.js             6-digit code allocation, stable uplift factor
  pricing.js           base / compare / final resolution
  storage.js           B2 presigned uploads and deletes
  schema.sql           tables, indexes, constraints
src/
  lib/                 api client, store + live sync, hooks, swipe
  components/          navbar, tree, drawer, gallery, search, cards
  pages/               Home, ProductPage, NotFound
  admin/               shell, login, dashboard, collections, products, sales, deleted
  styles/              theme tokens, storefront CSS, admin CSS
```

---

## 6. Design notes

Light throughout: warm ivory and blush surfaces, dark ink for text, gold only as
a hairline accent. Display type is Cormorant Garamond, UI type is Montserrat.

Motion is CSS-only — no animation library. Scroll reveals use one
IntersectionObserver; the drawer and gallery track your finger through pointer
events; everything honours `prefers-reduced-motion`.

Interaction details worth knowing:

- **Edge-swipe** from the left of the screen opens the collections drawer; swipe
  left (or drag past a third of its width) closes it.
- **⌘K / Ctrl+K** opens search anywhere. Arrow keys move, Enter opens, Esc closes.
- **Gallery** has arrows, dots, thumbnails, swipe, hover lens-zoom on desktop,
  and a fullscreen lightbox with native pinch-zoom on touch.
- **Admin sidebar** collapses to icons on desktop (remembered) and becomes a
  swipeable drawer on mobile. Deleted Items is pinned at the bottom with a count.

---

## 7. Things to check before going live

- Add real product photographs — the layout is built around square-ish images.
- Set `VITE_WHATSAPP_NUMBER` if you want the enquiry button.
- Put a CDN in front of B2 if the catalogue grows large; `PUBLIC_IMAGE_BASE_URL`
  is the only thing that needs changing.
- Consider generating resized variants on upload. The app lazy-loads everything
  and reserves layout space, but it serves the original file — with hundreds of
  large photos, resizing is the single biggest remaining performance win.
