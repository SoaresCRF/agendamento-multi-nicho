import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    hookTimeout: 20000,
    testTimeout: 20000,
    // Test files share one local Postgres instance; each file's beforeEach(cleanDatabase)
    // races other files' data when vitest runs files in parallel. Serialize instead.
    fileParallelism: false,
  },
})
