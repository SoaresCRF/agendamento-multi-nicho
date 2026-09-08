// `dotenv/config` only fills env vars not already set, so run this as its own
// process (not chained with `&&`) — a sibling `node -e` loading .env.test
// wouldn't leak those vars into this script's `prisma migrate deploy` call.
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env.test') })

const { spawnSync } = require('node:child_process')
const result = spawnSync('npx', ['prisma', 'migrate', 'deploy'], { stdio: 'inherit', env: process.env, shell: true })
process.exit(result.status ?? 1)
