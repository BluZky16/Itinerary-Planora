# Itinerary (Planora)

A trip planner: create trips, plan them day by day, track costs against a budget, mark the countries you have
visited, and share a read-only link to a trip. One Expo (React Native) codebase targets iOS, Android and web.

**Live web app:** https://bluzky-itinerary.expo.app

> Status: everything below is built and checked on **web**. iOS and Android have not been tested yet.

---

## Contents

- [Features](#features)
- [Tech stack](#tech-stack)
- [Project structure](#project-structure)
- [Getting started](#getting-started)
- [Supabase setup](#supabase-setup)
- [Running and checking](#running-and-checking)
- [Deploying the web app](#deploying-the-web-app)
- [How it works](#how-it-works)
- [Roadmap](#roadmap)
- [Security notes](#security-notes)

---

## Features

| Area | What it does |
|---|---|
| **Accounts** | Email + password (sign-up and password reset are confirmed with a 6-digit emailed code). **Guest mode**: start instantly with no account, then save it later with an email and password to keep the trips. |
| **Dashboard** | Card layout: account, a 6-month trip calendar, the next upcoming trip, previous trips, and a world map with travel days, countries visited and trips planned. |
| **My Itineraries** | List, create, edit and delete trips (title, destination, dates, optional budget and currency). |
| **Day-by-day plan** | Days are created from the trip dates. Items (attraction, lodging, restaurant, transport, other) have time, place, notes and cost. Reorder within a day and move between days. |
| **Budget** | Budget per trip: planned total, remaining, and a breakdown by item type. Costs in different currencies are never added together. |
| **Travel Map** | Mark any country as visited or wishlist. Searchable list on every platform, plus a coloured world map on the web dashboard. |
| **Share link** | A read-only public page for one trip (title, dates, days and items; no costs or notes). It can be revoked at any time. |
| **Offline read** | Screens opened while online stay readable offline for 7 days. There is no offline editing. |
| **Look** | Pastel "glass" style, light and dark mode (follows the system), top pill navigation on wide screens, bottom tabs on phones and tablets. |
| **Explore** | Placeholder. Place search and maps need Google Places (planned, see [Roadmap](#roadmap)). |

## Tech stack

- **Expo SDK 58**, React Native 0.88, React 19, TypeScript (strict), **Expo Router** (file-based routes in `src/app/`)
- **NativeWind 4** (Tailwind classes on native and web) with small in-house components and DaisyUI-style colour tokens
- **Supabase**: Postgres, Auth, Row Level Security (RLS), SQL functions
- **TanStack Query 5** for server state, persisted to AsyncStorage (localStorage on web) for offline read
- **Jest** (`jest-expo`) for unit tests; SQL test scripts for the database
- **EAS Hosting** for the web build

## Project structure

```
src/
  app/                  Routes only (every file here becomes a screen)
    _layout.tsx         Root: session, theme variables, offline cache, route guards
    sign-in.tsx         Sign in / create account / reset password / continue as guest
    share/[token].tsx   Public read-only trip page (works signed out)
    (app)/              Signed-in screens (guarded by the root layout)
      (tabs)/           Dashboard, My Itineraries, Explore, Travel Map, Budget
      trip/             New, detail, edit, and item screens
      account.tsx       "Save your account" for guests
  api/                  Data access, one file per table (trips, items, country marks, shared trip)
  components/           Shared UI (Button, Input, Chips, DateField, WorldMap, toast, ...)
  lib/                  Helpers: theme, plan maths and formatting, forms, session, query cache, world map data
supabase/
  migrations/           SQL migrations, applied in file-name order
  tests/                SQL tests, run in the Supabase SQL editor (each rolls back)
SPEC.md                 Full product spec and build phases
CLAUDE.md / AGENTS.md   Conventions for AI coding assistants
```

Platform differences live in paired files behind one component name, for example
`date-field.tsx` (phones) and `date-field.web.tsx` (browser), `world-map.tsx` (phones: nothing) and
`world-map.web.tsx` (SVG map). Screens never branch on `Platform.OS` for big differences.

## Getting started

### Prerequisites

- Node.js 24 and npm 11 (other recent versions probably work)
- A Supabase project (the free plan is enough)
- For phones: the Expo Go app or a development build (not tested yet)

### Install

```bash
git clone https://github.com/BluZky16/Itinerary-Planora.git
cd Itinerary-Planora
npm install
```

### Environment

Copy the example file and fill in your Supabase project's URL and anon (publishable) key from
**Supabase dashboard > Project Settings > API**:

```bash
cp .env.example .env
```

```
EXPO_PUBLIC_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=YOUR-ANON-KEY
```

`.env` is git-ignored. The anon key is safe in the client only because RLS is on for every table.
Never put the service-role key or the database password in the app.

## Supabase setup

There is no Supabase CLI in this workflow: SQL is pasted into the dashboard's **SQL editor**.

### 1. Database

Run each file in `supabase/migrations/` in order:

1. `20261101000000_init.sql`: tables, RLS policies
2. `20261102000000_days_and_moves.sql`: days created from trip dates (`trips_sync_days` trigger), `move_item()`
3. `20261103000000_budget_and_countries.sql`: trip budget and currency, `country_marks`
4. `20261104000000_share_link.sql`: `share_trip()`, `get_shared_trip()`

Then run every file in `supabase/tests/`. Each ends with one "... tests passed" row and rolls back its test data.
Re-run all of them after every new migration. Tests that update or delete rows raise a "Potential issue detected"
dialog in the editor; confirming is expected, because they run inside a transaction that is rolled back.

### 2. Authentication

In **Authentication > Sign In / Providers**:

- **Email**: enabled, with **Confirm email** on.
- **Allow anonymous sign-ins**: on (guest mode). Consider turning on CAPTCHA (Cloudflare Turnstile), since anyone can
  create guest users. Supabase rate-limits anonymous sign-ins per IP.
- **Minimum password length**: 8 (the app also asks for at least 8).

In **Authentication > Emails > Templates**, the app expects a **6-digit code**, not a link (it has no link handling).
Make these templates show `{{ .Token }}`:

| Template | Used for |
|---|---|
| Confirm sign up | Creating an account |
| Reset password | "Forgot password?" |
| Change email address | A guest saving their account |

Example body: `<p>Your Itinerary code is <strong>{{ .Token }}</strong>.</p>`

### 3. Email delivery (SMTP)

Supabase's built-in email is heavily rate-limited. This project sends auth email through
[Resend](https://resend.com) as custom SMTP (**Authentication > Emails > SMTP settings**):
host `smtp.resend.com`, port `465`, user `resend`, password = a Resend API key.

Until a domain is verified in Resend, emails only reach the Resend account owner's address, so other people
cannot confirm sign-ups or reset passwords. Verify a domain and use a sender on it before inviting real users.

### 4. A test account

Create one in **Authentication > Users > Add user** (email + password, auto-confirm). Keep its password out of the
repo and out of the app. Every account only sees its own trips (RLS), so a shared test login sees and edits
the same data for everyone who uses it.

## Running and checking

```bash
npx expo start          # then press w for web, or scan the QR code on a phone
```

| Command | What it checks |
|---|---|
| `npx tsc --noEmit` | TypeScript |
| `npx expo lint` | ESLint (`eslint-config-expo`) |
| `npm test` | Jest unit tests (plan maths, forms, pickers, countries, map zoom) |

Unit tests sit next to the code as `*.test.ts`, never inside `src/app/` (every file there becomes a route).

Tips:

- The first web bundle after adding a route or package can take a minute. Reloading during the build restarts it.
- After `npm install` replaces a package while the dev server runs, restart the server.
- On Windows PowerShell, if `npx` fails with "running scripts is disabled on this system", use `npx.cmd` or Git Bash.

## Deploying the web app

The web build is a single-page app (`web.output: "single"` in `app.json`) hosted on EAS Hosting.

```bash
npx expo export --platform web
npx -y eas-cli@latest deploy --prod --non-interactive
```

The `.env` values are baked into the bundle at export time.

After a deploy, check that production really serves the new build: compare the `__common-<hash>.js` file name in
`curl https://bluzky-itinerary.expo.app/` with the one in `dist/index.html`. If they differ, point the production
alias at the new deployment:

```bash
npx -y eas-cli@latest deploy:alias --prod --id <deployment-id> --non-interactive
```

## How it works

- **Theme:** one palette per colour scheme in `src/lib/theme.ts`. The root layout sets the colours as CSS
  variables (NativeWind `vars()`), and Tailwind tokens (`bg-base-100`, `text-primary`, `bg-accent`, ...) read them.
  There are no `dark:` classes. Change colours only in `theme.ts`. On web, `src/global.css` adds the page gradient
  and the glass cards' shadow and blur. Titles use the Permanent Marker font, loaded on web by a `<Head>` link
  (phones fall back to the system font).
- **Days and ordering:** the database owns days (`trips_sync_days` trigger). The app never inserts days. Reordering
  and moving items go through `move_item()`, which renumbers positions; the app applies the same move to its cache
  first for an instant update.
- **Costs:** every cost in a trip uses the trip's currency. Totals are rounded to cents.
- **Guest mode:** a guest is a Supabase anonymous user with a real user ID, so the same RLS policies apply.
  "Save your account" adds an email (confirmed by code) and then a password to that same user, so the trips stay.
  Signing out as a guest loses access for good, which is why guests see "Save account" instead of "Sign out".
- **Offline read:** the TanStack Query cache is saved per user for 7 days. Bump `CACHE_VERSION` in
  `src/lib/query.ts` whenever the shape of cached data changes. Sign-out clears the memory cache and the saved copy.
  Share-page data is never saved.
- **Share link:** `share_trip()` creates an unguessable token (owner only); revoking clears it.
  `get_shared_trip(token)` is `security definer` and returns only title, dates, days and items.
- **World map:** `src/lib/world-map.ts` is generated from Natural Earth 1:110m countries (public domain),
  Miller projection, with each country's box taken from its largest landmass. Very small countries are not on it.

## Roadmap

1. **Google login**: web first, with Supabase's Google provider (needs a Google Cloud OAuth client). Phones need
   redirect handling, likely with `expo-auth-session`.
2. **Phones**: an Android development build, then TestFlight / Play internal testing (needs Apple Developer and
   Google Play accounts).
3. **Places, maps and Explore** (parked): Google Places through a Supabase Edge Function, place autocomplete in the
   item form, trip map, "open in Google Maps", Explore with "save to trip".
4. Later ideas are listed in `SPEC.md` (v2): collaborators, expense split, offline editing, attachments, and more.

## Security notes

- RLS is on for every table, and each policy is tested with two different users (`supabase/tests/`).
- Secrets live in `.env` (git-ignored) or in Supabase settings, never in the repo.
- Signed-out visitors can only call `get_shared_trip(token)`; the tables return nothing to them.
- Supabase errors are plain objects: show them with `errorMessage()` from `src/lib/errors.ts`.
