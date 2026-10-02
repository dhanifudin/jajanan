# Jajanan

PWA snack-stall price list, stock tracker, and QRIS checkout. Vue 3 + Vite +
Supabase, deployed to GitHub Pages at `jajanan.ulfillah.com`. Sibling project
of `bomi` and `lulu` — same shared Supabase instance, own `jajanan` schema.

## Stack

Vue 3.5, Vite 5, TypeScript, Pinia, Vue Router, Tailwind, vite-plugin-pwa
(custom service worker for Web Push), Supabase (Postgres + Auth + Edge
Functions), `qrcode` for rendering the dynamic QRIS code.

## 1. Supabase project setup

1. In the shared Supabase project dashboard → **Settings → API**, add
   `jajanan` to "Exposed schemas" (alongside `public`, `bomi`, `lulu`).
2. Set repo secrets (Settings → Secrets → Actions): `SUPABASE_ACCESS_TOKEN`,
   `SUPABASE_DB_PASSWORD`, `SUPABASE_PROJECT_REF`.
3. Push migrations (locally, once, or let `.github/workflows/supabase.yml`
   do it on first push to `main`):
   ```bash
   supabase link --project-ref <project-ref>
   supabase db push
   ```
   This creates the `jajanan` schema, tables, RLS policies, `create_order`/
   `mark_order_paid` RPCs, and seeds two sample snacks.

## 2. Google OAuth (member sign-in)

Same Google OAuth client as `bomi`/`lulu` can be reused — just add this
app's redirect URL in the Google Cloud Console → Credentials → your OAuth
client → Authorized redirect URIs:
```
https://<project-ref>.supabase.co/auth/v1/callback
```
and Authorized JavaScript origins:
```
https://jajanan.ulfillah.com
http://localhost:5173
```

## 3. Admin access

Admin (snack/price/stock CRUD, mark-paid) is a hardcoded email allowlist —
same two accounts as `bomi`/`lulu`: `src/lib/supabase.ts` → `ADMIN_EMAILS`,
mirrored server-side in `jajanan.is_admin()`
(`supabase/migrations/002_jajanan_rls.sql`). Any other Google account that
signs in is a regular member (favorites, notifications, own order history).

## 4. QRIS dynamic-amount setup (one-time)

This app has no payment gateway — it patches the merchant's **static**
QRIS (`docs/qris.jpg`, NMID `ID1026600772887`) with the exact order total
client-side (`src/lib/qris.ts`), so the buyer's own e-wallet/bank app shows
the amount pre-filled on scan.

1. Get the *raw QRIS text payload* — either export/share-as-text from the
   merchant e-wallet app, or scan `docs/qris.jpg` with any QR reader app
   that shows the raw decoded string (not just "open link").
2. Sign in as admin → **Admin → Pengaturan QRIS** → paste it into "Payload
   QRIS statis" → Simpan.
3. Every checkout now generates a dynamic QR with the order's exact total.

There's no payment webhook: after paying, the buyer's order stays
"Menunggu bayar" until admin confirms receipt in their own banking app and
taps "Tandai Lunas" in **Admin → Pesanan**, which atomically decrements
stock.

## 5. Web Push (favorite-snack stock alerts)

```bash
npx web-push generate-vapid-keys
```
Put the public key in `.env` (`VITE_VAPID_PUBLIC_KEY`) and GitHub secrets;
put both keys in the Edge Function secrets:
```bash
supabase secrets set VAPID_PUBLIC_KEY=... VAPID_PRIVATE_KEY=...
```

The `notify-favorite-stock` Edge Function is called by a DB trigger
(`supabase/migrations/006_favorite_stock_notify.sql`) whenever a snack's
stock crosses sold-out or restocked, and pushes every member who
favorited it. The trigger needs two one-time Vault secrets (same pattern
as `lulu`'s cron reminders):
```sql
select vault.create_secret('https://<project-ref>.supabase.co', 'project_url');
select vault.create_secret('<service-role-key>', 'service_role_key');
```
Until those exist, stock updates work normally — the trigger just no-ops.

## 6. Local development

```bash
cp .env.example .env   # fill in VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY / VITE_VAPID_PUBLIC_KEY
npm install
npm run dev
```

## 7. Deploy

Push to `main`. `.github/workflows/deploy.yml` builds and deploys to
GitHub Pages (needs `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`,
`VITE_VAPID_PUBLIC_KEY` repo secrets). `.github/workflows/supabase.yml`
pushes new migrations/functions on changes under `supabase/`.

In GitHub repo **Settings → Pages**: Source = GitHub Actions, custom
domain `jajanan.ulfillah.com` (matches `public/CNAME`), and add a DNS
CNAME record `jajanan` → `<github-username>.github.io`.

## Data model

| Table | Purpose |
|---|---|
| `snacks` | catalog: name, stock, active, sort order |
| `snack_price_tiers` | qty-break + member pricing per snack (cheapest eligible tier wins at checkout) |
| `favorites` | member's favorited snacks |
| `orders` / `order_items` | checkout; totals always computed server-side in `create_order()` |
| `push_subscriptions` / `notification_prefs` | Web Push |
| `store_settings` | singleton: merchant name, NMID, static QRIS payload |
