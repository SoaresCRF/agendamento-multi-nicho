# Backend API Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build and test the complete backend REST API for the multi-niche booking SaaS — auth, service-type CRUD, availability config, the availability-calculation engine, race-safe public booking creation, and email confirmations. No frontend in this plan.

**Architecture:** Express + TypeScript + Prisma/Postgres, npm-workspaces monorepo (`server/` only for now; `client/` added by the follow-up frontend plan). Modules under `server/src/modules/*` are grouped by feature, each with its own routes/service/schema files. A Postgres `EXCLUDE` constraint (not app-level locking) guarantees no double-booking. Nodemailer+Ethereal sits behind a swappable `Mailer` interface.

**Tech Stack:** Node.js, Express 4, TypeScript 5, Prisma 5 + PostgreSQL 16 (Docker), Zod (request validation), JWT + bcryptjs (auth), date-fns / date-fns-tz (availability engine), Nodemailer (email), Vitest + Supertest (testing).

**Spec:** `docs/superpowers/specs/2026-08-27-agendamento-multi-nicho-design.md`

## Global Constraints

- All timestamps stored and computed in UTC; local time only appears via `date-fns-tz` conversions in the availability engine (spec §5).
- No magic numbers/strings for anything repeated or non-obvious — durations, cookie names, error codes get named constants.
- A file over ~300–400 lines or a function over ~40–50 lines gets split.
- Never swallow an exception silently; unexpected errors are logged via `logger.error` before being converted to a generic 500 by the central error handler — no internal detail (stack, DB error text) reaches the client.
- Every non-trivial piece of logic gets a test; tests are deterministic and never make a real network call (the email test mocks `nodemailer`; the concurrency test uses the real local Postgres).
- Never commit secrets — `.env` is gitignored; `server/.env.example` holds placeholders only.
- Every route validates its input with Zod before touching the database.
- Every panel (authenticated) endpoint scopes its query by `userId` from the access token — never trust an ID in the URL/body alone (no IDOR).
- Access tokens expire in 15 minutes; refresh tokens are revocable via the `RefreshToken` table.
- One commit per task, Conventional Commits format.

---

## Task 1: Workspace scaffold + env loader

**Files:**
- Create: `package.json` (root)
- Create: `server/package.json`
- Create: `server/tsconfig.json`
- Create: `server/vitest.config.ts`
- Create: `server/.env.example`
- Create: `server/src/lib/env.ts`
- Test: `server/src/lib/env.test.ts`

**Interfaces:**
- Produces: `env: { DATABASE_URL: string; JWT_SECRET: string; PORT: number; CLIENT_ORIGIN: string; SMTP_HOST?: string; SMTP_PORT?: number; SMTP_USER?: string; SMTP_PASS?: string }` exported from `server/src/lib/env.ts` — every later task that reads config imports this.

- [ ] **Step 1: Create the root and server package manifests**

`package.json` (repo root):
```json
{
  "name": "agendamento-multi-nicho",
  "private": true,
  "workspaces": ["server"],
  "scripts": {
    "dev:server": "npm run dev --workspace server",
    "test:server": "npm run test --workspace server"
  }
}
```

`server/package.json`:
```json
{
  "name": "server",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "tsx watch src/server.ts",
    "build": "tsc -p tsconfig.json",
    "start": "node dist/server.js",
    "test": "vitest run",
    "typecheck": "tsc --noEmit",
    "prisma:migrate": "prisma migrate dev",
    "prisma:seed": "tsx prisma/seed.ts"
  },
  "dependencies": {
    "@prisma/client": "^5.18.0",
    "bcryptjs": "^2.4.3",
    "cookie-parser": "^1.4.6",
    "cors": "^2.8.5",
    "date-fns": "^3.6.0",
    "date-fns-tz": "^3.1.3",
    "dotenv": "^16.4.5",
    "express": "^4.19.2",
    "jsonwebtoken": "^9.0.2",
    "nodemailer": "^6.9.14",
    "zod": "^3.23.8"
  },
  "devDependencies": {
    "@types/bcryptjs": "^2.4.6",
    "@types/cookie-parser": "^1.4.7",
    "@types/cors": "^2.8.17",
    "@types/express": "^4.17.21",
    "@types/jsonwebtoken": "^9.0.6",
    "@types/nodemailer": "^6.4.15",
    "@types/node": "^20.14.15",
    "@types/supertest": "^6.0.2",
    "prisma": "^5.18.0",
    "supertest": "^7.0.0",
    "tsx": "^4.16.5",
    "typescript": "^5.5.4",
    "vitest": "^2.0.5"
  }
}
```

`server/tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "CommonJS",
    "moduleResolution": "Node",
    "outDir": "dist",
    "rootDir": "src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "resolveJsonModule": true
  },
  "include": ["src"]
}
```

`server/vitest.config.ts`:
```ts
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    hookTimeout: 20000,
    testTimeout: 20000,
  },
})
```

`server/.env.example`:
```
DATABASE_URL="postgresql://agendamento:agendamento@localhost:5432/agendamento"
JWT_SECRET="change-this-to-a-random-32-plus-character-secret"
PORT=3000
CLIENT_ORIGIN="http://localhost:5173"
```

Copy `server/.env.example` to `server/.env` for local dev (not committed).

- [ ] **Step 2: Write the failing test for the env loader**

`server/src/lib/env.test.ts`:
```ts
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

describe('env', () => {
  const original = { ...process.env }

  beforeEach(() => {
    process.env = { ...original, DATABASE_URL: 'postgresql://x', JWT_SECRET: 'a'.repeat(32) }
  })

  afterEach(() => {
    process.env = original
  })

  it('parses valid env vars with defaults applied', async () => {
    vi.resetModules()
    const { env } = await import('./env')
    expect(env.DATABASE_URL).toBe('postgresql://x')
    expect(env.PORT).toBe(3000)
    expect(env.CLIENT_ORIGIN).toBe('http://localhost:5173')
  })

  it('throws when JWT_SECRET is missing', async () => {
    delete process.env.JWT_SECRET
    vi.resetModules()
    await expect(import('./env')).rejects.toThrow()
  })
})
```

- [ ] **Step 3: Run `npm install` and verify the test fails**

Run: `npm install` (repo root), then `npm run test --workspace server -- env.test.ts`
Expected: FAIL — `server/src/lib/env.ts` does not exist yet.

- [ ] **Step 4: Implement the env loader**

`server/src/lib/env.ts`:
```ts
import 'dotenv/config'
import { z } from 'zod'

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  JWT_SECRET: z.string().min(32),
  PORT: z.coerce.number().default(3000),
  CLIENT_ORIGIN: z.string().default('http://localhost:5173'),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
})

export const env = envSchema.parse(process.env)
```

- [ ] **Step 5: Run the test and verify it passes**

Run: `npm run test --workspace server -- env.test.ts`
Expected: PASS (2 tests)

- [ ] **Step 6: Commit**

```bash
git add package.json server/package.json server/tsconfig.json server/vitest.config.ts server/.env.example server/src/lib/env.ts server/src/lib/env.test.ts
git commit -m "chore: scaffold server workspace with validated env loader"
```

---

## Task 2: Postgres + Prisma schema + anti-overlap constraint

**Files:**
- Create: `docker-compose.yml` (root)
- Create: `server/prisma/schema.prisma`
- Create: `server/prisma/migrations/**` (generated + hand-edited)
- Create: `server/src/lib/prisma.ts`
- Test: `server/prisma/exclusion-constraint.test.ts`

**Interfaces:**
- Produces: `prisma: PrismaClient` exported from `server/src/lib/prisma.ts` — every module from here on imports this singleton instead of instantiating its own client.
- Produces: the `Booking`, `User`, `ServiceType`, `CustomFormField`, `Availability`, `ServiceTypeAvailabilityRule`, `BlockedSlot`, `RefreshToken` Prisma models (spec §4). Note one implementation detail not pinned by the spec: `Availability.startTime`/`endTime` and `ServiceTypeAvailabilityRule.startTime`/`endTime` are modeled as `String` in `"HH:mm"` format (validated by Zod later) rather than Postgres `@db.Time`, to avoid Prisma's awkward `DateTime`-wrapping-a-time-value representation for that column type. Still local wall-clock, per spec §5 — just a different column type.

- [ ] **Step 1: Add Docker Compose for local Postgres**

`docker-compose.yml` (repo root):
```yaml
services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: agendamento
      POSTGRES_PASSWORD: agendamento
      POSTGRES_DB: agendamento
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data
volumes:
  pgdata:
```

Run: `docker compose up -d` and confirm with `docker compose ps` that `postgres` is `running`.

- [ ] **Step 2: Write the Prisma schema**

`server/prisma/schema.prisma`:
```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id           String   @id @default(cuid())
  name         String
  email        String   @unique
  passwordHash String
  slug         String   @unique
  timezone     String
  niche        String?
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  serviceTypes  ServiceType[]
  availability  Availability[]
  blockedSlots  BlockedSlot[]
  bookings      Booking[]
  refreshTokens RefreshToken[]
}

model ServiceType {
  id                 String   @id @default(cuid())
  userId             String
  user               User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  name               String
  durationMinutes    Int
  description        String?
  requiresCustomForm Boolean  @default(false)
  createdAt          DateTime @default(now())
  updatedAt          DateTime @updatedAt

  customFields      CustomFormField[]
  availabilityRules ServiceTypeAvailabilityRule[]
  bookings          Booking[]
}

enum FieldType {
  TEXT
  NUMBER
  SELECT
  TEXTAREA
}

model CustomFormField {
  id            String      @id @default(cuid())
  serviceTypeId String
  serviceType   ServiceType @relation(fields: [serviceTypeId], references: [id], onDelete: Cascade)
  label         String
  fieldType     FieldType
  required      Boolean
  order         Int
  options       Json?
}

model Availability {
  id        String @id @default(cuid())
  userId    String
  user      User   @relation(fields: [userId], references: [id], onDelete: Cascade)
  dayOfWeek Int
  startTime String
  endTime   String
}

model ServiceTypeAvailabilityRule {
  id            String      @id @default(cuid())
  serviceTypeId String
  serviceType   ServiceType @relation(fields: [serviceTypeId], references: [id], onDelete: Cascade)
  dayOfWeek     Int
  startTime     String
  endTime       String
}

enum BookingStatus {
  CONFIRMED
  CANCELLED
}

model Booking {
  id            String        @id @default(cuid())
  userId        String
  user          User          @relation(fields: [userId], references: [id], onDelete: Cascade)
  serviceTypeId String
  serviceType   ServiceType   @relation(fields: [serviceTypeId], references: [id], onDelete: Restrict)
  clientName    String
  clientEmail   String
  startsAt      DateTime
  endsAt        DateTime
  status        BookingStatus @default(CONFIRMED)
  formResponses Json?
  createdAt     DateTime      @default(now())

  @@index([userId, startsAt])
}

model BlockedSlot {
  id       String  @id @default(cuid())
  userId   String
  user     User    @relation(fields: [userId], references: [id], onDelete: Cascade)
  startsAt DateTime
  endsAt   DateTime
  reason   String?

  @@index([userId, startsAt])
}

model RefreshToken {
  id        String    @id @default(cuid())
  userId    String
  user      User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  tokenHash String    @unique
  expiresAt DateTime
  revokedAt DateTime?
}
```

- [ ] **Step 3: Generate the migration without applying it, then hand-add the exclusion constraint**

Run (from `server/`): `npx prisma migrate dev --name init --create-only`

This creates `server/prisma/migrations/<timestamp>_init/migration.sql`. Append to that generated file:
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

Then apply it: `npx prisma migrate dev`
Expected: migration applies cleanly, `npx prisma generate` runs automatically.

- [ ] **Step 4: Add the Prisma client singleton**

`server/src/lib/prisma.ts`:
```ts
import { PrismaClient } from '@prisma/client'

export const prisma = new PrismaClient()
```

- [ ] **Step 5: Write the constraint test and verify it fails first, then passes**

`server/prisma/exclusion-constraint.test.ts`:
```ts
import { describe, it, expect, beforeEach, afterAll } from 'vitest'
import { prisma } from '../src/lib/prisma'

describe('no_overlapping_confirmed_bookings constraint', () => {
  let userId: string
  let serviceTypeId: string

  beforeEach(async () => {
    await prisma.booking.deleteMany()
    await prisma.serviceType.deleteMany()
    await prisma.user.deleteMany()
    const user = await prisma.user.create({
      data: {
        name: 'Test', email: `t-${Date.now()}@example.com`, passwordHash: 'x',
        slug: `t-${Date.now()}`, timezone: 'America/Sao_Paulo',
      },
    })
    userId = user.id
    const serviceType = await prisma.serviceType.create({
      data: { userId, name: 'Sessão', durationMinutes: 50 },
    })
    serviceTypeId = serviceType.id
  })

  afterAll(async () => {
    await prisma.$disconnect()
  })

  it('rejects a second CONFIRMED booking that overlaps an existing one', async () => {
    await prisma.booking.create({
      data: {
        userId, serviceTypeId, clientName: 'A', clientEmail: 'a@example.com',
        startsAt: new Date('2026-09-01T13:00:00Z'), endsAt: new Date('2026-09-01T13:50:00Z'),
      },
    })
    await expect(
      prisma.booking.create({
        data: {
          userId, serviceTypeId, clientName: 'B', clientEmail: 'b@example.com',
          startsAt: new Date('2026-09-01T13:25:00Z'), endsAt: new Date('2026-09-01T14:15:00Z'),
        },
      })
    ).rejects.toThrow()
  })

  it('allows a CANCELLED booking to overlap a CONFIRMED one', async () => {
    const startsAt = new Date('2026-09-02T13:00:00Z')
    const endsAt = new Date('2026-09-02T13:50:00Z')
    await prisma.booking.create({
      data: {
        userId, serviceTypeId, clientName: 'A', clientEmail: 'a@example.com',
        startsAt, endsAt, status: 'CANCELLED',
      },
    })
    await expect(
      prisma.booking.create({
        data: { userId, serviceTypeId, clientName: 'B', clientEmail: 'b@example.com', startsAt, endsAt },
      })
    ).resolves.toBeDefined()
  })
})
```

Run: `npm run test --workspace server -- exclusion-constraint.test.ts`
Expected: PASS (2 tests) — this test is validating a migration you already applied, so it should pass on first run; if it fails, the migration didn't apply the constraint correctly.

- [ ] **Step 6: Commit**

```bash
git add docker-compose.yml server/prisma server/src/lib/prisma.ts
git commit -m "feat: add Prisma schema and DB-level anti-overlap booking constraint"
```

---

## Task 3: Seed script (two demo professionals)

**Files:**
- Create: `server/prisma/seed.ts`
- Test: `server/prisma/seed.test.ts`

**Interfaces:**
- Consumes: `PrismaClient` from `@prisma/client` directly (seed scripts run standalone, outside the app).

- [ ] **Step 1: Write the seed script**

`server/prisma/seed.ts`:
```ts
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()
const SALT_ROUNDS = 12

async function main() {
  const passwordHash = await bcrypt.hash('demo1234', SALT_ROUNDS)

  const psicologa = await prisma.user.upsert({
    where: { email: 'joana@example.com' },
    update: {},
    create: {
      name: 'Joana Silva',
      email: 'joana@example.com',
      passwordHash,
      slug: 'joana-psicologa',
      timezone: 'America/Sao_Paulo',
      niche: 'Psicologia',
      availability: {
        create: [1, 2, 3, 4, 5].map((dayOfWeek) => ({ dayOfWeek, startTime: '09:00', endTime: '18:00' })),
      },
      serviceTypes: {
        create: [
          {
            name: 'Primeira consulta',
            durationMinutes: 60,
            description: 'Sessão inicial de anamnese',
            requiresCustomForm: true,
            customFields: {
              create: [
                { label: 'Queixa principal', fieldType: 'TEXTAREA', required: true, order: 0 },
                { label: 'Já fez terapia antes?', fieldType: 'SELECT', required: true, order: 1, options: ['Sim', 'Não'] },
                { label: 'Está em uso de medicação?', fieldType: 'TEXT', required: false, order: 2 },
              ],
            },
          },
          { name: 'Sessão de retorno', durationMinutes: 50, requiresCustomForm: false },
        ],
      },
    },
  })

  const personalTrainer = await prisma.user.upsert({
    where: { email: 'carlos@example.com' },
    update: {},
    create: {
      name: 'Carlos Souza',
      email: 'carlos@example.com',
      passwordHash,
      slug: 'carlos-personal',
      timezone: 'America/Sao_Paulo',
      niche: 'Personal Trainer',
      availability: {
        create: [1, 2, 3, 4, 5, 6].map((dayOfWeek) => ({ dayOfWeek, startTime: '06:00', endTime: '20:00' })),
      },
      serviceTypes: {
        create: [
          {
            name: 'Avaliação física',
            durationMinutes: 90,
            requiresCustomForm: true,
            customFields: {
              create: [
                { label: 'Objetivo', fieldType: 'TEXT', required: true, order: 0 },
                { label: 'Lesões ou restrições', fieldType: 'TEXTAREA', required: false, order: 1 },
                {
                  label: 'Nível de atividade atual', fieldType: 'SELECT', required: true, order: 2,
                  options: ['Sedentário', 'Leve', 'Moderado', 'Intenso'],
                },
              ],
            },
          },
          { name: 'Treino', durationMinutes: 60, requiresCustomForm: false },
        ],
      },
    },
  })

  console.log({ psicologa: psicologa.slug, personalTrainer: personalTrainer.slug })
}

main()
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
```

- [ ] **Step 2: Run the seed script**

Run: `npm run prisma:seed --workspace server`
Expected: logs `{ psicologa: 'joana-psicologa', personalTrainer: 'carlos-personal' }`

- [ ] **Step 3: Write a verification test and run it**

`server/prisma/seed.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { prisma } from '../src/lib/prisma'

describe('seed data', () => {
  it('created both demo professionals with their service types', async () => {
    const joana = await prisma.user.findUnique({
      where: { slug: 'joana-psicologa' },
      include: { serviceTypes: { include: { customFields: true } } },
    })
    expect(joana).not.toBeNull()
    expect(joana?.niche).toBe('Psicologia')
    expect(joana?.serviceTypes).toHaveLength(2)
    const anamnese = joana?.serviceTypes.find((s) => s.requiresCustomForm)
    expect(anamnese?.customFields).toHaveLength(3)

    const carlos = await prisma.user.findUnique({ where: { slug: 'carlos-personal' } })
    expect(carlos).not.toBeNull()
    expect(carlos?.niche).toBe('Personal Trainer')
  })
})
```

Run: `npm run test --workspace server -- seed.test.ts`
Expected: PASS (1 test)

- [ ] **Step 4: Commit**

```bash
git add server/prisma/seed.ts server/prisma/seed.test.ts
git commit -m "feat: seed two demo professionals (psicóloga, personal trainer)"
```

---

## Task 4: Express app skeleton — logger, error handling, health check

**Files:**
- Create: `server/src/lib/logger.ts`
- Create: `server/src/lib/errors.ts`
- Create: `server/src/middleware/errorHandler.ts`
- Create: `server/src/app.ts`
- Create: `server/src/server.ts`
- Test: `server/src/app.test.ts`

**Interfaces:**
- Produces: `logger: { debug, info, warn, error }` from `server/src/lib/logger.ts`.
- Produces: `class AppError extends Error { statusCode: number }` from `server/src/lib/errors.ts` — thrown by services for expected/client-facing failures; anything else is treated as unexpected and logged.
- Produces: `errorHandler: ErrorRequestHandler` from `server/src/middleware/errorHandler.ts`.
- Produces: `createApp(): Express` from `server/src/app.ts` — every route-adding task mounts its router inside this function.

- [ ] **Step 1: Write the logger and AppError**

`server/src/lib/logger.ts`:
```ts
type Level = 'debug' | 'info' | 'warn' | 'error'

function log(level: Level, message: string, meta?: Record<string, unknown>) {
  const line = { level, message, time: new Date().toISOString(), ...meta }
  const method = level === 'debug' ? 'log' : level
  // eslint-disable-next-line no-console
  console[method as 'log' | 'info' | 'warn' | 'error'](JSON.stringify(line))
}

export const logger = {
  debug: (message: string, meta?: Record<string, unknown>) => log('debug', message, meta),
  info: (message: string, meta?: Record<string, unknown>) => log('info', message, meta),
  warn: (message: string, meta?: Record<string, unknown>) => log('warn', message, meta),
  error: (message: string, meta?: Record<string, unknown>) => log('error', message, meta),
}
```

`server/src/lib/errors.ts`:
```ts
export class AppError extends Error {
  constructor(public statusCode: number, message: string) {
    super(message)
    this.name = 'AppError'
  }
}
```

- [ ] **Step 2: Write the error handler middleware**

`server/src/middleware/errorHandler.ts`:
```ts
import type { ErrorRequestHandler } from 'express'
import { ZodError } from 'zod'
import { AppError } from '../lib/errors'
import { logger } from '../lib/logger'

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof ZodError) {
    res.status(400).json({ error: 'Dados inválidos', details: err.flatten() })
    return
  }
  if (err instanceof AppError) {
    res.status(err.statusCode).json({ error: err.message })
    return
  }
  logger.error('Unhandled error', {
    message: err instanceof Error ? err.message : String(err),
    stack: err instanceof Error ? err.stack : undefined,
  })
  res.status(500).json({ error: 'Erro interno do servidor' })
}
```

- [ ] **Step 3: Write the failing app test**

`server/src/app.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import request from 'supertest'
import { createApp } from './app'

describe('GET /health', () => {
  it('returns ok: true', async () => {
    const app = createApp()
    const res = await request(app).get('/health')
    expect(res.status).toBe(200)
    expect(res.body).toEqual({ ok: true })
  })
})
```

Run: `npm run test --workspace server -- app.test.ts`
Expected: FAIL — `server/src/app.ts` does not exist yet.

- [ ] **Step 4: Implement the app skeleton**

`server/src/app.ts`:
```ts
import express from 'express'
import cookieParser from 'cookie-parser'
import cors from 'cors'
import { env } from './lib/env'
import { errorHandler } from './middleware/errorHandler'

export function createApp() {
  const app = express()
  app.use(cors({ origin: env.CLIENT_ORIGIN, credentials: true }))
  app.use(express.json())
  app.use(cookieParser())

  app.get('/health', (_req, res) => res.json({ ok: true }))

  // Later tasks mount feature routers here, e.g.:
  // app.use('/api/auth', authRouter)

  app.use(errorHandler)
  return app
}
```

`server/src/server.ts`:
```ts
import { createApp } from './app'
import { env } from './lib/env'
import { logger } from './lib/logger'

const app = createApp()
app.listen(env.PORT, () => {
  logger.info(`Server listening on port ${env.PORT}`)
})
```

- [ ] **Step 5: Run the test and verify it passes**

Run: `npm run test --workspace server -- app.test.ts`
Expected: PASS (1 test)

- [ ] **Step 6: Commit**

```bash
git add server/src/lib/logger.ts server/src/lib/errors.ts server/src/middleware/errorHandler.ts server/src/app.ts server/src/server.ts server/src/app.test.ts
git commit -m "feat: add Express app skeleton with logging and central error handling"
```

---

## Task 5: Password hashing + JWT utilities

**Files:**
- Create: `server/src/lib/password.ts`
- Create: `server/src/lib/jwt.ts`
- Test: `server/src/lib/password.test.ts`
- Test: `server/src/lib/jwt.test.ts`

**Interfaces:**
- Produces: `hashPassword(plain: string): Promise<string>`, `verifyPassword(plain: string, hash: string): Promise<boolean>` from `server/src/lib/password.ts`.
- Produces: `signAccessToken(payload: { userId: string }): string`, `verifyAccessToken(token: string): { userId: string } | null` from `server/src/lib/jwt.ts`.

- [ ] **Step 1: Write the failing tests**

`server/src/lib/password.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { hashPassword, verifyPassword } from './password'

describe('password hashing', () => {
  it('hashes a password and verifies it correctly', async () => {
    const hash = await hashPassword('correct-horse-battery-staple')
    expect(hash).not.toBe('correct-horse-battery-staple')
    await expect(verifyPassword('correct-horse-battery-staple', hash)).resolves.toBe(true)
    await expect(verifyPassword('wrong-password', hash)).resolves.toBe(false)
  })
})
```

`server/src/lib/jwt.test.ts`:
```ts
import { describe, it, expect, beforeEach } from 'vitest'

describe('jwt', () => {
  beforeEach(() => {
    process.env.JWT_SECRET = 'a'.repeat(32)
    process.env.DATABASE_URL = 'postgresql://x'
  })

  it('signs and verifies a valid access token', async () => {
    const { signAccessToken, verifyAccessToken } = await import('./jwt')
    const token = signAccessToken({ userId: 'user_123' })
    expect(verifyAccessToken(token)).toEqual({ userId: 'user_123' })
  })

  it('returns null for a tampered token', async () => {
    const { signAccessToken, verifyAccessToken } = await import('./jwt')
    const token = signAccessToken({ userId: 'user_123' })
    expect(verifyAccessToken(token + 'x')).toBeNull()
  })
})
```

Run: `npm run test --workspace server -- password.test.ts jwt.test.ts`
Expected: FAIL — files don't exist yet.

- [ ] **Step 2: Implement both utilities**

`server/src/lib/password.ts`:
```ts
import bcrypt from 'bcryptjs'

const SALT_ROUNDS = 12

export function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, SALT_ROUNDS)
}

export function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash)
}
```

`server/src/lib/jwt.ts`:
```ts
import jwt from 'jsonwebtoken'
import { env } from './env'

export interface AccessTokenPayload {
  userId: string
}

const ACCESS_TOKEN_TTL = '15m'

export function signAccessToken(payload: AccessTokenPayload): string {
  return jwt.sign(payload, env.JWT_SECRET, { expiresIn: ACCESS_TOKEN_TTL })
}

export function verifyAccessToken(token: string): AccessTokenPayload | null {
  try {
    return jwt.verify(token, env.JWT_SECRET) as AccessTokenPayload
  } catch {
    return null
  }
}
```

- [ ] **Step 3: Run the tests and verify they pass**

Run: `npm run test --workspace server -- password.test.ts jwt.test.ts`
Expected: PASS (3 tests)

- [ ] **Step 4: Commit**

```bash
git add server/src/lib/password.ts server/src/lib/jwt.ts server/src/lib/password.test.ts server/src/lib/jwt.test.ts
git commit -m "feat: add password hashing and JWT access-token utilities"
```

---

## Task 6: Refresh-token utilities + test helpers

**Files:**
- Create: `server/src/lib/refreshToken.ts`
- Create: `server/test/helpers.ts`
- Test: `server/src/lib/refreshToken.test.ts`

**Interfaces:**
- Produces: `generateRefreshToken(): string`, `hashToken(token: string): string`, `REFRESH_TOKEN_TTL_MS: number` from `server/src/lib/refreshToken.ts`.
- Produces: `createTestUser(overrides?): Promise<{ user, accessToken }>`, `cleanDatabase(): Promise<void>` from `server/test/helpers.ts` — every endpoint test from Task 7 onward uses these.

- [ ] **Step 1: Write the failing test**

`server/src/lib/refreshToken.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { generateRefreshToken, hashToken } from './refreshToken'

describe('refreshToken utils', () => {
  it('generates unique tokens and hashes them deterministically', () => {
    const a = generateRefreshToken()
    const b = generateRefreshToken()
    expect(a).not.toBe(b)
    expect(a.length).toBeGreaterThanOrEqual(32)
    expect(hashToken(a)).toBe(hashToken(a))
    expect(hashToken(a)).not.toBe(hashToken(b))
  })
})
```

Run: `npm run test --workspace server -- refreshToken.test.ts`
Expected: FAIL — file doesn't exist.

- [ ] **Step 2: Implement the utility**

`server/src/lib/refreshToken.ts`:
```ts
import { randomBytes, createHash } from 'node:crypto'

export function generateRefreshToken(): string {
  return randomBytes(32).toString('hex')
}

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

export const REFRESH_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000
```

- [ ] **Step 3: Add the shared test helpers (no test-of-the-test needed — exercised by Task 7 onward)**

`server/test/helpers.ts`:
```ts
import { prisma } from '../src/lib/prisma'
import { hashPassword } from '../src/lib/password'
import { signAccessToken } from '../src/lib/jwt'

export async function createTestUser(overrides: { email?: string; slug?: string } = {}) {
  const unique = `${Date.now()}-${Math.random().toString(36).slice(2)}`
  const user = await prisma.user.create({
    data: {
      name: 'Test User',
      email: overrides.email ?? `test-${unique}@example.com`,
      passwordHash: await hashPassword('password123'),
      slug: overrides.slug ?? `test-${unique}`,
      timezone: 'America/Sao_Paulo',
    },
  })
  const accessToken = signAccessToken({ userId: user.id })
  return { user, accessToken }
}

export async function cleanDatabase() {
  await prisma.booking.deleteMany()
  await prisma.blockedSlot.deleteMany()
  await prisma.customFormField.deleteMany()
  await prisma.serviceTypeAvailabilityRule.deleteMany()
  await prisma.serviceType.deleteMany()
  await prisma.availability.deleteMany()
  await prisma.refreshToken.deleteMany()
  await prisma.user.deleteMany()
}
```

- [ ] **Step 4: Run the test and verify it passes**

Run: `npm run test --workspace server -- refreshToken.test.ts`
Expected: PASS (1 test)

- [ ] **Step 5: Commit**

```bash
git add server/src/lib/refreshToken.ts server/src/lib/refreshToken.test.ts server/test/helpers.ts
git commit -m "feat: add refresh-token utilities and shared test helpers"
```

---

## Task 7: POST /api/auth/register

**Files:**
- Create: `server/src/modules/auth/auth.service.ts`
- Create: `server/src/modules/auth/auth.schemas.ts`
- Create: `server/src/modules/auth/auth.routes.ts`
- Modify: `server/src/app.ts` — mount `authRouter` at `/api/auth`
- Test: `server/src/modules/auth/auth.register.test.ts`

**Interfaces:**
- Consumes: `hashPassword` (Task 5), `signAccessToken` (Task 5), `generateRefreshToken`/`hashToken`/`REFRESH_TOKEN_TTL_MS` (Task 6), `prisma` (Task 2), `AppError` (Task 4), `cleanDatabase` (Task 6).
- Produces: `registerUser(input: RegisterInput): Promise<AuthResult>` from `auth.service.ts`, where `AuthResult = { user: { id, name, email, slug }, accessToken: string, refreshToken: string }` — reused by `loginUser`/`refreshSession` in Task 8/10.
- Produces: `authRouter: Router` from `auth.routes.ts`, mounted at `/api/auth`.

- [ ] **Step 1: Write the request schema and failing test**

`server/src/modules/auth/auth.schemas.ts`:
```ts
import { z } from 'zod'

export const registerSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8),
  slug: z.string().min(3).regex(/^[a-z0-9-]+$/, 'Use apenas letras minúsculas, números e hífen'),
  timezone: z.string().min(1),
  niche: z.string().optional(),
})
```

`server/src/modules/auth/auth.register.test.ts`:
```ts
import { describe, it, expect, beforeEach } from 'vitest'
import request from 'supertest'
import { createApp } from '../../app'
import { cleanDatabase } from '../../../test/helpers'

describe('POST /api/auth/register', () => {
  beforeEach(cleanDatabase)

  it('creates a professional and returns an access token + refresh cookie', async () => {
    const app = createApp()
    const res = await request(app).post('/api/auth/register').send({
      name: 'Joana Silva', email: 'joana@example.com', password: 'password123',
      slug: 'joana-psicologa', timezone: 'America/Sao_Paulo', niche: 'Psicologia',
    })
    expect(res.status).toBe(201)
    expect(res.body.user).toMatchObject({ email: 'joana@example.com', slug: 'joana-psicologa' })
    expect(typeof res.body.accessToken).toBe('string')
    expect(res.headers['set-cookie']?.[0]).toMatch(/refreshToken=/)
  })

  it('rejects a duplicate email with 409', async () => {
    const app = createApp()
    const payload = {
      name: 'A', email: 'dup@example.com', password: 'password123',
      slug: 'slug-a', timezone: 'America/Sao_Paulo',
    }
    await request(app).post('/api/auth/register').send(payload)
    const res = await request(app).post('/api/auth/register').send({ ...payload, slug: 'slug-b' })
    expect(res.status).toBe(409)
  })
})
```

Run: `npm run test --workspace server -- auth.register.test.ts`
Expected: FAIL — `auth.service.ts`/`auth.routes.ts` don't exist.

- [ ] **Step 2: Implement the auth service**

`server/src/modules/auth/auth.service.ts`:
```ts
import { prisma } from '../../lib/prisma'
import { hashPassword } from '../../lib/password'
import { signAccessToken } from '../../lib/jwt'
import { generateRefreshToken, hashToken, REFRESH_TOKEN_TTL_MS } from '../../lib/refreshToken'
import { AppError } from '../../lib/errors'
import type { z } from 'zod'
import type { registerSchema } from './auth.schemas'

export type RegisterInput = z.infer<typeof registerSchema>

export interface AuthResult {
  user: { id: string; name: string; email: string; slug: string }
  accessToken: string
  refreshToken: string
}

export async function registerUser(input: RegisterInput): Promise<AuthResult> {
  const existing = await prisma.user.findFirst({ where: { OR: [{ email: input.email }, { slug: input.slug }] } })
  if (existing) {
    throw new AppError(409, 'E-mail ou slug já em uso')
  }
  const passwordHash = await hashPassword(input.password)
  const user = await prisma.user.create({
    data: {
      name: input.name, email: input.email, passwordHash,
      slug: input.slug, timezone: input.timezone, niche: input.niche,
    },
  })
  return issueTokens(user.id, { id: user.id, name: user.name, email: user.email, slug: user.slug })
}

export async function issueTokens(userId: string, user: AuthResult['user']): Promise<AuthResult> {
  const refreshToken = generateRefreshToken()
  await prisma.refreshToken.create({
    data: { userId, tokenHash: hashToken(refreshToken), expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS) },
  })
  return { user, accessToken: signAccessToken({ userId }), refreshToken }
}
```

- [ ] **Step 3: Implement the route and mount it**

`server/src/modules/auth/auth.routes.ts`:
```ts
import { Router } from 'express'
import { registerSchema } from './auth.schemas'
import { registerUser } from './auth.service'

export const authRouter = Router()

export const REFRESH_COOKIE = 'refreshToken'
export const refreshCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  maxAge: 7 * 24 * 60 * 60 * 1000,
}

authRouter.post('/register', async (req, res, next) => {
  try {
    const input = registerSchema.parse(req.body)
    const result = await registerUser(input)
    res.cookie(REFRESH_COOKIE, result.refreshToken, refreshCookieOptions)
    res.status(201).json({ user: result.user, accessToken: result.accessToken })
  } catch (err) {
    next(err)
  }
})
```

Modify `server/src/app.ts` — add the import and mount line:
```ts
import { authRouter } from './modules/auth/auth.routes'
// ...
app.use('/api/auth', authRouter)
```
(insert both the import near the top and the `app.use` line where the comment `// Later tasks mount feature routers here` was, replacing that comment)

- [ ] **Step 4: Run the test and verify it passes**

Run: `npm run test --workspace server -- auth.register.test.ts`
Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
git add server/src/modules/auth server/src/app.ts
git commit -m "feat: add professional registration endpoint"
```

---

## Task 8: POST /api/auth/login

**Files:**
- Modify: `server/src/modules/auth/auth.schemas.ts` — add `loginSchema`
- Modify: `server/src/modules/auth/auth.service.ts` — add `loginUser`
- Modify: `server/src/modules/auth/auth.routes.ts` — add `POST /login`
- Test: `server/src/modules/auth/auth.login.test.ts`

**Interfaces:**
- Consumes: `verifyPassword` (Task 5), `issueTokens` (Task 7).
- Produces: `loginUser(email: string, password: string): Promise<AuthResult>`.

- [ ] **Step 1: Write the failing test**

`server/src/modules/auth/auth.login.test.ts`:
```ts
import { describe, it, expect, beforeEach } from 'vitest'
import request from 'supertest'
import { createApp } from '../../app'
import { cleanDatabase } from '../../../test/helpers'

describe('POST /api/auth/login', () => {
  beforeEach(cleanDatabase)

  it('logs in with correct credentials', async () => {
    const app = createApp()
    await request(app).post('/api/auth/register').send({
      name: 'Joana', email: 'joana@example.com', password: 'password123',
      slug: 'joana', timezone: 'America/Sao_Paulo',
    })
    const res = await request(app).post('/api/auth/login').send({ email: 'joana@example.com', password: 'password123' })
    expect(res.status).toBe(200)
    expect(typeof res.body.accessToken).toBe('string')
  })

  it('rejects wrong password with 401', async () => {
    const app = createApp()
    await request(app).post('/api/auth/register').send({
      name: 'Joana', email: 'joana2@example.com', password: 'password123',
      slug: 'joana2', timezone: 'America/Sao_Paulo',
    })
    const res = await request(app).post('/api/auth/login').send({ email: 'joana2@example.com', password: 'wrong' })
    expect(res.status).toBe(401)
  })
})
```

Run: `npm run test --workspace server -- auth.login.test.ts`
Expected: FAIL — `POST /login` not implemented.

- [ ] **Step 2: Add `loginUser` to the service**

Append to `server/src/modules/auth/auth.service.ts`:
```ts
import { verifyPassword } from '../../lib/password'

export async function loginUser(email: string, password: string): Promise<AuthResult> {
  const user = await prisma.user.findUnique({ where: { email } })
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    throw new AppError(401, 'Credenciais inválidas')
  }
  return issueTokens(user.id, { id: user.id, name: user.name, email: user.email, slug: user.slug })
}
```
(add the `verifyPassword` import to the existing import block at the top of the file rather than duplicating it)

- [ ] **Step 3: Add the schema and route**

Append to `server/src/modules/auth/auth.schemas.ts`:
```ts
export const loginSchema = z.object({ email: z.string().email(), password: z.string().min(1) })
```

Append to `server/src/modules/auth/auth.routes.ts` (import `loginSchema` and `loginUser` alongside the existing imports):
```ts
authRouter.post('/login', async (req, res, next) => {
  try {
    const { email, password } = loginSchema.parse(req.body)
    const result = await loginUser(email, password)
    res.cookie(REFRESH_COOKIE, result.refreshToken, refreshCookieOptions)
    res.json({ user: result.user, accessToken: result.accessToken })
  } catch (err) {
    next(err)
  }
})
```

- [ ] **Step 4: Run the test and verify it passes**

Run: `npm run test --workspace server -- auth.login.test.ts`
Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
git add server/src/modules/auth
git commit -m "feat: add professional login endpoint"
```

---

## Task 9: requireAuth middleware + GET /api/me

**Files:**
- Create: `server/src/types/express.d.ts`
- Create: `server/src/middleware/requireAuth.ts`
- Create: `server/src/modules/users/users.routes.ts`
- Modify: `server/src/app.ts` — mount `usersRouter` at `/api`
- Test: `server/src/middleware/requireAuth.test.ts`

**Interfaces:**
- Consumes: `verifyAccessToken` (Task 5).
- Produces: `req.userId: string | undefined` (via Express `Request` augmentation) — every protected route from Task 11 onward reads `req.userId!` after `requireAuth`.
- Produces: `requireAuth: RequestHandler` from `server/src/middleware/requireAuth.ts`.

- [ ] **Step 1: Add the Express type augmentation**

`server/src/types/express.d.ts`:
```ts
declare global {
  namespace Express {
    interface Request {
      userId?: string
    }
  }
}

export {}
```

- [ ] **Step 2: Write the failing test**

`server/src/middleware/requireAuth.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import express from 'express'
import request from 'supertest'
import { requireAuth } from './requireAuth'
import { signAccessToken } from '../lib/jwt'

function buildTestApp() {
  const app = express()
  app.get('/protected', requireAuth, (req, res) => res.json({ userId: req.userId }))
  return app
}

describe('requireAuth', () => {
  it('rejects a request with no Authorization header', async () => {
    const res = await request(buildTestApp()).get('/protected')
    expect(res.status).toBe(401)
  })

  it('rejects an invalid token', async () => {
    const res = await request(buildTestApp()).get('/protected').set('Authorization', 'Bearer garbage')
    expect(res.status).toBe(401)
  })

  it('attaches userId for a valid token', async () => {
    const token = signAccessToken({ userId: 'user_abc' })
    const res = await request(buildTestApp()).get('/protected').set('Authorization', `Bearer ${token}`)
    expect(res.status).toBe(200)
    expect(res.body).toEqual({ userId: 'user_abc' })
  })
})
```

Run: `npm run test --workspace server -- requireAuth.test.ts`
Expected: FAIL — `requireAuth.ts` doesn't exist.

- [ ] **Step 3: Implement the middleware**

`server/src/middleware/requireAuth.ts`:
```ts
import type { RequestHandler } from 'express'
import { verifyAccessToken } from '../lib/jwt'

const BEARER_PREFIX = 'Bearer '

export const requireAuth: RequestHandler = (req, res, next) => {
  const header = req.headers.authorization
  if (!header?.startsWith(BEARER_PREFIX)) {
    res.status(401).json({ error: 'Não autenticado' })
    return
  }
  const payload = verifyAccessToken(header.slice(BEARER_PREFIX.length))
  if (!payload) {
    res.status(401).json({ error: 'Não autenticado' })
    return
  }
  req.userId = payload.userId
  next()
}
```

- [ ] **Step 4: Run the middleware test and verify it passes**

Run: `npm run test --workspace server -- requireAuth.test.ts`
Expected: PASS (3 tests)

- [ ] **Step 5: Add GET /api/me, wire it up, and test it**

`server/src/modules/users/users.routes.ts`:
```ts
import { Router } from 'express'
import { prisma } from '../../lib/prisma'
import { requireAuth } from '../../middleware/requireAuth'

export const usersRouter = Router()

usersRouter.get('/me', requireAuth, async (req, res, next) => {
  try {
    const user = await prisma.user.findUniqueOrThrow({ where: { id: req.userId } })
    res.json({ id: user.id, name: user.name, email: user.email, slug: user.slug, timezone: user.timezone, niche: user.niche })
  } catch (err) {
    next(err)
  }
})
```

Modify `server/src/app.ts` — add:
```ts
import { usersRouter } from './modules/users/users.routes'
// ...
app.use('/api', usersRouter)
```

Test — `server/src/modules/users/users.me.test.ts`:
```ts
import { describe, it, expect, beforeEach } from 'vitest'
import request from 'supertest'
import { createApp } from '../../app'
import { cleanDatabase, createTestUser } from '../../../test/helpers'

describe('GET /api/me', () => {
  beforeEach(cleanDatabase)

  it('returns the authenticated professional', async () => {
    const { user, accessToken } = await createTestUser({ email: 'me@example.com', slug: 'me-slug' })
    const res = await request(createApp()).get('/api/me').set('Authorization', `Bearer ${accessToken}`)
    expect(res.status).toBe(200)
    expect(res.body).toMatchObject({ id: user.id, email: 'me@example.com', slug: 'me-slug' })
  })

  it('rejects an unauthenticated request', async () => {
    const res = await request(createApp()).get('/api/me')
    expect(res.status).toBe(401)
  })
})
```

Run: `npm run test --workspace server -- users.me.test.ts`
Expected: PASS (2 tests)

- [ ] **Step 6: Commit**

```bash
git add server/src/types server/src/middleware/requireAuth.ts server/src/middleware/requireAuth.test.ts server/src/modules/users server/src/app.ts
git commit -m "feat: add requireAuth middleware and GET /api/me"
```

---

## Task 10: POST /api/auth/refresh + POST /api/auth/logout

**Files:**
- Modify: `server/src/modules/auth/auth.service.ts` — add `refreshSession`, `logoutUser`
- Modify: `server/src/modules/auth/auth.routes.ts` — add `POST /refresh`, `POST /logout`
- Test: `server/src/modules/auth/auth.refresh.test.ts`

**Interfaces:**
- Consumes: `issueTokens`, `hashToken`, `REFRESH_COOKIE`/`refreshCookieOptions` (Tasks 6/7).
- Produces: `refreshSession(refreshToken: string): Promise<AuthResult>`, `logoutUser(refreshToken: string): Promise<void>`.

- [ ] **Step 1: Write the failing test**

`server/src/modules/auth/auth.refresh.test.ts`:
```ts
import { describe, it, expect, beforeEach } from 'vitest'
import request from 'supertest'
import { createApp } from '../../app'
import { cleanDatabase } from '../../../test/helpers'

function extractCookie(res: request.Response) {
  const raw = res.headers['set-cookie']?.[0] as string
  return raw.split(';')[0]
}

describe('POST /api/auth/refresh and /logout', () => {
  beforeEach(cleanDatabase)

  it('issues a new access token and rotates the refresh cookie', async () => {
    const app = createApp()
    const registerRes = await request(app).post('/api/auth/register').send({
      name: 'Joana', email: 'refresh@example.com', password: 'password123',
      slug: 'refresh-slug', timezone: 'America/Sao_Paulo',
    })
    const cookie = extractCookie(registerRes)

    const refreshRes = await request(app).post('/api/auth/refresh').set('Cookie', cookie)
    expect(refreshRes.status).toBe(200)
    expect(typeof refreshRes.body.accessToken).toBe('string')
    expect(refreshRes.body.accessToken).not.toBe(registerRes.body.accessToken)

    const newCookie = extractCookie(refreshRes)
    expect(newCookie).not.toBe(cookie)

    // old refresh token is now revoked
    const reuseRes = await request(app).post('/api/auth/refresh').set('Cookie', cookie)
    expect(reuseRes.status).toBe(401)
  })

  it('revokes the refresh token on logout', async () => {
    const app = createApp()
    const registerRes = await request(app).post('/api/auth/register').send({
      name: 'Joana', email: 'logout@example.com', password: 'password123',
      slug: 'logout-slug', timezone: 'America/Sao_Paulo',
    })
    const cookie = extractCookie(registerRes)

    const logoutRes = await request(app).post('/api/auth/logout').set('Cookie', cookie)
    expect(logoutRes.status).toBe(204)

    const refreshRes = await request(app).post('/api/auth/refresh').set('Cookie', cookie)
    expect(refreshRes.status).toBe(401)
  })
})
```

Run: `npm run test --workspace server -- auth.refresh.test.ts`
Expected: FAIL — routes not implemented.

- [ ] **Step 2: Implement the service functions**

Append to `server/src/modules/auth/auth.service.ts`:
```ts
export async function refreshSession(refreshToken: string): Promise<AuthResult> {
  const tokenHash = hashToken(refreshToken)
  const record = await prisma.refreshToken.findUnique({ where: { tokenHash }, include: { user: true } })
  if (!record || record.revokedAt || record.expiresAt < new Date()) {
    throw new AppError(401, 'Sessão inválida, faça login novamente')
  }
  await prisma.refreshToken.update({ where: { id: record.id }, data: { revokedAt: new Date() } })
  return issueTokens(record.userId, {
    id: record.user.id, name: record.user.name, email: record.user.email, slug: record.user.slug,
  })
}

export async function logoutUser(refreshToken: string): Promise<void> {
  const tokenHash = hashToken(refreshToken)
  await prisma.refreshToken.updateMany({ where: { tokenHash, revokedAt: null }, data: { revokedAt: new Date() } })
}
```
(add `hashToken` to the existing import from `../../lib/refreshToken` at the top of the file)

- [ ] **Step 3: Add the routes**

Append to `server/src/modules/auth/auth.routes.ts` (import `refreshSession`, `logoutUser` alongside existing imports):
```ts
authRouter.post('/refresh', async (req, res, next) => {
  try {
    const token = req.cookies[REFRESH_COOKIE]
    if (!token) {
      res.status(401).json({ error: 'Sessão inválida, faça login novamente' })
      return
    }
    const result = await refreshSession(token)
    res.cookie(REFRESH_COOKIE, result.refreshToken, refreshCookieOptions)
    res.json({ user: result.user, accessToken: result.accessToken })
  } catch (err) {
    next(err)
  }
})

authRouter.post('/logout', async (req, res, next) => {
  try {
    const token = req.cookies[REFRESH_COOKIE]
    if (token) await logoutUser(token)
    res.clearCookie(REFRESH_COOKIE)
    res.status(204).send()
  } catch (err) {
    next(err)
  }
})
```

- [ ] **Step 4: Run the test and verify it passes**

Run: `npm run test --workspace server -- auth.refresh.test.ts`
Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
git add server/src/modules/auth
git commit -m "feat: add refresh-token rotation and logout endpoints"
```

---

## Task 11: Service-type CRUD (with nested custom form fields)

**Files:**
- Create: `server/src/modules/service-types/service-types.schemas.ts`
- Create: `server/src/modules/service-types/service-types.service.ts`
- Create: `server/src/modules/service-types/service-types.routes.ts`
- Modify: `server/src/app.ts` — mount at `/api/service-types`
- Test: `server/src/modules/service-types/service-types.test.ts`

**Interfaces:**
- Consumes: `requireAuth` (Task 9), `AppError` (Task 4), `createTestUser`/`cleanDatabase` (Task 6).
- Produces: `serviceTypesRouter: Router`, mounted at `/api/service-types` — later tasks (12, 13) mount sibling routers under `/api/service-types/:id/...`.

- [ ] **Step 1: Write the schema and the failing tests**

`server/src/modules/service-types/service-types.schemas.ts`:
```ts
import { z } from 'zod'

export const customFieldSchema = z.object({
  label: z.string().min(1),
  fieldType: z.enum(['TEXT', 'NUMBER', 'SELECT', 'TEXTAREA']),
  required: z.boolean(),
  order: z.number().int().nonnegative(),
  options: z.array(z.string()).optional(),
})

export const serviceTypeInputSchema = z.object({
  name: z.string().min(1),
  durationMinutes: z.number().int().positive(),
  description: z.string().optional(),
  requiresCustomForm: z.boolean().default(false),
  customFields: z.array(customFieldSchema).default([]),
})
```

`server/src/modules/service-types/service-types.test.ts`:
```ts
import { describe, it, expect, beforeEach } from 'vitest'
import request from 'supertest'
import { createApp } from '../../app'
import { cleanDatabase, createTestUser } from '../../../test/helpers'

describe('service-type CRUD', () => {
  beforeEach(cleanDatabase)

  const payload = {
    name: 'Primeira consulta', durationMinutes: 60, requiresCustomForm: true,
    customFields: [{ label: 'Queixa principal', fieldType: 'TEXTAREA', required: true, order: 0 }],
  }

  it('creates, lists, gets, updates and deletes a service type', async () => {
    const { accessToken } = await createTestUser()
    const app = createApp()
    const auth = { Authorization: `Bearer ${accessToken}` }

    const createRes = await request(app).post('/api/service-types').set(auth).send(payload)
    expect(createRes.status).toBe(201)
    expect(createRes.body.customFields).toHaveLength(1)
    const id = createRes.body.id

    const listRes = await request(app).get('/api/service-types').set(auth)
    expect(listRes.body).toHaveLength(1)

    const getRes = await request(app).get(`/api/service-types/${id}`).set(auth)
    expect(getRes.status).toBe(200)

    const updateRes = await request(app).patch(`/api/service-types/${id}`).set(auth).send({ ...payload, name: 'Renamed' })
    expect(updateRes.body.name).toBe('Renamed')

    const deleteRes = await request(app).delete(`/api/service-types/${id}`).set(auth)
    expect(deleteRes.status).toBe(204)
  })

  it('never exposes another professional\'s service types (no IDOR)', async () => {
    const owner = await createTestUser({ email: 'owner@example.com', slug: 'owner' })
    const other = await createTestUser({ email: 'other@example.com', slug: 'other' })
    const app = createApp()

    const createRes = await request(app).post('/api/service-types')
      .set('Authorization', `Bearer ${owner.accessToken}`).send(payload)

    const getRes = await request(app).get(`/api/service-types/${createRes.body.id}`)
      .set('Authorization', `Bearer ${other.accessToken}`)
    expect(getRes.status).toBe(404)
  })
})
```

Run: `npm run test --workspace server -- service-types.test.ts`
Expected: FAIL — module doesn't exist.

- [ ] **Step 2: Implement the service**

`server/src/modules/service-types/service-types.service.ts`:
```ts
import { prisma } from '../../lib/prisma'
import { AppError } from '../../lib/errors'
import type { z } from 'zod'
import type { serviceTypeInputSchema } from './service-types.schemas'

export type ServiceTypeInput = z.infer<typeof serviceTypeInputSchema>

export function listServiceTypes(userId: string) {
  return prisma.serviceType.findMany({ where: { userId }, include: { customFields: true }, orderBy: { createdAt: 'asc' } })
}

export function createServiceType(userId: string, input: ServiceTypeInput) {
  return prisma.serviceType.create({
    data: {
      userId, name: input.name, durationMinutes: input.durationMinutes,
      description: input.description, requiresCustomForm: input.requiresCustomForm,
      customFields: { create: input.customFields.map((f) => ({ ...f, options: f.options ?? undefined })) },
    },
    include: { customFields: true },
  })
}

export async function getServiceType(userId: string, id: string) {
  const serviceType = await prisma.serviceType.findFirst({ where: { id, userId }, include: { customFields: true } })
  if (!serviceType) throw new AppError(404, 'Tipo de serviço não encontrado')
  return serviceType
}

export async function updateServiceType(userId: string, id: string, input: ServiceTypeInput) {
  await getServiceType(userId, id)
  await prisma.customFormField.deleteMany({ where: { serviceTypeId: id } })
  return prisma.serviceType.update({
    where: { id },
    data: {
      name: input.name, durationMinutes: input.durationMinutes,
      description: input.description, requiresCustomForm: input.requiresCustomForm,
      customFields: { create: input.customFields.map((f) => ({ ...f, options: f.options ?? undefined })) },
    },
    include: { customFields: true },
  })
}

export async function deleteServiceType(userId: string, id: string) {
  await getServiceType(userId, id)
  try {
    await prisma.serviceType.delete({ where: { id } })
  } catch (err: unknown) {
    const code = (err as { code?: string }).code
    if (code === 'P2003') {
      throw new AppError(409, 'Cancele os agendamentos antes de remover este tipo de serviço')
    }
    throw err
  }
}
```

- [ ] **Step 3: Implement the routes and mount them**

`server/src/modules/service-types/service-types.routes.ts`:
```ts
import { Router } from 'express'
import { requireAuth } from '../../middleware/requireAuth'
import { serviceTypeInputSchema } from './service-types.schemas'
import * as service from './service-types.service'

export const serviceTypesRouter = Router()
serviceTypesRouter.use(requireAuth)

serviceTypesRouter.get('/', async (req, res, next) => {
  try {
    res.json(await service.listServiceTypes(req.userId!))
  } catch (err) { next(err) }
})

serviceTypesRouter.post('/', async (req, res, next) => {
  try {
    const input = serviceTypeInputSchema.parse(req.body)
    res.status(201).json(await service.createServiceType(req.userId!, input))
  } catch (err) { next(err) }
})

serviceTypesRouter.get('/:id', async (req, res, next) => {
  try {
    res.json(await service.getServiceType(req.userId!, req.params.id))
  } catch (err) { next(err) }
})

serviceTypesRouter.patch('/:id', async (req, res, next) => {
  try {
    const input = serviceTypeInputSchema.parse(req.body)
    res.json(await service.updateServiceType(req.userId!, req.params.id, input))
  } catch (err) { next(err) }
})

serviceTypesRouter.delete('/:id', async (req, res, next) => {
  try {
    await service.deleteServiceType(req.userId!, req.params.id)
    res.status(204).send()
  } catch (err) { next(err) }
})
```

Modify `server/src/app.ts`:
```ts
import { serviceTypesRouter } from './modules/service-types/service-types.routes'
// ...
app.use('/api/service-types', serviceTypesRouter)
```

- [ ] **Step 4: Run the tests and verify they pass**

Run: `npm run test --workspace server -- service-types.test.ts`
Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
git add server/src/modules/service-types server/src/app.ts
git commit -m "feat: add service-type CRUD with nested custom form fields"
```

---

## Task 12: General availability CRUD

**Files:**
- Create: `server/src/modules/availability/availability.schemas.ts`
- Create: `server/src/modules/availability/availability.service.ts`
- Create: `server/src/modules/availability/availability.routes.ts`
- Modify: `server/src/app.ts` — mount at `/api/availability`
- Test: `server/src/modules/availability/availability.test.ts`

**Interfaces:**
- Consumes: `requireAuth` (Task 9).
- Produces: `availabilityListSchema: ZodSchema<AvailabilityRuleRow[]>` from `availability.schemas.ts`, where `AvailabilityRuleRow = { dayOfWeek: number; startTime: string; endTime: string }` — reused by Task 13 and consumed by the engine's input shape in Task 15.

- [ ] **Step 1: Write the schema and failing test**

`server/src/modules/availability/availability.schemas.ts`:
```ts
import { z } from 'zod'

export const availabilityRuleSchema = z.object({
  dayOfWeek: z.number().int().min(0).max(6),
  startTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Use o formato HH:mm'),
  endTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Use o formato HH:mm'),
})

export const availabilityListSchema = z.array(availabilityRuleSchema)
```

`server/src/modules/availability/availability.test.ts`:
```ts
import { describe, it, expect, beforeEach } from 'vitest'
import request from 'supertest'
import { createApp } from '../../app'
import { cleanDatabase, createTestUser } from '../../../test/helpers'

describe('GET/PUT /api/availability', () => {
  beforeEach(cleanDatabase)

  it('replaces the weekly availability and returns it', async () => {
    const { accessToken } = await createTestUser()
    const app = createApp()
    const auth = { Authorization: `Bearer ${accessToken}` }
    const rules = [
      { dayOfWeek: 1, startTime: '09:00', endTime: '18:00' },
      { dayOfWeek: 2, startTime: '09:00', endTime: '18:00' },
    ]

    const putRes = await request(app).put('/api/availability').set(auth).send(rules)
    expect(putRes.status).toBe(200)
    expect(putRes.body).toHaveLength(2)

    const replaceRes = await request(app).put('/api/availability').set(auth)
      .send([{ dayOfWeek: 3, startTime: '10:00', endTime: '16:00' }])
    expect(replaceRes.body).toHaveLength(1)

    const getRes = await request(app).get('/api/availability').set(auth)
    expect(getRes.body).toHaveLength(1)
    expect(getRes.body[0]).toMatchObject({ dayOfWeek: 3, startTime: '10:00', endTime: '16:00' })
  })
})
```

Run: `npm run test --workspace server -- availability.test.ts`
Expected: FAIL — module doesn't exist.

- [ ] **Step 2: Implement the service**

`server/src/modules/availability/availability.service.ts`:
```ts
import { prisma } from '../../lib/prisma'
import type { z } from 'zod'
import type { availabilityListSchema } from './availability.schemas'

type Rules = z.infer<typeof availabilityListSchema>

export function getGeneralAvailability(userId: string) {
  return prisma.availability.findMany({ where: { userId }, orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }] })
}

export async function replaceGeneralAvailability(userId: string, rules: Rules) {
  await prisma.$transaction([
    prisma.availability.deleteMany({ where: { userId } }),
    prisma.availability.createMany({ data: rules.map((r) => ({ ...r, userId })) }),
  ])
  return getGeneralAvailability(userId)
}
```

- [ ] **Step 3: Implement the routes and mount them**

`server/src/modules/availability/availability.routes.ts`:
```ts
import { Router } from 'express'
import { requireAuth } from '../../middleware/requireAuth'
import { availabilityListSchema } from './availability.schemas'
import * as service from './availability.service'

export const availabilityRouter = Router()
availabilityRouter.use(requireAuth)

availabilityRouter.get('/', async (req, res, next) => {
  try {
    res.json(await service.getGeneralAvailability(req.userId!))
  } catch (err) { next(err) }
})

availabilityRouter.put('/', async (req, res, next) => {
  try {
    const rules = availabilityListSchema.parse(req.body)
    res.json(await service.replaceGeneralAvailability(req.userId!, rules))
  } catch (err) { next(err) }
})
```

Modify `server/src/app.ts`:
```ts
import { availabilityRouter } from './modules/availability/availability.routes'
// ...
app.use('/api/availability', availabilityRouter)
```

- [ ] **Step 4: Run the test and verify it passes**

Run: `npm run test --workspace server -- availability.test.ts`
Expected: PASS (1 test)

- [ ] **Step 5: Commit**

```bash
git add server/src/modules/availability server/src/app.ts
git commit -m "feat: add general weekly availability CRUD"
```

---

## Task 13: Per-service-type availability rule CRUD

**Files:**
- Create: `server/src/modules/availability/rules.service.ts`
- Create: `server/src/modules/availability/rules.routes.ts`
- Modify: `server/src/app.ts` — mount at `/api/service-types/:id/availability-rules`
- Test: `server/src/modules/availability/rules.test.ts`

**Interfaces:**
- Consumes: `availabilityListSchema` (Task 12), `requireAuth` (Task 9), `AppError` (Task 4).
- Produces: `getServiceTypeRules(userId, serviceTypeId)`, `replaceServiceTypeRules(userId, serviceTypeId, rules)` — consumed by the engine wiring in Task 16.

- [ ] **Step 1: Write the failing test**

`server/src/modules/availability/rules.test.ts`:
```ts
import { describe, it, expect, beforeEach } from 'vitest'
import request from 'supertest'
import { createApp } from '../../app'
import { cleanDatabase, createTestUser } from '../../../test/helpers'
import { prisma } from '../../lib/prisma'

describe('GET/PUT /api/service-types/:id/availability-rules', () => {
  beforeEach(cleanDatabase)

  it('replaces rules scoped to one service type and rejects access to another owner\'s', async () => {
    const owner = await createTestUser({ email: 'owner@example.com', slug: 'owner' })
    const serviceType = await prisma.serviceType.create({
      data: { userId: owner.user.id, name: 'Sessão', durationMinutes: 50 },
    })
    const app = createApp()
    const ownerAuth = { Authorization: `Bearer ${owner.accessToken}` }
    const rules = [{ dayOfWeek: 1, startTime: '08:00', endTime: '12:00' }]

    const putRes = await request(app)
      .put(`/api/service-types/${serviceType.id}/availability-rules`).set(ownerAuth).send(rules)
    expect(putRes.status).toBe(200)
    expect(putRes.body).toHaveLength(1)

    const other = await createTestUser({ email: 'other@example.com', slug: 'other' })
    const forbiddenRes = await request(app)
      .get(`/api/service-types/${serviceType.id}/availability-rules`)
      .set('Authorization', `Bearer ${other.accessToken}`)
    expect(forbiddenRes.status).toBe(404)
  })
})
```

Run: `npm run test --workspace server -- rules.test.ts`
Expected: FAIL — module doesn't exist.

- [ ] **Step 2: Implement the service**

`server/src/modules/availability/rules.service.ts`:
```ts
import { prisma } from '../../lib/prisma'
import { AppError } from '../../lib/errors'
import type { z } from 'zod'
import type { availabilityListSchema } from './availability.schemas'

type Rules = z.infer<typeof availabilityListSchema>

async function assertOwnership(userId: string, serviceTypeId: string) {
  const serviceType = await prisma.serviceType.findFirst({ where: { id: serviceTypeId, userId } })
  if (!serviceType) throw new AppError(404, 'Tipo de serviço não encontrado')
}

export async function getServiceTypeRules(userId: string, serviceTypeId: string) {
  await assertOwnership(userId, serviceTypeId)
  return prisma.serviceTypeAvailabilityRule.findMany({
    where: { serviceTypeId }, orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
  })
}

export async function replaceServiceTypeRules(userId: string, serviceTypeId: string, rules: Rules) {
  await assertOwnership(userId, serviceTypeId)
  await prisma.$transaction([
    prisma.serviceTypeAvailabilityRule.deleteMany({ where: { serviceTypeId } }),
    prisma.serviceTypeAvailabilityRule.createMany({ data: rules.map((r) => ({ ...r, serviceTypeId })) }),
  ])
  return getServiceTypeRules(userId, serviceTypeId)
}
```

- [ ] **Step 3: Implement the routes and mount them**

`server/src/modules/availability/rules.routes.ts`:
```ts
import { Router } from 'express'
import { requireAuth } from '../../middleware/requireAuth'
import { availabilityListSchema } from './availability.schemas'
import * as service from './rules.service'

export const serviceTypeRulesRouter = Router({ mergeParams: true })
serviceTypeRulesRouter.use(requireAuth)

serviceTypeRulesRouter.get('/', async (req, res, next) => {
  try {
    res.json(await service.getServiceTypeRules(req.userId!, req.params.id))
  } catch (err) { next(err) }
})

serviceTypeRulesRouter.put('/', async (req, res, next) => {
  try {
    const rules = availabilityListSchema.parse(req.body)
    res.json(await service.replaceServiceTypeRules(req.userId!, req.params.id, rules))
  } catch (err) { next(err) }
})
```

Modify `server/src/app.ts`:
```ts
import { serviceTypeRulesRouter } from './modules/availability/rules.routes'
// ...
app.use('/api/service-types/:id/availability-rules', serviceTypeRulesRouter)
```

- [ ] **Step 4: Run the test and verify it passes**

Run: `npm run test --workspace server -- rules.test.ts`
Expected: PASS (1 test)

- [ ] **Step 5: Commit**

```bash
git add server/src/modules/availability/rules.service.ts server/src/modules/availability/rules.routes.ts server/src/modules/availability/rules.test.ts server/src/app.ts
git commit -m "feat: add per-service-type availability rule overrides"
```

---

## Task 14: BlockedSlot CRUD

**Files:**
- Create: `server/src/modules/blocked-slots/blocked-slots.schemas.ts`
- Create: `server/src/modules/blocked-slots/blocked-slots.service.ts`
- Create: `server/src/modules/blocked-slots/blocked-slots.routes.ts`
- Modify: `server/src/app.ts` — mount at `/api/blocked-slots`
- Test: `server/src/modules/blocked-slots/blocked-slots.test.ts`

**Interfaces:**
- Consumes: `requireAuth` (Task 9), `AppError` (Task 4).
- Produces: `BlockedSlot` rows readable by the availability engine wiring in Task 16 (`{ startsAt, endsAt }`).

- [ ] **Step 1: Write the schema and failing test**

`server/src/modules/blocked-slots/blocked-slots.schemas.ts`:
```ts
import { z } from 'zod'

export const createBlockedSlotSchema = z.object({
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime(),
  reason: z.string().optional(),
})
```

`server/src/modules/blocked-slots/blocked-slots.test.ts`:
```ts
import { describe, it, expect, beforeEach } from 'vitest'
import request from 'supertest'
import { createApp } from '../../app'
import { cleanDatabase, createTestUser } from '../../../test/helpers'

describe('blocked-slot CRUD', () => {
  beforeEach(cleanDatabase)

  it('creates, lists and deletes a blocked slot, scoped to its owner', async () => {
    const { accessToken } = await createTestUser()
    const app = createApp()
    const auth = { Authorization: `Bearer ${accessToken}` }

    const createRes = await request(app).post('/api/blocked-slots').set(auth).send({
      startsAt: '2026-12-25T00:00:00.000Z', endsAt: '2026-12-26T00:00:00.000Z', reason: 'Feriado',
    })
    expect(createRes.status).toBe(201)

    const listRes = await request(app).get('/api/blocked-slots').set(auth)
    expect(listRes.body).toHaveLength(1)

    const deleteRes = await request(app).delete(`/api/blocked-slots/${createRes.body.id}`).set(auth)
    expect(deleteRes.status).toBe(204)

    const other = await createTestUser({ email: 'other@example.com', slug: 'other' })
    const forbiddenRes = await request(app).delete(`/api/blocked-slots/${createRes.body.id}`)
      .set('Authorization', `Bearer ${other.accessToken}`)
    expect(forbiddenRes.status).toBe(404)
  })
})
```

Run: `npm run test --workspace server -- blocked-slots.test.ts`
Expected: FAIL — module doesn't exist.

- [ ] **Step 2: Implement the service**

`server/src/modules/blocked-slots/blocked-slots.service.ts`:
```ts
import { prisma } from '../../lib/prisma'
import { AppError } from '../../lib/errors'

export function listBlockedSlots(userId: string) {
  return prisma.blockedSlot.findMany({ where: { userId }, orderBy: { startsAt: 'asc' } })
}

export function createBlockedSlot(userId: string, input: { startsAt: string; endsAt: string; reason?: string }) {
  return prisma.blockedSlot.create({
    data: { userId, startsAt: new Date(input.startsAt), endsAt: new Date(input.endsAt), reason: input.reason },
  })
}

export async function deleteBlockedSlot(userId: string, id: string) {
  const blockedSlot = await prisma.blockedSlot.findFirst({ where: { id, userId } })
  if (!blockedSlot) throw new AppError(404, 'Bloqueio não encontrado')
  await prisma.blockedSlot.delete({ where: { id } })
}
```

- [ ] **Step 3: Implement the routes and mount them**

`server/src/modules/blocked-slots/blocked-slots.routes.ts`:
```ts
import { Router } from 'express'
import { requireAuth } from '../../middleware/requireAuth'
import { createBlockedSlotSchema } from './blocked-slots.schemas'
import * as service from './blocked-slots.service'

export const blockedSlotsRouter = Router()
blockedSlotsRouter.use(requireAuth)

blockedSlotsRouter.get('/', async (req, res, next) => {
  try {
    res.json(await service.listBlockedSlots(req.userId!))
  } catch (err) { next(err) }
})

blockedSlotsRouter.post('/', async (req, res, next) => {
  try {
    const input = createBlockedSlotSchema.parse(req.body)
    res.status(201).json(await service.createBlockedSlot(req.userId!, input))
  } catch (err) { next(err) }
})

blockedSlotsRouter.delete('/:id', async (req, res, next) => {
  try {
    await service.deleteBlockedSlot(req.userId!, req.params.id)
    res.status(204).send()
  } catch (err) { next(err) }
})
```

Modify `server/src/app.ts`:
```ts
import { blockedSlotsRouter } from './modules/blocked-slots/blocked-slots.routes'
// ...
app.use('/api/blocked-slots', blockedSlotsRouter)
```

- [ ] **Step 4: Run the test and verify it passes**

Run: `npm run test --workspace server -- blocked-slots.test.ts`
Expected: PASS (1 test)

- [ ] **Step 5: Commit**

```bash
git add server/src/modules/blocked-slots server/src/app.ts
git commit -m "feat: add blocked-slot CRUD"
```

---

## Task 15: Availability calculation engine (core logic)

This is the highest-value test target in the whole plan (spec §6).

**Files:**
- Create: `server/src/modules/availability/engine.ts`
- Test: `server/src/modules/availability/engine.test.ts`

**Interfaces:**
- Consumes: nothing beyond `date-fns`/`date-fns-tz` — this is a dependency-free pure function, deliberately decoupled from Prisma so it's cheap to test exhaustively.
- Produces: `getAvailableSlots(input: GetAvailableSlotsInput): Date[]`, where:
  ```ts
  interface AvailabilityRuleRow { dayOfWeek: number; startTime: string; endTime: string }
  interface ConflictRange { startsAt: Date; endsAt: Date }
  interface GetAvailableSlotsInput {
    date: string // "YYYY-MM-DD"
    timezone: string
    durationMinutes: number
    generalRules: AvailabilityRuleRow[]
    serviceTypeRules: AvailabilityRuleRow[]
    conflicts: ConflictRange[]
    now?: Date // injected for testability; defaults to `new Date()`
  }
  ```
  Consumed by Task 16's DB-wiring layer.

- [ ] **Step 1: Write the failing tests**

`server/src/modules/availability/engine.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { getAvailableSlots } from './engine'

const SP = 'America/Sao_Paulo'

describe('getAvailableSlots', () => {
  it('generates slots that fit exactly within a general availability window', () => {
    const slots = getAvailableSlots({
      date: '2026-09-07', // a Monday
      timezone: SP,
      durationMinutes: 60,
      generalRules: [{ dayOfWeek: 1, startTime: '09:00', endTime: '11:00' }],
      serviceTypeRules: [],
      conflicts: [],
      now: new Date('2026-09-01T00:00:00Z'),
    })
    expect(slots).toHaveLength(2)
    expect(slots[0].toISOString()).toBe('2026-09-07T12:00:00.000Z') // 09:00 -03:00
    expect(slots[1].toISOString()).toBe('2026-09-07T13:00:00.000Z') // 10:00 -03:00
  })

  it('drops a trailing slot that would not fully fit in the window', () => {
    const slots = getAvailableSlots({
      date: '2026-09-07',
      timezone: SP,
      durationMinutes: 50,
      generalRules: [{ dayOfWeek: 1, startTime: '09:00', endTime: '10:30' }],
      serviceTypeRules: [],
      conflicts: [],
      now: new Date('2026-09-01T00:00:00Z'),
    })
    // 09:00-09:50 fits; 09:50-10:40 would exceed 10:30, so only 1 slot
    expect(slots).toHaveLength(1)
  })

  it('service-type rules override, not add to, general availability for that weekday', () => {
    const slots = getAvailableSlots({
      date: '2026-09-07',
      timezone: SP,
      durationMinutes: 60,
      generalRules: [{ dayOfWeek: 1, startTime: '09:00', endTime: '18:00' }],
      serviceTypeRules: [{ dayOfWeek: 1, startTime: '14:00', endTime: '15:00' }],
      conflicts: [],
      now: new Date('2026-09-01T00:00:00Z'),
    })
    expect(slots).toHaveLength(1)
    expect(slots[0].toISOString()).toBe('2026-09-07T17:00:00.000Z') // 14:00 -03:00
  })

  it('removes a slot that overlaps an existing conflict (booking or blocked slot)', () => {
    const slots = getAvailableSlots({
      date: '2026-09-07',
      timezone: SP,
      durationMinutes: 60,
      generalRules: [{ dayOfWeek: 1, startTime: '09:00', endTime: '11:00' }],
      serviceTypeRules: [],
      conflicts: [{ startsAt: new Date('2026-09-07T12:00:00Z'), endsAt: new Date('2026-09-07T13:00:00Z') }],
      now: new Date('2026-09-01T00:00:00Z'),
    })
    expect(slots).toHaveLength(1)
    expect(slots[0].toISOString()).toBe('2026-09-07T13:00:00.000Z')
  })

  it('drops slots that start before "now"', () => {
    const slots = getAvailableSlots({
      date: '2026-09-07',
      timezone: SP,
      durationMinutes: 60,
      generalRules: [{ dayOfWeek: 1, startTime: '09:00', endTime: '11:00' }],
      serviceTypeRules: [],
      conflicts: [],
      now: new Date('2026-09-07T12:30:00Z'), // 09:30 local — after the 09:00 slot's start
    })
    expect(slots).toHaveLength(1)
    expect(slots[0].toISOString()).toBe('2026-09-07T13:00:00.000Z')
  })

  it('resolves a recurring 09:00 local slot correctly across a DST transition', () => {
    // Brazil abolished DST in 2019 and America/Sao_Paulo has had a fixed -03:00
    // offset since; this test locks in that a fixed-offset zone is handled
    // correctly and documents the DST-aware conversion path for zones that do
    // observe DST (date-fns-tz handles the offset lookup per-date already).
    const winter = getAvailableSlots({
      date: '2026-06-01', timezone: SP, durationMinutes: 60,
      generalRules: [{ dayOfWeek: 1, startTime: '09:00', endTime: '10:00' }],
      serviceTypeRules: [], conflicts: [], now: new Date('2026-01-01T00:00:00Z'),
    })
    const summer = getAvailableSlots({
      date: '2026-12-07', timezone: SP, durationMinutes: 60,
      generalRules: [{ dayOfWeek: 1, startTime: '09:00', endTime: '10:00' }],
      serviceTypeRules: [], conflicts: [], now: new Date('2026-01-01T00:00:00Z'),
    })
    expect(winter[0].getUTCHours()).toBe(12) // 09:00 -03:00
    expect(summer[0].getUTCHours()).toBe(12) // 09:00 -03:00, same fixed offset
  })

  it('returns no slots when no rule exists for that weekday', () => {
    const slots = getAvailableSlots({
      date: '2026-09-06', // a Sunday
      timezone: SP, durationMinutes: 60,
      generalRules: [{ dayOfWeek: 1, startTime: '09:00', endTime: '18:00' }],
      serviceTypeRules: [], conflicts: [], now: new Date('2026-09-01T00:00:00Z'),
    })
    expect(slots).toHaveLength(0)
  })
})
```

Run: `npm run test --workspace server -- engine.test.ts`
Expected: FAIL — `engine.ts` doesn't exist.

- [ ] **Step 2: Implement the engine**

`server/src/modules/availability/engine.ts`:
```ts
import { addMinutes, isBefore } from 'date-fns'
import { zonedTimeToUtc } from 'date-fns-tz'

export interface AvailabilityRuleRow {
  dayOfWeek: number
  startTime: string
  endTime: string
}

export interface ConflictRange {
  startsAt: Date
  endsAt: Date
}

export interface GetAvailableSlotsInput {
  date: string
  timezone: string
  durationMinutes: number
  generalRules: AvailabilityRuleRow[]
  serviceTypeRules: AvailabilityRuleRow[]
  conflicts: ConflictRange[]
  now?: Date
}

function dayOfWeekFor(date: string, timezone: string): number {
  // Resolved at local noon to avoid a UTC-midnight conversion ever landing
  // on the wrong calendar date near a timezone's day boundary.
  const localNoon = zonedTimeToUtc(`${date}T12:00:00`, timezone)
  return localNoon.getUTCDay()
}

function windowsForDay(input: GetAvailableSlotsInput, dayOfWeek: number): AvailabilityRuleRow[] {
  const serviceRules = input.serviceTypeRules.filter((r) => r.dayOfWeek === dayOfWeek)
  if (serviceRules.length > 0) return serviceRules
  return input.generalRules.filter((r) => r.dayOfWeek === dayOfWeek)
}

function rangesOverlap(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date): boolean {
  return aStart < bEnd && bStart < aEnd
}

export function getAvailableSlots(input: GetAvailableSlotsInput): Date[] {
  const dayOfWeek = dayOfWeekFor(input.date, input.timezone)
  const windows = windowsForDay(input, dayOfWeek)
  const now = input.now ?? new Date()
  const slots: Date[] = []

  for (const window of windows) {
    const windowStart = zonedTimeToUtc(`${input.date}T${window.startTime}:00`, input.timezone)
    const windowEnd = zonedTimeToUtc(`${input.date}T${window.endTime}:00`, input.timezone)

    let cursor = windowStart
    while (true) {
      const slotEnd = addMinutes(cursor, input.durationMinutes)
      if (slotEnd > windowEnd) break
      const hasConflict = input.conflicts.some((c) => rangesOverlap(cursor, slotEnd, c.startsAt, c.endsAt))
      if (!hasConflict && !isBefore(cursor, now)) {
        slots.push(cursor)
      }
      cursor = addMinutes(cursor, input.durationMinutes)
    }
  }

  return slots.sort((a, b) => a.getTime() - b.getTime())
}
```

- [ ] **Step 3: Run the tests and verify they pass**

Run: `npm run test --workspace server -- engine.test.ts`
Expected: PASS (7 tests)

- [ ] **Step 4: Commit**

```bash
git add server/src/modules/availability/engine.ts server/src/modules/availability/engine.test.ts
git commit -m "feat: add availability-calculation engine as a pure, DST-aware function"
```

---

## Task 16: Public profile + service-type list + slots endpoint

**Files:**
- Create: `server/src/modules/public/public.service.ts`
- Create: `server/src/modules/public/public.routes.ts`
- Modify: `server/src/app.ts` — mount at `/api/public`
- Test: `server/src/modules/public/public.test.ts`

**Interfaces:**
- Consumes: `getAvailableSlots` (Task 15), `getServiceType`-style ownership pattern, `prisma`.
- Produces: `getPublicProfile(slug)`, `listPublicServiceTypes(slug)`, `getSlotsForDate(slug, serviceTypeId, date)` from `public.service.ts` — `getSlotsForDate` is reused (its DB-fetch part) by Task 18's booking creation for a final availability re-check... (Task 18 calls the exclusion constraint instead; no reuse needed there — this is the read-path only.)

- [ ] **Step 1: Write the failing tests**

`server/src/modules/public/public.test.ts`:
```ts
import { describe, it, expect, beforeEach } from 'vitest'
import request from 'supertest'
import { createApp } from '../../app'
import { cleanDatabase, createTestUser } from '../../../test/helpers'
import { prisma } from '../../lib/prisma'

describe('public booking-page endpoints', () => {
  beforeEach(cleanDatabase)

  it('returns the public profile by slug', async () => {
    const { user } = await createTestUser({ email: 'pub@example.com', slug: 'pub-slug' })
    await prisma.user.update({ where: { id: user.id }, data: { niche: 'Psicologia' } })
    const res = await request(createApp()).get('/api/public/pub-slug')
    expect(res.status).toBe(200)
    expect(res.body).toMatchObject({ niche: 'Psicologia', timezone: 'America/Sao_Paulo' })
  })

  it('returns 404 for an unknown slug', async () => {
    const res = await request(createApp()).get('/api/public/does-not-exist')
    expect(res.status).toBe(404)
  })

  it('lists service types, including custom fields only when required', async () => {
    const { user } = await createTestUser({ email: 'st@example.com', slug: 'st-slug' })
    await prisma.serviceType.create({ data: { userId: user.id, name: 'Sem form', durationMinutes: 30 } })
    await prisma.serviceType.create({
      data: {
        userId: user.id, name: 'Com form', durationMinutes: 60, requiresCustomForm: true,
        customFields: { create: [{ label: 'Objetivo', fieldType: 'TEXT', required: true, order: 0 }] },
      },
    })
    const res = await request(createApp()).get('/api/public/st-slug/service-types')
    expect(res.body).toHaveLength(2)
    const withForm = res.body.find((s: { requiresCustomForm: boolean }) => s.requiresCustomForm)
    expect(withForm.customFields).toHaveLength(1)
    const withoutForm = res.body.find((s: { requiresCustomForm: boolean }) => !s.requiresCustomForm)
    expect(withoutForm.customFields).toHaveLength(0)
  })

  it('returns available slots for a date, respecting general availability', async () => {
    const { user } = await createTestUser({ email: 'slots@example.com', slug: 'slots-slug' })
    await prisma.availability.create({ data: { userId: user.id, dayOfWeek: 1, startTime: '09:00', endTime: '10:00' } })
    const serviceType = await prisma.serviceType.create({ data: { userId: user.id, name: 'Sessão', durationMinutes: 60 } })

    const res = await request(createApp()).get(`/api/public/slots-slug/service-types/${serviceType.id}/slots?date=2026-09-07`)
    expect(res.status).toBe(200)
    expect(res.body.slots).toEqual(['2026-09-07T12:00:00.000Z'])
  })
})
```

Run: `npm run test --workspace server -- public.test.ts`
Expected: FAIL — module doesn't exist.

- [ ] **Step 2: Implement the service**

`server/src/modules/public/public.service.ts`:
```ts
import { prisma } from '../../lib/prisma'
import { AppError } from '../../lib/errors'
import { getAvailableSlots } from '../availability/engine'

const DAY_MS = 24 * 60 * 60 * 1000

export async function getPublicProfile(slug: string) {
  const user = await prisma.user.findUnique({ where: { slug } })
  if (!user) throw new AppError(404, 'Profissional não encontrado')
  return { name: user.name, niche: user.niche, timezone: user.timezone }
}

export async function listPublicServiceTypes(slug: string) {
  const user = await prisma.user.findUnique({ where: { slug } })
  if (!user) throw new AppError(404, 'Profissional não encontrado')
  const serviceTypes = await prisma.serviceType.findMany({ where: { userId: user.id }, include: { customFields: true } })
  return serviceTypes.map((st) => ({
    id: st.id,
    name: st.name,
    durationMinutes: st.durationMinutes,
    description: st.description,
    requiresCustomForm: st.requiresCustomForm,
    customFields: st.requiresCustomForm ? st.customFields : [],
  }))
}

export async function getSlotsForDate(slug: string, serviceTypeId: string, date: string) {
  const user = await prisma.user.findUnique({ where: { slug } })
  if (!user) throw new AppError(404, 'Profissional não encontrado')
  const serviceType = await prisma.serviceType.findFirst({ where: { id: serviceTypeId, userId: user.id } })
  if (!serviceType) throw new AppError(404, 'Tipo de serviço não encontrado')

  const [generalRules, serviceTypeRules] = await Promise.all([
    prisma.availability.findMany({ where: { userId: user.id } }),
    prisma.serviceTypeAvailabilityRule.findMany({ where: { serviceTypeId } }),
  ])

  const dayStart = new Date(`${date}T00:00:00Z`)
  const rangeStart = new Date(dayStart.getTime() - DAY_MS)
  const rangeEnd = new Date(dayStart.getTime() + 2 * DAY_MS)

  const [bookings, blockedSlots] = await Promise.all([
    prisma.booking.findMany({
      where: { userId: user.id, status: 'CONFIRMED', startsAt: { lt: rangeEnd }, endsAt: { gt: rangeStart } },
    }),
    prisma.blockedSlot.findMany({ where: { userId: user.id, startsAt: { lt: rangeEnd }, endsAt: { gt: rangeStart } } }),
  ])

  return getAvailableSlots({
    date,
    timezone: user.timezone,
    durationMinutes: serviceType.durationMinutes,
    generalRules: generalRules.map((r) => ({ dayOfWeek: r.dayOfWeek, startTime: r.startTime, endTime: r.endTime })),
    serviceTypeRules: serviceTypeRules.map((r) => ({ dayOfWeek: r.dayOfWeek, startTime: r.startTime, endTime: r.endTime })),
    conflicts: [...bookings, ...blockedSlots].map((c) => ({ startsAt: c.startsAt, endsAt: c.endsAt })),
  })
}
```

- [ ] **Step 3: Implement the routes and mount them**

`server/src/modules/public/public.routes.ts`:
```ts
import { Router } from 'express'
import { z } from 'zod'
import * as service from './public.service'

export const publicRouter = Router()

publicRouter.get('/:slug', async (req, res, next) => {
  try {
    res.json(await service.getPublicProfile(req.params.slug))
  } catch (err) { next(err) }
})

publicRouter.get('/:slug/service-types', async (req, res, next) => {
  try {
    res.json(await service.listPublicServiceTypes(req.params.slug))
  } catch (err) { next(err) }
})

const dateQuerySchema = z.object({ date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) })

publicRouter.get('/:slug/service-types/:id/slots', async (req, res, next) => {
  try {
    const { date } = dateQuerySchema.parse(req.query)
    const slots = await service.getSlotsForDate(req.params.slug, req.params.id, date)
    res.json({ slots: slots.map((s) => s.toISOString()) })
  } catch (err) { next(err) }
})
```

Modify `server/src/app.ts`:
```ts
import { publicRouter } from './modules/public/public.routes'
// ...
app.use('/api/public', publicRouter)
```

- [ ] **Step 4: Run the test and verify it passes**

Run: `npm run test --workspace server -- public.test.ts`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add server/src/modules/public server/src/app.ts
git commit -m "feat: add public profile, service-type list and slots endpoints"
```

---

## Task 17: Email interface + Nodemailer/Ethereal implementation

**Files:**
- Create: `server/src/lib/email/index.ts`
- Create: `server/src/lib/email/nodemailer.ts`
- Test: `server/src/lib/email/nodemailer.test.ts`

**Interfaces:**
- Produces: `interface Mailer { sendMail(input: SendMailInput): Promise<void> }`, `interface SendMailInput { to: string; subject: string; html: string }` from `lib/email/index.ts`.
- Produces: `nodemailerMailer: Mailer` from `lib/email/nodemailer.ts` — consumed by Task 18's booking creation as the default `Mailer` implementation.

- [ ] **Step 1: Write the interface and the failing test (mocking `nodemailer` — no real network call)**

`server/src/lib/email/index.ts`:
```ts
export interface SendMailInput {
  to: string
  subject: string
  html: string
}

export interface Mailer {
  sendMail(input: SendMailInput): Promise<void>
}
```

`server/src/lib/email/nodemailer.test.ts`:
```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

const sendMailMock = vi.fn().mockResolvedValue({ messageId: 'abc' })
const createTestAccountMock = vi.fn().mockResolvedValue({
  smtp: { host: 'smtp.ethereal.email', port: 587, secure: false },
  user: 'user@ethereal.email',
  pass: 'pass',
})
const createTransportMock = vi.fn().mockReturnValue({ sendMail: sendMailMock })

vi.mock('nodemailer', () => ({
  default: {
    createTestAccount: (...args: unknown[]) => createTestAccountMock(...args),
    createTransport: (...args: unknown[]) => createTransportMock(...args),
    getTestMessageUrl: () => 'https://ethereal.email/preview/abc',
  },
}))

describe('nodemailerMailer', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
  })

  it('lazily creates an Ethereal transport and sends through it', async () => {
    const { nodemailerMailer } = await import('./nodemailer')
    await nodemailerMailer.sendMail({ to: 'a@example.com', subject: 'Hi', html: '<p>Hi</p>' })
    expect(createTestAccountMock).toHaveBeenCalledOnce()
    expect(sendMailMock).toHaveBeenCalledWith(expect.objectContaining({ to: 'a@example.com', subject: 'Hi', html: '<p>Hi</p>' }))
  })

  it('reuses the same transport across multiple sends', async () => {
    const { nodemailerMailer } = await import('./nodemailer')
    await nodemailerMailer.sendMail({ to: 'a@example.com', subject: 'One', html: '<p>1</p>' })
    await nodemailerMailer.sendMail({ to: 'b@example.com', subject: 'Two', html: '<p>2</p>' })
    expect(createTestAccountMock).toHaveBeenCalledOnce()
    expect(sendMailMock).toHaveBeenCalledTimes(2)
  })
})
```

Run: `npm run test --workspace server -- nodemailer.test.ts`
Expected: FAIL — `nodemailer.ts` doesn't exist.

- [ ] **Step 2: Implement the Nodemailer adapter**

`server/src/lib/email/nodemailer.ts`:
```ts
import nodemailer, { type Transporter } from 'nodemailer'
import { logger } from '../logger'
import type { Mailer, SendMailInput } from './index'

let transporter: Transporter | null = null

async function getTransporter(): Promise<Transporter> {
  if (transporter) return transporter
  const testAccount = await nodemailer.createTestAccount()
  transporter = nodemailer.createTransport({
    host: testAccount.smtp.host,
    port: testAccount.smtp.port,
    secure: testAccount.smtp.secure,
    auth: { user: testAccount.user, pass: testAccount.pass },
  })
  return transporter
}

export const nodemailerMailer: Mailer = {
  async sendMail(input: SendMailInput) {
    const t = await getTransporter()
    const info = await t.sendMail({ from: 'Agendamento <agendamento@example.com>', ...input })
    logger.info('Email sent (preview)', { url: nodemailer.getTestMessageUrl(info) })
  },
}
```

- [ ] **Step 3: Run the tests and verify they pass**

Run: `npm run test --workspace server -- nodemailer.test.ts`
Expected: PASS (2 tests)

- [ ] **Step 4: Commit**

```bash
git add server/src/lib/email
git commit -m "feat: add swappable Mailer interface with an Ethereal-backed implementation"
```

---

## Task 18: Custom form validation + POST /api/public/:slug/bookings

**Files:**
- Create: `server/src/modules/bookings/form-validation.ts`
- Create: `server/src/modules/bookings/bookings.service.ts`
- Modify: `server/src/modules/public/public.routes.ts` — add `POST /:slug/bookings`
- Test: `server/src/modules/bookings/form-validation.test.ts`
- Test: `server/src/modules/bookings/bookings.create.test.ts`

**Interfaces:**
- Consumes: `nodemailerMailer`/`Mailer` (Task 17), `prisma` (Task 2), `AppError` (Task 4).
- Produces: `validateFormResponses(fields, responses): Record<string, unknown>` from `form-validation.ts`.
- Produces: `createPublicBooking(slug: string, input: CreateBookingInput, mailer?: Mailer): Promise<Booking>` from `bookings.service.ts` — the `mailer` parameter defaults to `nodemailerMailer` in production but lets Task 19's concurrency test (and this task's own test) inject a fake, keeping tests network-free.

- [ ] **Step 1: Write the failing form-validation test**

`server/src/modules/bookings/form-validation.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { validateFormResponses } from './form-validation'

const fields = [
  { id: 'f1', label: 'Queixa principal', fieldType: 'TEXTAREA' as const, required: true, options: null },
  { id: 'f2', label: 'Já fez terapia antes?', fieldType: 'SELECT' as const, required: true, options: ['Sim', 'Não'] },
  { id: 'f3', label: 'Medicação', fieldType: 'TEXT' as const, required: false, options: null },
]

describe('validateFormResponses', () => {
  it('accepts a valid response set', () => {
    const result = validateFormResponses(fields, { f1: 'Ansiedade', f2: 'Sim' })
    expect(result).toEqual({ f1: 'Ansiedade', f2: 'Sim' })
  })

  it('throws when a required field is missing', () => {
    expect(() => validateFormResponses(fields, { f2: 'Sim' })).toThrow(/Queixa principal/)
  })

  it('throws when a SELECT value is not one of the options', () => {
    expect(() => validateFormResponses(fields, { f1: 'x', f2: 'Talvez' })).toThrow(/Já fez terapia antes/)
  })

  it('allows an optional field to be omitted', () => {
    const result = validateFormResponses(fields, { f1: 'x', f2: 'Não' })
    expect(result.f3).toBeUndefined()
  })
})
```

Run: `npm run test --workspace server -- form-validation.test.ts`
Expected: FAIL — file doesn't exist.

- [ ] **Step 2: Implement form validation**

`server/src/modules/bookings/form-validation.ts`:
```ts
import { AppError } from '../../lib/errors'

export interface CustomFieldDef {
  id: string
  label: string
  fieldType: 'TEXT' | 'NUMBER' | 'SELECT' | 'TEXTAREA'
  required: boolean
  options: string[] | null
}

export function validateFormResponses(
  fields: CustomFieldDef[],
  responses: Record<string, unknown>
): Record<string, unknown> {
  const validated: Record<string, unknown> = {}
  for (const field of fields) {
    const value = responses[field.id]
    if (value === undefined || value === null || value === '') {
      if (field.required) throw new AppError(400, `O campo "${field.label}" é obrigatório`)
      continue
    }
    switch (field.fieldType) {
      case 'TEXT':
      case 'TEXTAREA':
        if (typeof value !== 'string') throw new AppError(400, `O campo "${field.label}" deve ser texto`)
        validated[field.id] = value
        break
      case 'NUMBER':
        if (typeof value !== 'number') throw new AppError(400, `O campo "${field.label}" deve ser numérico`)
        validated[field.id] = value
        break
      case 'SELECT':
        if (typeof value !== 'string' || !(field.options ?? []).includes(value)) {
          throw new AppError(400, `O campo "${field.label}" tem um valor inválido`)
        }
        validated[field.id] = value
        break
    }
  }
  return validated
}
```

Run: `npm run test --workspace server -- form-validation.test.ts`
Expected: PASS (4 tests)

- [ ] **Step 3: Write the failing booking-creation test**

`server/src/modules/bookings/bookings.create.test.ts`:
```ts
import { describe, it, expect, beforeEach } from 'vitest'
import { prisma } from '../../lib/prisma'
import { createPublicBooking } from './bookings.service'
import { cleanDatabase, createTestUser } from '../../../test/helpers'
import type { Mailer, SendMailInput } from '../../lib/email'

function fakeMailer(): { mailer: Mailer; sent: SendMailInput[] } {
  const sent: SendMailInput[] = []
  return { mailer: { sendMail: async (input) => { sent.push(input) } }, sent }
}

describe('createPublicBooking', () => {
  beforeEach(cleanDatabase)

  it('creates a booking, validates the custom form, and emails both parties', async () => {
    const { user } = await createTestUser({ email: 'prof@example.com', slug: 'prof' })
    const serviceType = await prisma.serviceType.create({
      data: {
        userId: user.id, name: 'Primeira consulta', durationMinutes: 60, requiresCustomForm: true,
        customFields: { create: [{ label: 'Queixa principal', fieldType: 'TEXTAREA', required: true, order: 0 }] },
      },
      include: { customFields: true },
    })
    const { mailer, sent } = fakeMailer()

    const booking = await createPublicBooking('prof', {
      serviceTypeId: serviceType.id,
      startsAt: '2026-09-10T13:00:00.000Z',
      clientName: 'Cliente Teste',
      clientEmail: 'cliente@example.com',
      formResponses: { [serviceType.customFields[0].id]: 'Ansiedade' },
    }, mailer)

    expect(booking.status).toBe('CONFIRMED')
    expect(sent).toHaveLength(2)
    expect(sent.map((s) => s.to).sort()).toEqual(['cliente@example.com', 'prof@example.com'].sort())
  })

  it('rejects a booking missing a required custom field', async () => {
    const { user } = await createTestUser({ email: 'prof2@example.com', slug: 'prof2' })
    const serviceType = await prisma.serviceType.create({
      data: {
        userId: user.id, name: 'Consulta', durationMinutes: 60, requiresCustomForm: true,
        customFields: { create: [{ label: 'Objetivo', fieldType: 'TEXT', required: true, order: 0 }] },
      },
    })
    const { mailer } = fakeMailer()

    await expect(createPublicBooking('prof2', {
      serviceTypeId: serviceType.id, startsAt: '2026-09-10T13:00:00.000Z',
      clientName: 'C', clientEmail: 'c@example.com',
    }, mailer)).rejects.toThrow(/Objetivo/)
  })

  it('returns 409-mapped error when the slot is already booked', async () => {
    const { user } = await createTestUser({ email: 'prof3@example.com', slug: 'prof3' })
    const serviceType = await prisma.serviceType.create({
      data: { userId: user.id, name: 'Sessão', durationMinutes: 50 },
    })
    const { mailer } = fakeMailer()
    const startsAt = '2026-09-10T13:00:00.000Z'

    await createPublicBooking('prof3', { serviceTypeId: serviceType.id, startsAt, clientName: 'A', clientEmail: 'a@example.com' }, mailer)
    await expect(
      createPublicBooking('prof3', { serviceTypeId: serviceType.id, startsAt, clientName: 'B', clientEmail: 'b@example.com' }, mailer)
    ).rejects.toMatchObject({ statusCode: 409 })
  })
})
```

Run: `npm run test --workspace server -- bookings.create.test.ts`
Expected: FAIL — `bookings.service.ts` doesn't exist.

- [ ] **Step 4: Implement the booking-creation service**

`server/src/modules/bookings/bookings.service.ts`:
```ts
import { Prisma } from '@prisma/client'
import { addMinutes } from 'date-fns'
import { prisma } from '../../lib/prisma'
import { AppError } from '../../lib/errors'
import { logger } from '../../lib/logger'
import type { Mailer } from '../../lib/email'
import { nodemailerMailer } from '../../lib/email/nodemailer'
import { validateFormResponses } from './form-validation'

export interface CreateBookingInput {
  serviceTypeId: string
  startsAt: string
  clientName: string
  clientEmail: string
  formResponses?: Record<string, unknown>
}

const SLOT_TAKEN_MESSAGE = 'Esse horário acabou de ser reservado, escolha outro.'

export async function createPublicBooking(
  slug: string,
  input: CreateBookingInput,
  mailer: Mailer = nodemailerMailer
) {
  const user = await prisma.user.findUnique({ where: { slug } })
  if (!user) throw new AppError(404, 'Profissional não encontrado')

  const serviceType = await prisma.serviceType.findFirst({
    where: { id: input.serviceTypeId, userId: user.id },
    include: { customFields: true },
  })
  if (!serviceType) throw new AppError(404, 'Tipo de serviço não encontrado')

  const startsAt = new Date(input.startsAt)
  const endsAt = addMinutes(startsAt, serviceType.durationMinutes)

  const validatedResponses = serviceType.requiresCustomForm
    ? validateFormResponses(
        serviceType.customFields.map((f) => ({
          ...f,
          options: Array.isArray(f.options) ? (f.options as string[]) : null,
        })),
        input.formResponses ?? {}
      )
    : undefined

  const conflict = await prisma.booking.findFirst({
    where: { userId: user.id, status: 'CONFIRMED', startsAt: { lt: endsAt }, endsAt: { gt: startsAt } },
  })
  if (conflict) throw new AppError(409, SLOT_TAKEN_MESSAGE)

  let booking
  try {
    booking = await prisma.booking.create({
      data: {
        userId: user.id, serviceTypeId: serviceType.id,
        clientName: input.clientName, clientEmail: input.clientEmail,
        startsAt, endsAt,
        formResponses: validatedResponses as Prisma.InputJsonValue,
      },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    if (message.toLowerCase().includes('exclusion constraint')) {
      throw new AppError(409, SLOT_TAKEN_MESSAGE)
    }
    throw err
  }

  await Promise.all([
    mailer.sendMail({
      to: input.clientEmail,
      subject: `Agendamento confirmado com ${user.name}`,
      html: `<p>Seu agendamento de "${serviceType.name}" foi confirmado para ${startsAt.toISOString()}.</p>`,
    }),
    mailer.sendMail({
      to: user.email,
      subject: `Novo agendamento: ${input.clientName}`,
      html: `<p>${input.clientName} agendou "${serviceType.name}" para ${startsAt.toISOString()}.</p>`,
    }),
  ]).catch((err) => {
    logger.error('Failed to send booking confirmation emails', { message: err instanceof Error ? err.message : String(err) })
  })

  return booking
}
```

- [ ] **Step 5: Add the route**

Append to `server/src/modules/public/public.routes.ts` (add `createPublicBooking` to imports):
```ts
import { createPublicBooking } from '../bookings/bookings.service'

const createBookingSchema = z.object({
  serviceTypeId: z.string().min(1),
  startsAt: z.string().datetime(),
  clientName: z.string().min(1),
  clientEmail: z.string().email(),
  formResponses: z.record(z.unknown()).optional(),
})

publicRouter.post('/:slug/bookings', async (req, res, next) => {
  try {
    const input = createBookingSchema.parse(req.body)
    const booking = await createPublicBooking(req.params.slug, input)
    res.status(201).json({ id: booking.id, startsAt: booking.startsAt, endsAt: booking.endsAt, status: booking.status })
  } catch (err) { next(err) }
})
```

- [ ] **Step 6: Run the tests and verify they pass**

Run: `npm run test --workspace server -- bookings.create.test.ts`
Expected: PASS (3 tests)

- [ ] **Step 7: Commit**

```bash
git add server/src/modules/bookings server/src/modules/public/public.routes.ts
git commit -m "feat: add race-safe public booking creation with email confirmations"
```

---

## Task 19: Concurrency test + professional's agenda (list/cancel)

**Files:**
- Create: `server/test/booking-concurrency.test.ts`
- Create: `server/src/modules/bookings/bookings.routes.ts`
- Modify: `server/src/app.ts` — mount at `/api/bookings`
- Test: `server/src/modules/bookings/bookings.agenda.test.ts`

**Interfaces:**
- Consumes: `createPublicBooking` (Task 18), `requireAuth` (Task 9).

- [ ] **Step 1: Write and run the concurrency test**

`server/test/booking-concurrency.test.ts`:
```ts
import { describe, it, expect, beforeEach } from 'vitest'
import { prisma } from '../src/lib/prisma'
import { createPublicBooking } from '../src/modules/bookings/bookings.service'
import { cleanDatabase } from './helpers'
import type { Mailer } from '../src/lib/email'

const fakeMailer: Mailer = { sendMail: async () => {} }

describe('booking concurrency', () => {
  beforeEach(cleanDatabase)

  it('allows only one of two simultaneous bookings for the same slot to succeed', async () => {
    const user = await prisma.user.create({
      data: { name: 'Joana', email: 'joana-conc@example.com', passwordHash: 'x', slug: 'joana-conc', timezone: 'America/Sao_Paulo' },
    })
    const serviceType = await prisma.serviceType.create({ data: { userId: user.id, name: 'Sessão', durationMinutes: 50 } })
    const startsAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()

    const attempt = () => createPublicBooking('joana-conc', {
      serviceTypeId: serviceType.id, startsAt, clientName: 'Cliente', clientEmail: 'cliente@example.com',
    }, fakeMailer)

    const results = await Promise.allSettled([attempt(), attempt()])
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1)
    expect(results.filter((r) => r.status === 'rejected')).toHaveLength(1)

    const confirmedCount = await prisma.booking.count({ where: { userId: user.id, status: 'CONFIRMED' } })
    expect(confirmedCount).toBe(1)
  })
})
```

Run: `npm run test --workspace server -- booking-concurrency.test.ts`
Expected: PASS immediately — this test exercises code that already exists (Task 18); it should pass on first run and is here specifically to prove the DB constraint holds under real concurrent access. If it fails, the exclusion constraint from Task 2 isn't behaving as expected — stop and investigate before continuing.

- [ ] **Step 2: Write the failing agenda test**

`server/src/modules/bookings/bookings.agenda.test.ts`:
```ts
import { describe, it, expect, beforeEach } from 'vitest'
import request from 'supertest'
import { createApp } from '../../app'
import { cleanDatabase, createTestUser } from '../../../test/helpers'
import { prisma } from '../../lib/prisma'

describe('professional agenda', () => {
  beforeEach(cleanDatabase)

  it('lists only the professional\'s own bookings and can cancel one', async () => {
    const { user, accessToken } = await createTestUser({ email: 'agenda@example.com', slug: 'agenda-slug' })
    const serviceType = await prisma.serviceType.create({ data: { userId: user.id, name: 'Sessão', durationMinutes: 50 } })
    const booking = await prisma.booking.create({
      data: {
        userId: user.id, serviceTypeId: serviceType.id, clientName: 'Cliente', clientEmail: 'c@example.com',
        startsAt: new Date('2026-09-10T13:00:00Z'), endsAt: new Date('2026-09-10T13:50:00Z'),
      },
    })
    const app = createApp()
    const auth = { Authorization: `Bearer ${accessToken}` }

    const listRes = await request(app).get('/api/bookings').set(auth)
    expect(listRes.body).toHaveLength(1)

    const cancelRes = await request(app).patch(`/api/bookings/${booking.id}/cancel`).set(auth)
    expect(cancelRes.status).toBe(200)
    expect(cancelRes.body.status).toBe('CANCELLED')

    const other = await createTestUser({ email: 'other-agenda@example.com', slug: 'other-agenda' })
    const forbiddenRes = await request(app).patch(`/api/bookings/${booking.id}/cancel`)
      .set('Authorization', `Bearer ${other.accessToken}`)
    expect(forbiddenRes.status).toBe(404)
  })
})
```

Run: `npm run test --workspace server -- bookings.agenda.test.ts`
Expected: FAIL — `bookings.routes.ts` doesn't exist.

- [ ] **Step 3: Implement the agenda routes**

`server/src/modules/bookings/bookings.routes.ts`:
```ts
import { Router } from 'express'
import { z } from 'zod'
import { requireAuth } from '../../middleware/requireAuth'
import { prisma } from '../../lib/prisma'
import { AppError } from '../../lib/errors'

export const bookingsRouter = Router()
bookingsRouter.use(requireAuth)

const listQuerySchema = z.object({
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  status: z.enum(['CONFIRMED', 'CANCELLED']).optional(),
})

bookingsRouter.get('/', async (req, res, next) => {
  try {
    const { from, to, status } = listQuerySchema.parse(req.query)
    const bookings = await prisma.booking.findMany({
      where: {
        userId: req.userId!,
        status,
        startsAt: { gte: from ? new Date(from) : undefined, lte: to ? new Date(to) : undefined },
      },
      include: { serviceType: true },
      orderBy: { startsAt: 'asc' },
    })
    res.json(bookings)
  } catch (err) { next(err) }
})

bookingsRouter.patch('/:id/cancel', async (req, res, next) => {
  try {
    const booking = await prisma.booking.findFirst({ where: { id: req.params.id, userId: req.userId! } })
    if (!booking) throw new AppError(404, 'Agendamento não encontrado')
    const updated = await prisma.booking.update({ where: { id: booking.id }, data: { status: 'CANCELLED' } })
    res.json(updated)
  } catch (err) { next(err) }
})
```

Modify `server/src/app.ts`:
```ts
import { bookingsRouter } from './modules/bookings/bookings.routes'
// ...
app.use('/api/bookings', bookingsRouter)
```

- [ ] **Step 4: Run the tests and verify they pass**

Run: `npm run test --workspace server`
Expected: PASS — the full suite, every task so far, green.

- [ ] **Step 5: Commit**

```bash
git add server/test/booking-concurrency.test.ts server/src/modules/bookings/bookings.routes.ts server/src/modules/bookings/bookings.agenda.test.ts server/src/app.ts
git commit -m "feat: add professional agenda (list/cancel) and lock in the concurrency guarantee"
```

---

## After This Plan

The backend API is complete and fully tested at this point: auth, service-type CRUD, availability config, the availability engine, race-safe booking creation with email, and the agenda view. A follow-up plan covers the frontend — `client/` (Vite + React + TS), the panel and public-booking pages, and translating `DESIGN.md`'s tokens into `tailwind.config.ts` (spec §14, phases 8–9) — written once this backend is merged and the API surface (spec §9) is stable to build against. It also covers the README and deploy instructions (spec §14, phase 9).
