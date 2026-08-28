# Design Spec — Agendamento Multi-Nicho SaaS

Status: Approved by user 2026-08-27. Source requirements: `prompt-claude-code-agendamento.md` (root). Visual system: `DESIGN.md` (root).

## 1. Purpose

A Calendly-style booking SaaS for independent professionals across different
niches (psychologists, personal trainers, hairdressers, etc.). Each
professional defines their own service types, each with its own duration,
availability rules, and optional custom intake form. Clients book through a
public per-professional link with no login required.

## 2. Goals / Non-goals

**Goals:** professional registration + service-type CRUD, dynamic
per-service-type availability, a correct dynamic slot-availability
calculation, race-safe booking creation, dynamic custom intake forms,
email confirmations, a professional's agenda view, seed data for two demo
professionals, styling per `DESIGN.md`.

**Non-goals (this spec):** social/OAuth login, password reset, email
verification, payments, SMS notifications, recurring bookings,
multi-professional teams/orgs, a native mobile app, production deploy
execution (deploy *instructions* are a deliverable; actually provisioning
hosted infra is not part of this implementation pass).

## 3. Tech Stack

- **Frontend:** React + Vite + TypeScript + TailwindCSS
- **Backend:** Node.js + Express + TypeScript
- **Database:** PostgreSQL (local: Docker Compose)
- **ORM:** Prisma
- **Auth:** JWT access token + httpOnly refresh-token cookie (own
  implementation, no OAuth)
- **Email (dev):** Nodemailer + Ethereal (fake SMTP, preview-URL emails in
  logs) behind a swappable interface — a later switch to Resend or real SMTP
  requires no changes to calling code
- **Testing:** Vitest (server + client)
- **Repo shape:** npm workspaces monorepo (`server/`, `client/`)

These choices were left open by the source prompt and resolved with the user
during design (see conversation history 2026-08-27): separate Express API +
Vite frontend over a Next.js monolith (keeps the frontend stack the user
named), Docker Postgres over a hosted instance for local dev, Ethereal over
Resend for now.

## 4. Data Model (Prisma)

All monetary/duration/date reasoning in this system happens in UTC at the
storage layer; local time only appears at the display layer and when
resolving a professional's *recurring* weekly availability (see §6).

### User (the professional)
| Field | Type | Notes |
|---|---|---|
| id | String (cuid) | PK |
| name | String | |
| email | String | unique |
| passwordHash | String | bcrypt |
| slug | String | unique, used in the public URL `/:slug` |
| timezone | String | IANA tz name, e.g. `America/Sao_Paulo` |
| niche | String? | e.g. "Psicologia", "Personal Trainer" — display-only, drives the public page's niche badge / category-accent color per `DESIGN.md`. **Addition beyond the source prompt's literal model** — justified because the product is explicitly "multi-nicho" and the two seed professionals are differentiated by exactly this. |
| createdAt / updatedAt | DateTime | |

### ServiceType
| Field | Type | Notes |
|---|---|---|
| id | String (cuid) | PK |
| userId | String | FK → User, `onDelete: Cascade` |
| name | String | |
| durationMinutes | Int | |
| description | String? | |
| requiresCustomForm | Boolean | default false |
| createdAt / updatedAt | DateTime | |

Deleting a `ServiceType` that has any `Booking` rows is rejected at the DB
level (`onDelete: Restrict` from `Booking.serviceType`) — no soft-delete /
archive flag is introduced; the API surfaces the FK error as a 409 with a
clear message ("cancele os agendamentos antes de remover este tipo de
serviço").

### CustomFormField
| Field | Type | Notes |
|---|---|---|
| id | String (cuid) | PK |
| serviceTypeId | String | FK → ServiceType, `onDelete: Cascade` |
| label | String | |
| fieldType | Enum: `TEXT, NUMBER, SELECT, TEXTAREA` | |
| required | Boolean | |
| order | Int | display order |
| options | Json? | **Addition beyond the source prompt's literal model** — required for `SELECT` fields to have choices; a select field with nowhere to store its options is not implementable. `null`/unused for non-SELECT types. |

Custom fields are managed as part of their parent `ServiceType`'s
create/update payload (the API replaces the full array on update) rather
than through independent CRUD endpoints — there are only ever a handful per
service type and they have no independent lifecycle.

### Availability (professional's general weekly schedule)
| Field | Type | Notes |
|---|---|---|
| id | String (cuid) | PK |
| userId | String | FK → User, `onDelete: Cascade` |
| dayOfWeek | Int | 0 (Sunday) – 6 (Saturday) |
| startTime | `@db.Time` | local wall-clock, relative to `User.timezone` |
| endTime | `@db.Time` | local wall-clock, relative to `User.timezone` |

### ServiceTypeAvailabilityRule
Same shape as `Availability` but scoped to one `ServiceType` (FK
`serviceTypeId`, `onDelete: Cascade`). When any rows exist for a given
service type + weekday, they **override** (not add to) the general
`Availability` for that weekday when computing slots for that service type
— see §6 step 1.

### Booking
| Field | Type | Notes |
|---|---|---|
| id | String (cuid) | PK |
| userId | String | FK → User. Denormalized copy of `serviceType.userId` — needed so the anti-overlap DB constraint (§7) can scope efficiently without a join. |
| serviceTypeId | String | FK → ServiceType, `onDelete: Restrict` |
| clientName | String | |
| clientEmail | String | |
| startsAt | DateTime | UTC instant |
| endsAt | DateTime | UTC instant |
| status | Enum: `CONFIRMED, CANCELLED` | |
| formResponses | Json? | answers keyed by `CustomFormField.id` |
| createdAt | DateTime | |

### BlockedSlot
| Field | Type | Notes |
|---|---|---|
| id | String (cuid) | PK |
| userId | String | FK → User, `onDelete: Cascade` |
| startsAt | DateTime | UTC instant |
| endsAt | DateTime | UTC instant |
| reason | String? | |

**Deviation from the source prompt's literal model**: the prompt described
`data` + `horaInicio` + `horaFim`. This spec uses a single `startsAt`/`endsAt`
UTC range instead — identical shape to `Booking`, so the overlap-filtering
logic in §6 treats blocked slots and confirmed bookings uniformly instead of
two different time representations.

### RefreshToken
| Field | Type | Notes |
|---|---|---|
| id | String (cuid) | PK |
| userId | String | FK → User, `onDelete: Cascade` |
| tokenHash | String | SHA-256 of the refresh token, never store raw |
| expiresAt | DateTime | |
| revokedAt | DateTime? | null while active |

**Addition beyond the source prompt's literal model** — required to satisfy
the global rule that sessions must be revocable (logout, compromise), which
a bare stateless JWT can't provide on its own.

## 5. Timezone Handling

- `User.timezone` is the professional's home timezone (IANA name).
- `Availability.startTime`/`endTime` and
  `ServiceTypeAvailabilityRule.startTime`/`endTime` are **recurring local
  wall-clock times** relative to that timezone — "Monday 9am" must stay 9am
  local through DST transitions, so these are never stored as fixed UTC
  offsets.
- `Booking.startsAt`/`endsAt` and `BlockedSlot.startsAt`/`endsAt` are
  **absolute UTC instants** — once a slot is booked it's booked at one fixed
  point in time regardless of later DST changes.
- Conversion between the two only happens in the availability engine (§6,
  step 2), using `date-fns-tz`.
- The client (booking page) displays available slots in the *browser's*
  local timezone, not the professional's — conversion happens client-side
  from the UTC ISO strings the API returns.

## 6. Availability Calculation Engine

A pure function `getAvailableSlots(professional, serviceType, date)`:

1. **Resolve local windows for the weekday of `date`**: if any
   `ServiceTypeAvailabilityRule` rows exist for `(serviceType, dayOfWeek)`,
   use those exclusively; otherwise fall back to `Availability` rows for
   `(professional, dayOfWeek)`. No rows in either → no slots that day.
2. **Convert each local window to a UTC instant range** for the specific
   calendar date requested, using `professional.timezone` (`date-fns-tz`,
   DST-aware).
3. **Generate candidate slots**: step through each UTC window in
   `serviceType.durationMinutes` increments; a candidate slot must fit
   entirely inside the window (no partial trailing slot).
4. **Subtract conflicts**: fetch all `Booking` rows with `status:
   CONFIRMED` and all `BlockedSlot` rows for that professional whose
   `[startsAt, endsAt)` overlaps the date's UTC range; drop any candidate
   slot that overlaps any of them.
5. **Drop past slots**: if `date` is today (in the professional's
   timezone), drop candidates whose start is before "now."
6. Return remaining candidates as UTC ISO instants.

This is implemented as a pure function with no I/O beyond the two read
queries in step 4, so it is fully unit-testable without a database for
steps 1–3 and 5–6, and with a seeded test DB for step 4's integration
coverage. No caching or pre-materialization layer — nothing here is
expected to be slow enough to justify one; add if profiling says otherwise.

## 7. Concurrency — No Double-Booking

A Postgres `EXCLUDE` constraint (needs the `btree_gist` extension), added
via a hand-written raw-SQL migration since Prisma's schema DSL can't express
exclusion constraints natively:

```sql
CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE "Booking"
  ADD CONSTRAINT no_overlapping_confirmed_bookings
  EXCLUDE USING gist (
    "userId" WITH =,
    tsrange("startsAt", "endsAt") WITH &&
  )
  WHERE (status = 'CONFIRMED');
```

The booking-creation endpoint (§9) performs its own application-level check
first (for a fast, friendly error), then attempts the `INSERT` inside a
transaction. If two requests race past the application check, the database
constraint itself rejects the second `INSERT`; the API catches that specific
Postgres error code (`23P01`, exclusion violation) and returns `409
Conflict` — "esse horário acabou de ser reservado, escolha outro." This
satisfies the source prompt's "tratar isso com transação/lock no banco"
requirement without app-level row locking.

## 8. Auth

- Passwords hashed with bcrypt (cost 12).
- `POST /api/auth/login` issues a JWT access token (15 min expiry, returned
  in the response body) and a refresh token (7 day expiry, random 256-bit
  value, stored server-side only as a SHA-256 hash in `RefreshToken`, sent
  to the client as an httpOnly + Secure + SameSite=Lax cookie).
- `POST /api/auth/refresh` reads the refresh cookie, verifies it against
  `RefreshToken` (hash match, not expired, not revoked), issues a new access
  token, and **rotates** the refresh token (marks the old row revoked, issues
  a new one) — limits the blast radius of a leaked refresh token.
- `POST /api/auth/logout` marks the current `RefreshToken` row revoked and
  clears the cookie.
- Panel routes require a valid access token (Bearer header); public booking
  routes (§9) require no auth.
- CSRF: since the refresh flow is cookie-based and state-changing, refresh
  and logout are protected by `SameSite=Lax` (blocks cross-site POST) plus
  requiring the access token for any *other* state-changing panel route
  (which isn't cookie-based, so it isn't CSRF-exposed).

## 9. API Surface

All JSON, prefixed `/api`. Panel routes require `Authorization: Bearer
<access token>`.

**Auth (public)**
- `POST /auth/register` `{name, email, password, slug, timezone, niche?}`
- `POST /auth/login` `{email, password}`
- `POST /auth/refresh`
- `POST /auth/logout`

**Panel (protected)**
- `GET /me`
- `GET /service-types` · `POST /service-types` · `GET /service-types/:id` ·
  `PATCH /service-types/:id` · `DELETE /service-types/:id`
  (create/update payload includes the full `customFields` array; update
  replaces it wholesale)
- `GET /availability` · `PUT /availability` (full weekly-rule array replace)
- `GET /service-types/:id/availability-rules` ·
  `PUT /service-types/:id/availability-rules` (full replace)
- `GET /blocked-slots?from=&to=` · `POST /blocked-slots` ·
  `DELETE /blocked-slots/:id`
- `GET /bookings?from=&to=&status=` · `PATCH /bookings/:id/cancel`

**Public (unauthenticated, by slug)**
- `GET /public/:slug` → `{name, niche, timezone}`
- `GET /public/:slug/service-types` → list, including `customFields` for
  any service type where `requiresCustomForm` is true
- `GET /public/:slug/service-types/:id/slots?date=YYYY-MM-DD` → available
  UTC slot-start instants for that date
- `POST /public/:slug/bookings`
  `{serviceTypeId, startsAt, clientName, clientEmail, formResponses}`

## 10. Custom Form Validation

`formResponses` submitted with a booking are re-validated server-side
against the *current* `CustomFormField` rows for that service type
(required fields present, values match `fieldType`, `SELECT` values are
one of `options`) before the booking transaction runs. Client-side
validation exists for UX but is never trusted alone.

## 11. Email

`server/src/lib/email/` exposes one interface —
`sendMail({to, subject, html})` — with a `nodemailer.ts` implementation
configured against Ethereal for local/dev use (logs a preview URL per send).
Two emails are sent on successful booking: one to the client, one to the
professional. Swapping to Resend or a real SMTP provider later is a
same-interface implementation swap, not a change to any caller.

## 12. Testing Strategy

Vitest across both workspaces.

- **Availability engine (§6):** the highest-value test target — pure-function
  unit tests covering DST transitions, service-type rule overrides vs.
  general availability, slot generation at window boundaries, and conflict
  subtraction against overlapping bookings/blocked slots.
- **Booking concurrency (§7):** an integration test against a real (test)
  Postgres that fires two concurrent booking requests at the same slot and
  asserts exactly one succeeds.
- **CRUD + auth:** lighter integration coverage — happy path plus the
  authorization boundary (a professional cannot read/modify another
  professional's data — per-resource authorization, not just "is logged
  in").

## 13. Folder Structure

```
server/
  src/
    modules/
      auth/
      service-types/
      availability/       # the engine from §6, pure functions + tests
      bookings/
      blocked-slots/
      public/             # public booking-page endpoints, by slug
    lib/
      prisma.ts
      email/
        index.ts           # interface
        nodemailer.ts       # current implementation
    middleware/
    app.ts
    server.ts
  prisma/
    schema.prisma
    migrations/
    seed.ts
  test/
  .env.example
  package.json
client/
  src/
    pages/
      panel/               # professional dashboard (protected)
      public-booking/      # /:slug public flow
    components/
    lib/
    styles/                # DESIGN.md tokens as Tailwind theme + CSS vars
  index.html
  package.json
  tailwind.config.ts
docker-compose.yml           # local Postgres
package.json                 # root workspace + shared scripts
README.md
DESIGN.md
design-reference/
docs/superpowers/specs/
```

## 14. Build Phases

1. Repo scaffold: workspaces, Prisma schema + migrations (including the raw
   `EXCLUDE` constraint), docker-compose, seed script with the two demo
   professionals.
2. Auth: register/login/refresh/logout, protected-route middleware.
3. Service-type CRUD (incl. nested custom form fields).
4. Availability config CRUD (general + per-service-type rules).
5. Availability calculation engine (§6) + BlockedSlot CRUD. Heaviest test
   investment here.
6. Public booking flow: service-type selection → slot picker → dynamic
   form → race-safe booking creation (§7) → confirmation emails (§11).
7. Professional's agenda view (list bookings) + cancel booking.
8. Styling pass: translate `DESIGN.md` tokens into `tailwind.config.ts` and
   apply across both flows (calendar/slot states, service-type cards,
   forms, nav — per `DESIGN.md`'s Components section).
9. README (setup, env vars, architecture summary — especially §6/§7) +
   deploy instructions (Vercel + Render/Railway).

## 15. Explicitly Deferred / Open

- Actual hosted deploy (Vercel/Render/Railway account provisioning) is out
  of scope for implementation; phase 9 produces instructions only.
- Swapping Ethereal for Resend is a future task, not part of this spec's
  scope — the interface in §11 is what makes that swap cheap later.
- No admin/superadmin role, no multi-professional organizations — one
  `User` row is one independent professional; not modeled for future
  multi-tenancy beyond that.
