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

## Architecture

**Stack:** Next.js 15 (App Router) + React 19 + Supabase (auth + Postgres)

All pages are `'use client'` components. There is no server-side rendering or API routes — all data fetching happens client-side via the Supabase JS client.

**Database (Supabase):**
- `golfers` — roster with point values and live scores (`current_score`, `made_cut`, `position`)
- `profiles` — extends Supabase auth users; stores `display_name`, `is_admin`, `payment_status`
- `entries` — up to 3 per user; each has 4 golfer FK references and `total_points_used`
- `entry_leaderboard` — Postgres VIEW that computes team scores (best 3 of 4, drop worst), DQ status (< 3 made cut), and `RANK()`

RLS is enabled on all tables. Golfers are read-only for all users. Entries and profiles are user-scoped. Admin actions (score updates, payment marking, locking entries) go through the Supabase client directly — there is no server-side admin API. The `is_admin` check happens client-side in `/admin/page.tsx`.

**Routing:**
- `/` — join (signup) or login form; requires pool password to register
- `/pick` — golfer selection UI; auth-gated, redirects to `/` if unauthenticated
- `/leaderboard` — live leaderboard using Supabase Realtime subscriptions on `golfers` and `entries` tables
- `/admin` — admin panel (entries overview, payment tracking, score entry); redirects non-admins to `/`

**Shared utilities (`src/lib/supabase.ts`):**
- `supabase` — singleton Supabase client
- `formatScore(score)` — converts numeric score to golf display format (`E`, `+3`, `-5`)

**Styling:** All CSS is global inline styles defined in `src/app/layout.tsx` via a `<style>` tag. CSS custom properties (`--green`, `--gold`, `--cream`, etc.) define the Augusta-themed palette. Utility classes (`.btn`, `.card`, `.input`, `.tag-*`, `.fade-in`, `.pulse`) are defined there.

## Database Setup

Run in order in Supabase SQL Editor:
1. `supabase/schema.sql` — creates tables, the `entry_leaderboard` view, RLS policies, and the `handle_new_user` trigger
2. `supabase/seed.sql` — inserts the golfer roster with point values

The leaderboard scoring rule: team score = sum of all 4 golfer scores minus the worst (highest) score. DQ = fewer than 3 golfers made the cut (once cut data is available).

## Key Business Rules

- 4 golfers per entry, combined points ≤ 50
- Up to 3 entries per user ($20 each)
- Best 3 of 4 scores count; worst dropped
- Need ≥ 3 golfers to make the cut or entry is DQ'd
- Entries lock Thursday 5am PT (enforced via admin "Lock All" button, not automatically)
- Admin scores are entered manually in the Scores tab (integer vs par, e.g. -5 for 5-under)
test
