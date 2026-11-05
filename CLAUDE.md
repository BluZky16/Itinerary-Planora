# Itinerary

A trip-planning app: create trips, plan them day by day, see places on a map, share the plan.
One Expo (React Native) codebase runs on iOS, Android and web.

Full details (stack, data model, features, phases) are in [SPEC.md](SPEC.md). Read it before building anything.

## Stack (short)

- Expo + TypeScript + Expo Router (one codebase: iOS, Android, web)
- NativeWind (Tailwind classes that work on native) with our own DaisyUI-style components
- Supabase: Postgres, Auth (email + password with emailed 6-digit codes, guest via anonymous sign-in), Row Level Security (RLS), Edge Functions
- TanStack Query for server state
- Google Places API (New) and Google Maps for places and map
- EAS for mobile builds, web hosted separately

## App menus

Dashboard, My Itineraries, Explore Places, My Travel Map, Budget Planner, plus a Create Trip form (a button on My Itineraries). Bottom tabs on phone and tablet, a top bar with pill tabs on wide web (>= 1024 px). Which phase builds each is in SPEC.md section 2 and 7.

## Commands

- `npx expo start` run the app (press `w` for web)
- `npx tsc --noEmit` typecheck
- `npx expo lint` lint
- `npm test` unit tests (Jest, `jest-expo` preset). Test files sit next to the code as `*.test.ts`, never inside `src/app/` (every file there becomes a route). Add `/// <reference types="jest" />` at the top: TypeScript 6 no longer loads `@types/*` automatically.
- Database tests: after every migration, run each file in `supabase/tests/` in the Supabase SQL editor. Each ends with one "... tests passed" row and rolls back its test data.

## Conventions

- TypeScript strict. No `any` without a one-line reason.
- Screens live in `src/app/` (Expo Router, this Expo SDK's default). Everything else is under `src/`: data access in `src/api/` (one file per table), shared UI in `src/components/`, helpers in `src/lib/`. Only route files go in `src/app/`. Signed-in screens go in `src/app/(app)/`; the root layout guards that whole group, so a screen placed outside it is public.
- Expo ships breaking changes each SDK. Check https://docs.expo.dev/versions/ for the installed SDK before using an Expo API, and add packages with `npx expo install`.
- Platform splits use `.native.tsx` / `.web.tsx` files behind one shared component name (for example `TripMap`). Screens never check `Platform.OS` for big differences.
- DaisyUI is CSS only and does not run on native. Do not import it. Build small components (`Button`, `Card`, `Badge`, `Input`) with NativeWind classes and DaisyUI-like color tokens.
- Every table has RLS on. Never ship a table without a policy. Test each policy with two different users.
- Secrets never go in the repo. Use `.env` (git-ignored) and keep `.env.example` current. The Supabase anon key may be in the client only because RLS is on. Google API keys used for Places are called from an Edge Function, not from the app.
- Store the Google `place_id` plus the user's own fields. Do not store other Google place data long-term (check Google's current terms).
- After sign-out the root layout clears the TanStack Query cache and the copy saved on the device (offline read). Keep it that way, so a second user on the same device never sees cached trips.
- Days are created and removed by the `trips_sync_days` trigger from the trip dates; never insert days from the app. Reorder or move items only through the `move_item` database function, which renumbers positions.
- Supabase errors are plain objects, not `Error`: show them with `errorMessage()` from `src/lib/errors.ts`.
- Keep changes small. Build the smallest thing that does the job; v2 items in SPEC.md stay out of v1.

## Working agreement

- Work one phase at a time (see SPEC.md). Finish and verify a phase before starting the next.
- Verify UI work on web in the browser and on a phone/emulator before calling it done.
- Run `/ponytail:ponytail-review` after each phase.
- Ask before adding a new dependency or a paid service.
