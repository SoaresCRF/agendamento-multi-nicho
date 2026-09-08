import { config } from 'dotenv'
import path from 'node:path'

// Runs before any test file's imports reach src/lib/env.ts. Its plain `import
// 'dotenv/config'` only fills in vars not already set, so this override:true
// load — pointing DATABASE_URL/JWT_SECRET at the dedicated test database —
// wins. In CI, no .env.test file exists, so this is a silent no-op and the
// workflow's own DATABASE_URL (an ephemeral, single-purpose container) is used.
config({ path: path.resolve(__dirname, '.env.test'), override: true })
