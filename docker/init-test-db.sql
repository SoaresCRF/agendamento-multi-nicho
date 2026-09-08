-- Runs once, only on a fresh volume (docker-entrypoint-initdb.d convention).
-- Creates a second database so `npm run test:server` (which truncates tables
-- between tests, see server/test/helpers.ts) never runs against the same
-- database as `npm run dev:server` / prisma:seed.
CREATE DATABASE agendamento_test OWNER agendamento;
