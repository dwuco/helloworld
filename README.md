# PantryIQ

A responsive Progressive Web App for tracking what's in your **fridge, freezer and pantry**, importing groceries from receipts and order confirmations, finding **recipes that use what you already own**, planning meals, and keeping a **shared shopping list**.

Built with Next.js 15 (App Router), TypeScript, Tailwind CSS 4 and Supabase. Works on iPhone (installable to the Home Screen) and desktop.

---

## What works

| Feature | Status |
| --- | --- |
| Inventory CRUD (fridge / freezer / pantry), quantities, expiry dates, low-stock alerts, search & sort | Working |
| Dashboard: quick actions, storage counts, use-soon, running low, today's meals, cook-now, pending orders | Working |
| Sample kitchen (opt-in, clearly labelled, deletable) | Working |
| Grocery import: paste/type text, upload `.txt` / `.csv` / `.eml`, line-by-line review | Working (parsed on-device) |
| Pickup / delivery confirmation: orders wait in "awaiting" until you confirm they arrived; duplicates merge into existing items | Working |
| Recipes ranked by owned ingredients, expiring food prioritised, missing items → shopping list | Working (18 built-in recipes) |
| Meal planner: week view, recipe or custom meals, edit/delete, "add week's missing ingredients" | Working |
| Shopping list: add/edit/check/delete, duplicate guard, running-low suggestions, move checked items into inventory | Working |
| Backup export / restore (JSON) | Working |
| Shared households (sign-in by email link, invite codes, live sync, row-level security) | Implemented; needs your Supabase project (see below) |
| Offline: app shell + visited pages cached by a service worker; local-mode data is on-device | Working in production builds |

### What is deliberately *not* live

PantryIQ never presents an unsupported integration as working. **Settings → Integrations** shows the real status of each one.

- **Walmart, Sam's Club, Costco, Kroger, Target, Instacart, Amazon**: *Manual import only.* None offers a public API for personal order history. PantryIQ doesn't scrape accounts or ask for store passwords. Each retailer has copy/paste instructions, and its text is auto-detected.
- **Gmail, Outlook**: *Not available yet.* The connector interface (`EmailConnector` in `src/lib/integrations.ts`) is defined, but no connector ships. Gmail needs Google's restricted-scope verification; Outlook needs an Azure app registration with publisher verification.
- **Email is strictly opt-in.** The preference defaults to **off**. Turning it on takes an explicit consent dialog, and it's stored per user (never per household). `getEmailConnector()` checks consent before anything else, so a future connector can't be reached without opt-in (this is unit-tested). Signing in to a shared household uses a one-time email link, which only confirms your address and gives no mailbox access.
- **Photo receipts (OCR)**: not supported. The importer says so and asks for text, `.csv` or `.eml` instead.

---

## Quick start

```bash
npm install
npm run dev          # http://localhost:3000
```

Without any configuration the app runs in **"This device" mode**: everything is stored in the browser's `localStorage`. The UI says so in the sidebar and in Settings.

### Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Development server |
| `npm run build && npm start` | Production build and server |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint (Next.js core-web-vitals + TypeScript rules) |
| `npm test` | Vitest unit and integration tests |
| `npm run test:e2e` | Playwright end-to-end tests on a desktop and an iPhone-sized (390×844, touch, mobile UA) viewport. Builds and starts the app on port 3100 |
| `npm run check` | typecheck + lint + unit tests + build |
| `npm run icons` | Re-render the PWA PNG icons from `public/icons/icon.svg` |
| `supabase/tests/run.sh` | Apply the SQL migration to a scratch PostgreSQL database and run the row-level-security tests |

---

## Shared households with Supabase

1. Create a project at [supabase.com](https://supabase.com).
2. Apply the schema. Either:
   - `supabase link --project-ref <ref> && supabase db push`, or
   - paste `supabase/migrations/0001_pantryiq_init.sql` into **SQL Editor** and run it.
3. **Authentication → URL Configuration**: set *Site URL* to your deployed URL. Add `https://<your-domain>/settings` (plus `http://localhost:3000/settings` for local dev) to *Redirect URLs*. Email (magic link) sign-in is on by default.
4. Copy `.env.example` to `.env.local` and fill in the values from **Project Settings → API**:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
   ```
5. Restart the app. In **Settings → Household**, sign in with an email link, create a household (or join with an invite code), and invite others from the same screen.

How it's secured:
- Every household table has row-level security. A user can only read or write rows of households they belong to (`is_household_member()`).
- Households are created and joined only through `security definer` RPCs (`create_household`, `join_household`, `create_household_invite`). Invite codes expire after 7 days.
- Profiles (including email-import consent) are readable and writable only by their owner.
- `supabase/tests/rls-test.sql` checks these rules against real PostgreSQL: non-members can't read or write, invites work, users can't see each other's consent, and members who leave lose access.

Data already on a device isn't moved into a household automatically. After joining, use **Settings → Copy this device's data into household**, or export a backup and restore it.

---

## Deployment

### Vercel (recommended)

1. Push this repository to GitHub and import it in Vercel. Next.js is detected automatically.
2. Optionally add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` under **Settings → Environment Variables**. They're inlined at build time, so redeploy after changing them.
3. Deploy. Then update the Supabase Site URL and Redirect URLs (step 3 above) to the production domain.

### Any Node host / Docker

```bash
npm ci
NEXT_PUBLIC_SUPABASE_URL=... NEXT_PUBLIC_SUPABASE_ANON_KEY=... npm run build
npm start -- -p 3000
```

Node 20.9+ is required. Serve over **HTTPS**, because service workers and "Add to Home Screen" need a secure origin (localhost is exempt).

### Installing on iPhone

Open the site in Safari → Share → **Add to Home Screen**. The app opens full-screen, respects the notch and home indicator (safe-area insets), and uses 16px inputs so iOS doesn't zoom in on focus.

---

## Architecture

```
src/
  app/                    Routes (client components reading from the PantryProvider)
    page.tsx              Dashboard
    inventory/            List, /new, /[id] edit
    import/               Import hub, /[id] review & pickup/delivery confirmation
    recipes/              Ranked list, /[id] detail
    meal-plan/  shopping/  settings/  settings/integrations/  offline/
    manifest.ts           Web app manifest
  components/
    pantry-provider.tsx   Chooses storage, loads data, mutate() with toasts, Supabase realtime
    app-shell.tsx         Desktop sidebar, mobile header and bottom tab bar, skip link
    ui.tsx                Accessible primitives (Field, Dialog on native <dialog>, states)
  lib/
    types.ts              Domain model
    repository/           PantryRepository interface + LocalRepository + SupabaseRepository
    actions.ts            Multi-step domain operations (import approve/receive, merge, purchase)
    receipt-parser.ts     On-device receipt/order/CSV/.eml parser
    recipes.ts            Recipe library and ingredient matching/ranking
    integrations.ts       Retailer and email integration registry, consent guard
    supabase/             Client and household/auth helpers
supabase/migrations/      SQL schema + RLS + RPCs
supabase/tests/           RLS tests runnable on plain PostgreSQL
tests/unit/               Vitest
e2e/                      Playwright
public/sw.js              Service worker (network-first pages, cache-first hashed assets, never caches Supabase)
```

**Storage abstraction.** The UI only talks to `PantryRepository`. `LocalRepository` (localStorage) is used when Supabase isn't configured or the user isn't in a household. `SupabaseRepository` is used once a signed-in user belongs to one. The same `actions.ts` logic runs on both and is tested against the local implementation.

**Import lifecycle.** In-store purchases go `review` → `received`. Pickup and delivery orders go `review` → `awaiting` → `received`. Either path can be `cancelled` before receipt. Inventory changes only on `received`. A line that matches an existing item (same normalised name, location and unit) adds to that item's quantity and keeps the earlier expiry date.

## Testing

- **Unit/integration (Vitest):** the receipt parser (many real-world line formats, skip rules, CSV, `.eml` decoding), food classification, dates, recipe matching and ranking, local repository CRUD and corruption handling, the import lifecycle, shopping actions, sample data, integration honesty (no connector without opt-in; none claims to be available), and Supabase row mapping/validation with a fake client.
- **End-to-end (Playwright, run on a desktop and an iPhone-sized viewport):**
  - Navigation: every dashboard quick action and nav link; all routes return 200 with no console errors; 404 and not-found states; no horizontal scroll.
  - Inventory: full CRUD, persistence, recovery from corrupt storage.
  - Imports: pickup confirmation flow, in-store import with merge, `.eml` import, cancel flow.
  - Planning: recipes → shopping list and meal plan; meal planner CRUD; shopping list → inventory.
  - Settings: email opt-in consent, integration status page, preferences, backup export/restore, delete-all.
  - Accessibility: **axe-core WCAG 2 A/AA scans** of the primary pages (no serious or critical violations).
- **Database:** `supabase/tests/run.sh` applies the migration twice (it's idempotent) and runs the RLS checks.

### Continuous integration

`.github/workflows/ci.yml` runs on every pull request, on pushes to `master`, and on manual dispatch. It has three parallel jobs:

| Job | Runs |
| --- | --- |
| Typecheck, lint, unit tests, build | `npm ci`, `typecheck`, `lint`, `test`, `build` on Node 22 |
| End-to-end | `npm run test:e2e` (desktop + iPhone viewport, axe scans); uploads the Playwright report when it fails |
| Supabase schema & row-level security | `supabase/tests/run.sh` against a PostgreSQL 16 service container |

Playwright runs with no retries, so a green run means every test passed on its first attempt.

## Accessibility

- Form controls have labels, with hints and errors linked to them.
- Focus rings are visible, and there's a skip-to-content link.
- Navigation uses `aria-current`.
- Modals use the native `<dialog>` element, which handles focus trapping and Esc.
- Toasts are announced through a live region.
- Touch targets are at least 44px.
- Reduced-motion preferences are respected.
- Light and dark colour schemes are checked for contrast by axe.
