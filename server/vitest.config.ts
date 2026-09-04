import { defineConfig, configDefaults } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    hookTimeout: 20000,
    testTimeout: 20000,
    // Test files share one local Postgres instance; each file's beforeEach(cleanDatabase)
    // races other files' data when vitest runs files in parallel. Serialize instead.
    fileParallelism: false,
    // seed.test.ts asserts against prisma/seed.ts's output but doesn't seed itself —
    // every other file's cleanDatabase() (test/helpers.ts) wipes the User table it
    // depends on, so it only passes if vitest happens to schedule it before any of
    // them. Order-dependent, not a real unit/integration test: exclude it from the
    // automated suite. Run it manually as a seed smoke check via
    // `npm run prisma:seed && npx vitest run prisma/seed.test.ts`.
    exclude: [...configDefaults.exclude, 'prisma/seed.test.ts'],
  },
})
