# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Agendamento Multi-Nicho: Calendly-style booking SaaS for independent professionals (psychologists, personal trainers, etc). Each professional gets a public booking page (`/<slug>`) with their own service types, weekly availability, and custom intake forms. End clients book without creating an account.

npm workspaces monorepo: `server/` (Express API) + `client/` (React SPA). Code, comments, and commits are in English; user-facing README and product copy are in Portuguese (pt-BR) — match whichever file you're editing.

## Commands

Run from repo root unless noted.

```bash
npm install                              # installs both workspaces
docker compose up -d postgres            # local Postgres
cp server/.env.example server/.env       # then set JWT_SECRET (32+ random chars)
cp client/.env.example client/.env
npm run --workspace server prisma:migrate
npm run --workspace server prisma:seed   # optional: seeds 2 demo professionals

npm run dev:server     # API on :3000
npm run dev:client     # SPA on :5173

npm run test:server    # vitest run, server/
npm run test:client    # vitest run, client/
npm run typecheck:server
npm run typecheck:client
npm run lint            # eslint, whole repo
npm run format          # prettier --write, whole repo
npm run format:check
```

Single test file: `npm run test --workspace server -- path/to/file.test.ts` (or `--workspace client`). Vitest, so `describe.only`/`it.only` also work for scoping during a debug session — remove before committing.

Prisma schema lives at `server/prisma/schema.prisma`; after editing it, run `npm run --workspace server prisma:migrate` to generate a migration (never hand-edit the `migrations/` SQL for a change that hasn't shipped).

CI (`.github/workflows/ci.yml`) runs on push/PR to `main`: lint, format:check, typecheck (both workspaces), `prisma generate`, client tests, `prisma migrate deploy`, server tests, client build — against a real Postgres service container. Match that order locally before pushing if something's failing only in CI.

## Architecture

### Availability engine — the core domain logic

`server/src/modules/availability/engine.ts` is a pure function and the one piece of business logic every booking-related feature routes through. It intersects:

1. the professional's general weekly `Availability`,
2. `ServiceTypeAvailabilityRule` for the chosen service type when one exists for that day (these **replace**, not add to, the general availability for that day),
3. conflicts — confirmed `Booking`s and `BlockedSlot`s —

then slices the result into slots sized to the service type's exact duration. Everything is computed and stored in UTC; conversion to the professional's `timezone` happens only at the display layer (client) or when building ICS/email content. Any change to slot calculation, new availability constraint, or new conflict source belongs here, not duplicated in a route handler.

`server/src/modules/public/public.service.ts` exposes this for the public booking flow; `server/src/modules/bookings/bookings.service.ts` calls it again server-side to revalidate before insert (see below) — never trust a slot the client sends back.

### Booking concurrency

Public booking creation (`bookings.service.ts`) never trusts the client-submitted time. It re-runs the availability engine to revalidate, then inserts under a Postgres `EXCLUDE` constraint (see `server/prisma/migrations`, tested in `server/prisma/exclusion-constraint.test.ts` and `server/test/booking-concurrency.test.ts`) so two simultaneous requests for the same slot can't both succeed — the DB is the final authority, not the app-layer check.

### Auth

Short-lived JWT access token, kept in memory on the client only (never `localStorage`) + long-lived refresh token in an `httpOnly` cookie, silently renewed on app load (`client/src/lib/auth-context.tsx`). In production the refresh cookie uses `sameSite=none; secure=true` because frontend (Vercel) and backend (Render/Railway) are on different domains — don't "simplify" this to `sameSite=lax` for prod. `server/src/middleware/requireAuth.ts` gates authenticated routes; every authenticated route additionally filters by the `userId` from the token (per-resource authorization, not just per-login) — see `server/src/modules/*/[...].service.ts` for the pattern before adding a new authenticated endpoint.

### Server module layout

Each domain lives under `server/src/modules/<name>/` with up to four files: `*.routes.ts` (Express router), `*.schemas.ts` (Zod input validation), `*.service.ts` (business logic + Prisma calls), `*.test.ts`. Follow this split for new modules — routes stay thin, validation and logic don't leak into route handlers.

### Client structure

- `client/src/pages/public-booking/` — the unauthenticated booking flow (service select → calendar/slots → form → confirmation), state coordinated by `usePublicBooking.ts`.
- `client/src/pages/panel/` — the authenticated professional dashboard (agenda, availability, service types, blocked slots), gated by `ProtectedRoute`.
- `client/src/lib/api.ts` — fetch wrapper; `client/src/lib/dynamic-form-schema.ts` builds Zod schemas at runtime from a service type's `CustomFormField` definitions (drives both React Hook Form validation and rendering of TEXT/NUMBER/SELECT/TEXTAREA fields).
- TanStack Query handles server-state caching/sync; don't hand-roll fetch-and-setState for data that belongs in a query hook.

### Dynamic custom forms

`ServiceType.requiresCustomForm` + `CustomFormField` (ordered, typed: TEXT/NUMBER/SELECT/TEXTAREA, with a `FieldType` enum in `schema.prisma`) let each professional define per-service intake fields. Field definitions are stored as data, not code — `dynamic-form-schema.ts` (client) and `form-validation.ts` (server) both derive validation from the stored field list, and both must be updated together if `FieldType` ever gains a variant.

### Vercel middleware (`client/middleware.ts`)

Edge middleware, separate from the SPA and from the Express server. Two jobs: (1) detects bot/crawler user agents on `/:slug` and returns server-rendered HTML with correct title/meta/OG tags (reads `API_URL`, not `VITE_API_URL` — the former is a Vercel project env var read at runtime, the latter gets baked into the client bundle at build time); (2) serves `/sitemap.xml` dynamically from `GET /api/public/sitemap-slugs`. Falls through to the normal SPA for human visitors or when `API_URL` is unset.

## Notable non-obvious decisions

- `server/src/app.ts` sets `trust proxy` to `1` hop, assumed for Render/Railway — flagged in the README deploy checklist as needing confirmation once real infra exists; a wrong value defeats per-IP rate limiting or collectively blocks all visitors behind one IP.
- Public GET endpoints (`/api/public/:slug`, `/api/public/:slug/service-types`) are cached 30s (`Cache-Control`); the slots endpoint is never cached since it changes on every booking.
- Email (`server/src/lib/email/`) uses a real SMTP transport only when all four `SMTP_*` env vars are set; otherwise falls back to an Ethereal test account in dev — no real email sends without that config.
- `SEED_DEMO_PASSWORD` is required (script refuses to run without it) when `NODE_ENV=production`, to avoid the dev-documented `demo1234` password reaching a production seed.

## Design/product docs

`DESIGN.md` at repo root tracks an ongoing design-critique backlog (prioritized P0/P1/P2/P3 items) for the public booking page — check it before starting UI work there so you don't duplicate or contradict an already-planned item.
