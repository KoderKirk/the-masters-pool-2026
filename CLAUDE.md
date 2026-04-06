# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # Start local dev server (Next.js on localhost:3000)
npm run build    # Production build
npm run start    # Start production server
```

No linter or test suite is configured.

## Environment Setup

Copy `.env.example` to `.env.local` and fill in:
- `NEXT_PUBLIC_SUPABASE_URL` — your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — your Supabase anon/public key
- `NEXT_PUBLIC_JOIN_PASSWORD` — pool entry password (default: `masters2026`)
- `SUPABASE_SERVICE_ROLE_KEY` — service role key for admin API routes (bypasses RLS)

## Architecture

**Stack:** Next.js 15 (App Router) + React 19 + Supabase (auth + Postgres)

All pages are `'use client'` components. There is no SSR. Most data fetching happens client-side via the Supabase JS client. Admin privileged operations use Next.js API routes (`/api/admin/`) with the service role key.

**Database (Supabase):**
- `golfers` — roster with point values and live scores (`current_score`, `made_cut`, `position`)
- `profiles` — extends Supabase auth users; stores `display_name`, `is_admin`, `payment_status`, `payment_method`, `payment_handle`
- `entries` — up to 3 per user; each has 4 golfer FK references and `total_points_used`
- `pool_settings` — key/value table for admin toggles (e.g. `show_leader` boolean)
- `entry_leaderboard` — Postgres VIEW that computes team scores (best 3 of 4, drop worst), DQ status, and `RANK()`

RLS is enabled on all tables. Golfers are read-only for all users. Entries and profiles are user-scoped (users can only write their own rows). Admin payment updates bypass RLS via the `/api/admin/update-payment` API route using the service role key.

**IMPORTANT — `is_admin` safety:** Never include `is_admin` in any upsert/update payload from the client. If you include it, it will overwrite the existing value and can demote admins to regular users. The `is_admin` field is only set directly in Supabase.

**Routing:**
- `/` — join (signup) or login form; requires pool password to register; shows Dashboard when logged in
- `/pick` — My Picks page; auth-gated, redirects to `/` if unauthenticated; golfer selection, entry management, payment info
- `/leaderboard` — live leaderboard using Supabase Realtime subscriptions on `golfers` and `entries` tables; supports search and favorites
- `/rules` — static rules page; visible to all users (no auth required)
- `/admin` — admin panel (Entries, Payments, Scores tabs); redirects non-admins to `/`

**Admin API Routes (`src/app/api/admin/`):**
- `update-payment/route.ts` — verifies caller is admin via anon client, then uses service role key to update `payment_status` on any profile (bypasses RLS)
- `create-user/route.ts` — exists but is not currently used in the UI

**Shared utilities (`src/lib/supabase.ts`):**
- `supabase` — singleton Supabase client (anon key)
- `formatScore(score)` — converts numeric score to golf display format (`E`, `+3`, `-5`)

**Styling:** All CSS is global inline styles defined in `src/app/layout.tsx` via a `<style>` tag. CSS custom properties (`--green`, `--gold`, `--cream`, `--red`, `--gray`, `--border`, `--white`, `--dark`) define the Augusta-themed palette. Utility classes (`.btn`, `.btn-primary`, `.btn-danger`, `.btn-ghost`, `.card`, `.input`, `.tag-*`, `.fade-in`, `.pulse`) are defined there. Do not add external CSS files or CSS modules.

**Favorites:** Stored in `localStorage` under key `masters_favorites` (array of entry IDs). No DB schema needed. Favorites appear above the main leaderboard table and in a card on the Dashboard.

## Database Setup

Run in order in Supabase SQL Editor:
1. `supabase/schema.sql` — creates tables, the `entry_leaderboard` view, RLS policies, and the `handle_new_user` trigger
2. `supabase/seed.sql` — inserts the golfer roster with point values

**If updating the `entry_leaderboard` view:** You cannot use `CREATE OR REPLACE VIEW` if column names changed — Postgres will error. Always `DROP VIEW IF EXISTS entry_leaderboard;` first, then `CREATE VIEW entry_leaderboard AS ...`.

**Payment info columns** — if not yet applied, run:
```sql
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS payment_method TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS payment_handle TEXT;
```

## Key Business Rules

- 4 golfers per entry, combined points ≤ 50
- Up to 3 entries per user ($20 each)
- Best 3 of 4 scores count; worst dropped
- Need ≥ 3 **active** golfers (made cut or TBD) or entry is DQ'd — an entry is only DQ'd when 2+ golfers are **confirmed** missed cut (`made_cut = false`). TBD (`made_cut = null`) is still active and must NOT trigger DQ.
- Payouts: 1st = 65%, 2nd = 25%, 3rd = 10%
- Entries lock Thursday 5am PT (enforced via admin "Lock All" button in Entries tab, not automatically)
- Admin scores are entered manually in the Scores tab (integer vs par, e.g. -5 for 5-under)
- Payment info (Venmo/PayPal) is collected on the My Picks page and stored in `profiles.payment_method` / `profiles.payment_handle`
- Payment status is set by admin in the Payments tab; users cannot set their own payment status

## DQ Logic (entry_leaderboard view)

The view uses `missed_cut_count` (not `made_cut_count`):
```sql
(CASE WHEN cut_1 = false THEN 1 ELSE 0 END +
 CASE WHEN cut_2 = false THEN 1 ELSE 0 END +
 CASE WHEN cut_3 = false THEN 1 ELSE 0 END +
 CASE WHEN cut_4 = false THEN 1 ELSE 0 END) AS missed_cut_count

-- is_disqualified when 2+ golfers confirmed missed cut
CASE WHEN missed_cut_count > 1 THEN TRUE ELSE FALSE END AS is_disqualified
```

`CASE WHEN cut_x = false` evaluates to 0 when `cut_x` is `null` (TBD), so TBD golfers never contribute to DQ. The old pattern `COALESCE(cut_x::int, 0)` was wrong because it treated `null` the same as `false` (both → 0 → missed).
