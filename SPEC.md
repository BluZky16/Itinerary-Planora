# Itinerary: Spec

Reference for the tech stack and everything needed to build the app. Decisions here were made in planning; items marked **(verify)** must be checked at the start of the phase that uses them.

## 1. Goal

A cross-platform app (iOS, Android, web) to plan trips day by day, attach real places, see them on a map, track costs against a budget, mark countries visited or on a wishlist, and share a read-only plan.

## 2. Scope

### App menus

Bottom tabs on phone; on wide web screens the same menus show as a sidebar. Create Trip is a button on My Itineraries that opens a form, not a tab.

| Menu | Shows | Built in |
|---|---|---|
| Dashboard | Stats (trips, countries visited, total planned cost) and the upcoming trip | Phase 5 (empty shell in phase 2) |
| My Itineraries | List of trips; opening one shows the day-by-day timeline of activities | Phase 2 (list) and phase 3 (timeline) |
| Explore Places | Search destinations and places, see them on a map, save to a trip | Phase 4 |
| My Travel Map | Mark countries as visited or wishlist | Phase 5 |
| Budget Planner | Budget per trip, planned cost, remaining, breakdown by item type | Phase 5 |
| Create Trip (form) | New trip: title, destination, dates, optional budget | Phase 2 |

### v1 (must have)

1. **Accounts:** email + password (sign-up and password reset confirmed with a 6-digit emailed code, typed into the app; no redirect link, so no deep-link setup), and guest mode (Supabase anonymous sign-in) that can later be saved as an email + password account. This replaced the earlier email-code-only sign-in. No Google login in v1 (planned next, web first; see v2), to avoid Apple's Sign in with Apple requirement for now.
2. **Trips:** create, edit, delete. Title, destination, start date, end date.
3. **Day-by-day plan:** days generated from trip dates. Items have type, time, title, place, notes, cost. Add, edit, delete, reorder, move between days.
4. **Places:** Google Places autocomplete; picking a place stores `place_id`, name, coordinates.
5. **Map:** pins for the day's items; tapping an item focuses its pin.
6. **Open in Google Maps:** deep link on each item with a place.
7. **Offline viewing:** a trip that was opened once can be read offline. No offline editing in v1.
8. **Share link:** read-only public page for one trip; can be revoked.
9. **Costs:** per-item cost; trip total is the sum. Transport (train/bus/taxi/flight) is entered by hand.
10. **Empty, loading, error states** on every screen.
11. **Explore Places:** search places and destinations without a trip open; see results on a map; "save to trip" adds an item to a chosen day.
12. **Budget Planner:** optional budget per trip; shows planned total, remaining, and a breakdown by item type. One cost field per item (planned amount); no separate "actually paid" field in v1.
13. **My Travel Map:** mark any country as visited or wishlist. First version is a searchable country list with a toggle per country. A shaded world map is a later upgrade because maps differ per platform.
14. **Dashboard:** trips count, countries visited, total planned cost, and the next upcoming trip. All derived from existing tables.

### Item types

`attraction | lodging | restaurant | transport | other`

- `attraction`, `lodging`, `restaurant`: picked through Google Places.
- `transport`: manual entry (mode, from, to, start/end time, cost).

### v2 (out of scope for v1)

Collaborators with edit rights, expense split, a separate "actually paid" amount per item, a shaded world map for Travel Map, offline editing, file attachments (tickets, PDFs), packing list, weather, AI plan suggestions, ticket/email parsing with an LLM, hotel price/availability via booking APIs, PDF export, Google login (next up: web first with Supabase's Google provider; phones need redirect handling, likely `expo-auth-session`) / Sign in with Apple.

### Smaller-option notes (decided to include unless changed)

- Reordering: drag-and-drop is nice but costs two platform-specific libraries. Acceptable v1 fallback: "move up / move down" buttons.
- Share link can be cut from v1 if time is short; solo planning works without it.

## 3. Tech stack

| Layer | Choice | Notes |
|---|---|---|
| App framework | Expo SDK 58 + React Native 0.88 + TypeScript | Scaffolded in phase 1 |
| Routing | Expo Router | File-based; routes become web URLs |
| Styling | NativeWind 4.2.7 + Tailwind 3 | Verified on Expo web (SDK 58) in phase 1. **(verify)** on iOS/Android on a device; NativeWind 4 docs list SDK 57 as tested |
| UI components | Own small components in DaisyUI style | DaisyUI itself is web-CSS only; reuse its look (color tokens, rounded cards, badges), not its package |
| Server state | TanStack Query | Caching, optimistic updates, offline read cache via persister |
| Local state | None by default | Add Zustand only if a screen needs shared client state |
| Backend | Supabase | Postgres, Auth, RLS, Edge Functions |
| Maps (mobile) | `react-native-maps` (Google provider) | |
| Maps (web) | Google Maps JS API (or MapLibre) | Behind the same `TripMap` component |
| Places | Google Places API (New) | Called from a Supabase Edge Function |
| Dates | `date-fns` | |
| Reorder | Move up/down buttons first; `react-native-reanimated` + gesture handler on mobile and `dnd-kit` on web later | |
| Tests | Jest + React Native Testing Library; Playwright for web smoke tests; SQL tests for RLS | |
| Mobile builds | EAS Build / EAS Submit | Apple Developer ($99/yr) and Google Play ($25 once) only needed to ship to stores |
| Web hosting | EAS Hosting or Vercel | **(verify)** at phase 7 |

## 4. Data model (Postgres)

```
profiles(id uuid pk -> auth.users, display_name text)

trips(id uuid pk, owner_id uuid -> profiles, title text, destination text,
      start_date date, end_date date,            -- check: end_date - start_date < 90
      share_token text unique null,
      budget numeric null, currency text null,        -- added in phase 5
      created_at timestamptz)

days(id uuid pk, trip_id uuid -> trips on delete cascade, date date, position int)

items(id uuid pk, day_id uuid -> days on delete cascade, position int,
      type text check in (attraction, lodging, restaurant, transport, other),
      title text, start_time time null, end_time time null,
      place_id text null, place_name text null, lat double null, lng double null,
      from_place text null, to_place text null,   -- transport only
      notes text null, cost numeric null, currency text null,
      created_at timestamptz)

country_marks(user_id uuid -> profiles, country_code char(2),   -- ISO 3166-1 alpha-2; added in phase 5
              status text check in (visited, wishlist),
              primary key (user_id, country_code))
```

Rules:
- All costs in a trip are in the trip's `currency`. `items.currency` is unused in v1 and is dropped in the phase 5 migration.
- Budget remaining = `trips.budget` minus the sum of item costs. The breakdown groups item costs by `type`.
- Dashboard numbers are queries, not stored: trips count, `country_marks` where status is visited, sum of item costs, and the trip with the earliest `start_date` today or later.
- Dates are plain `date`/`time` values in the trip's local time. Do not convert through UTC.
- `position` orders items within a day. The `move_item(item, day, index)` function moves an item within a day or to another day of the same trip and renumbers both days in one transaction.
- Days are kept in sync with the trip dates by the `trips_sync_days` trigger. Changing dates so that a day with items would be removed is refused with a message; the user moves or deletes those items first.
- A trip is at most 90 days (database check and form check), so one row per day stays small.
- Item order is manual (move up/down); items are not auto-sorted by time.
- Transport has no separate mode column: the title carries it ("Train to Bandung").

### Row Level Security

- RLS enabled on every table.
- `trips`: owner can select/insert/update/delete.
- `days`, `items`: allowed when the parent trip is owned by `auth.uid()`.
- `country_marks`: a user can read and write only rows where `user_id` is their own.
- Public share: a database function `get_shared_trip(token text)` returns one trip with its days and items, read-only. Anonymous users have no direct table access.
- Every policy gets a test that signs in as user A and proves user B's data is invisible and unwritable.

## 5. Architecture

```
Expo app (iOS / Android / web)
  |-- supabase-js (auth + CRUD, protected by RLS)
  |-- Edge Function: places-search / place-details  --> Google Places API
  `-- Google Maps (native SDK / JS API)
```

- The app never holds a Google Places key that can be abused. Search and detail calls go through an Edge Function that checks the user is signed in.
- Map keys are restricted per platform (Android package + SHA-1, iOS bundle id, web HTTP referrer).
- Google data handling: store `place_id` plus the user's own fields; re-fetch name, hours, photos and so on when needed. **(verify)** Google's current caching terms before storing coordinates or names long-term.

## 6. Project structure

```
itinerary/
  CLAUDE.md
  SPEC.md
  src/
    app/                 Expo Router screens (route files only)
      _layout.tsx        auth gate + query client
      sign-in.tsx
      (app)/             signed-in only (guarded by the root layout)
        _layout.tsx      stack
        (tabs)/
          _layout.tsx    tab bar / sidebar
          index.tsx      Dashboard
          itineraries.tsx  My Itineraries (trip list)
          explore.tsx    Explore Places
          travel-map.tsx My Travel Map
          budget.tsx     Budget Planner
        trip/new.tsx     Create Trip form
        trip/[id]/index.tsx  trip detail; day-by-day timeline in phase 3
        trip/[id]/edit.tsx
        trip/[id]/item/new.tsx       add item to a day
        trip/[id]/item/[itemId].tsx  edit, move to another day, delete
        trip/[id]/map.tsx
      share/[token].tsx  public read-only view (outside (app))
    api/                 Supabase queries, one file per table
    components/          Button, Card, Badge, Input, TripMap (.native/.web), ...
    lib/                 supabase client, date helpers
  supabase/
    migrations/          schema + RLS policies
    tests/rls.sql        RLS test, run in the SQL editor
    functions/           places-search, place-details
  .env.example
```

## 7. Build phases

Each phase ends with a check and a `/ponytail:ponytail-review`.

1. **Foundation:** scaffold Expo + TS + Router; NativeWind; Supabase project, schema, RLS; email-code sign-in. *Done when:* you can sign in on web and on a phone, and the RLS tests pass.
2. **Trips and app shell:** tab layout with the five tabs (Dashboard, My Itineraries, Explore, Travel Map, Budget), all but My Itineraries as empty placeholders; My Itineraries list; Create Trip form; edit and delete a trip. *Done when:* data persists and shows on both platforms, and every menu opens.
3. **Itinerary core:** auto-generated days; the day-by-day timeline; add/edit/delete/reorder items; move between days; costs and trip total; optimistic updates. *Done when:* a full multi-day trip can be planned.
4. **Places, map and Explore:** Edge Function for Places; autocomplete; pins; "open in Google Maps"; the Explore Places tab with "save to trip". *Done when:* adding a restaurant by search shows it on the map on both web and phone, and Explore can save a place into a trip.
5. **Budget, Dashboard and Travel Map:** migration for `trips.budget`/`currency`, `country_marks` and dropping `items.currency`; Budget Planner screen; Travel Map country list; Dashboard stats and upcoming trip. RLS test extended for `country_marks`. *Done when:* a budget shows remaining and a type breakdown, countries can be marked, and the Dashboard numbers match the data.
6. **Offline read and sharing:** cached trip readable offline; share link create/revoke; public page. *Done when:* airplane-mode read works and an incognito browser sees only the shared trip.
7. **Polish and ship:** empty/loading/error states audit, dark mode, sidebar on wide web, icon and splash, accessibility pass, EAS builds, TestFlight / Play internal testing, web deploy.
8. **v2 backlog:** see section 2.

## 8. Known risks

- **Maps and reorder differ per platform.** Wrap each behind one component with `.native.tsx` / `.web.tsx` files.
- **NativeWind on Expo web** version compatibility is unverified. Check at phase 1; fall back to plain `StyleSheet` tokens if it blocks.
- **RLS mistakes leak data.** Policies are tested with two users before each release.
- **Google costs.** Places and Maps need a billing account. Set budget alerts and quotas. **(verify)** current free tier.
- **Time zones.** Items use local dates and times, not UTC, so a 00:30 dinner stays on its day.
- **Store review.** Email-code-only login avoids Sign in with Apple. Re-check if Google login is added in v2.

## 9. Open decisions

- Visual look and feel (reference apps not chosen yet; mockups can be drafted before phase 3).
- Web hosting provider (EAS Hosting vs Vercel).
- Whether the share link ships in v1.
- Planned vs actually-paid amounts: one cost field in v1; revisit if the Budget Planner feels too thin.
- Travel Map as a shaded world map (v2) vs the country list (v1).

## 10. Accounts and keys needed

| Item | When | Cost |
|---|---|---|
| Supabase project | Phase 1 | Free tier |
| Expo / EAS account | Phase 1 (dev), phase 7 (builds) | Free tier |
| Google Cloud project with billing (Places API New, Maps SDK Android/iOS, Maps JavaScript API) | Phase 4 | Pay-as-you-go with free allowance **(verify)** |
| Apple Developer | Phase 7 | $99/year |
| Google Play Console | Phase 7 | $25 once |

Keys go in `.env` (git-ignored), never in chat or the repo.
