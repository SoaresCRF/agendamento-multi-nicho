# Agendamento Multi-Nicho

SaaS de agendamento (estilo Calendly) para profissionais autônomos de
diferentes nichos — psicólogos, personal trainers, etc. Cada profissional
tem sua própria página pública de agendamento, com seus tipos de
atendimento, disponibilidade semanal e formulários customizados. O cliente
final agenda por esse link público, **sem precisar criar conta**.

## Sumário

- [O que o projeto faz](#o-que-o-projeto-faz)
- [Tecnologias](#tecnologias)
- [Arquitetura e decisões relevantes](#arquitetura-e-decisões-relevantes)
- [Pré-requisitos](#pré-requisitos)
- [Como rodar localmente](#como-rodar-localmente)
- [Variáveis de ambiente](#variáveis-de-ambiente)
- [Testes](#testes)
- [Typecheck](#typecheck)
- [Lint e formatação](#lint-e-formatação)
- [CI](#ci)
- [Visão geral da API](#visão-geral-da-api)

## O que o projeto faz

- **Painel do profissional** (autenticado, com recuperação de senha por
  e-mail): cadastro/login, configuração da disponibilidade semanal, criação
  de tipos de atendimento (com formulário customizado por tipo — campos de
  texto, número, seleção, área de texto), regras de disponibilidade
  específicas por tipo de atendimento, bloqueios manuais de horário (férias,
  imprevistos), edição de perfil (foto — upload direto ou URL — e bio) e
  visão da agenda com cancelamento de agendamentos.
- **Página pública de agendamento** (`/<slug-do-profissional>`, sem login):
  o cliente escolhe o tipo de atendimento, vê os horários realmente livres
  (já cruzando disponibilidade, regras do tipo escolhido, agendamentos
  existentes e bloqueios), preenche o formulário customizado daquele tipo
  (se houver) e confirma o agendamento — recebendo e-mail de confirmação e
  podendo baixar o compromisso em `.ics`.

## Tecnologias

**Backend** (`server/`):

- Node.js 20+, Express, TypeScript
- Prisma ORM + PostgreSQL
- Autenticação: `jsonwebtoken` (access token) + `bcryptjs` (hash de senha)
- Validação de entrada: Zod
- `helmet` (security headers), `cors`, `cookie-parser`, `express-rate-limit`,
  `compression` (gzip nas respostas)
- `date-fns` / `date-fns-tz` para cálculo de horários com fuso horário
- `nodemailer` para e-mail (SMTP real se `SMTP_*` estiver setado, senão
  Ethereal em dev)
- Testes: Vitest + Supertest

**Frontend** (`client/`):

- React 18 + Vite + TypeScript
- Tailwind CSS
- React Router v7 (rotas protegidas por autenticação e rotas públicas)
- TanStack Query (cache e sincronização de dados do servidor)
- React Hook Form + Zod (`@hookform/resolvers`) para formulários, incluindo
  os campos customizados dinâmicos
- Testes: Vitest + Testing Library

**Infra e tooling:**

- Monorepo com npm workspaces (`server` + `client`)
- ESLint + Prettier (repo inteiro)
- GitHub Actions (CI em push/PR para `main`)
- Docker Compose (Postgres local de desenvolvimento)

## Arquitetura e decisões relevantes

- **Autenticação:** JWT de acesso, vida curta, mantido só em memória no
  cliente (não vai pro `localStorage`) + refresh token de vida longa em
  cookie `httpOnly`, renovado silenciosamente ao carregar o app. Quando
  frontend e backend ficam em domínios diferentes, o cookie usa
  `sameSite=none` + `secure=true`.
- **Cálculo de horários disponíveis** (`server/src/modules/availability/engine.ts`):
  função pura que cruza a disponibilidade geral do profissional, as regras
  específicas por tipo de atendimento (quando existem — substituem, não
  somam, a disponibilidade geral daquele dia) e os conflitos (agendamentos
  confirmados + bloqueios manuais), fatiando o resultado em slots do
  tamanho exato da duração do atendimento escolhido. Feriados nacionais
  (fixos + móveis, calculados via algoritmo de Meeus/Jones/Butcher para a
  Páscoa — `holidays.ts`) zeram a disponibilidade do dia inteiro. Tudo é
  calculado e armazenado em UTC, convertido para o fuso do profissional só
  na exibição.
- **Concorrência na criação de agendamento** (`server/src/modules/bookings/bookings.service.ts`):
  toda criação pública primeiro revalida o horário pedido contra essa mesma
  função de disponibilidade (nunca confia no horário que o cliente mandou)
  e depois insere protegido por uma constraint `EXCLUDE` no Postgres — se
  dois clientes tentarem o mesmo horário ao mesmo tempo, o banco garante
  que só um agendamento é criado.
- **Autorização por recurso:** toda rota autenticada (tipos de atendimento,
  disponibilidade, bloqueios, agenda) filtra pelo `userId` do token — um
  profissional nunca lê ou edita dado de outro.
- **CSRF e rate limiting:** como o cookie de refresh usa `sameSite=none`
  entre domínios diferentes, `/api/auth/refresh` e `/api/auth/logout`
  também exigem que o header `Origin` bata com `CLIENT_ORIGIN`
  (`requireSameOrigin`, defesa em profundidade). Endpoints sensíveis
  (login, registro, criação de agendamento) usam um limite mais estrito
  (`strictLimiter`) que os de leitura pública (`publicReadLimiter`).

## Pré-requisitos

- [Node.js](https://nodejs.org/) 20 ou superior
- [Docker](https://www.docker.com/) (para o Postgres local via Docker Compose)
- npm (vem com o Node; o projeto usa npm workspaces, não yarn/pnpm)

## Como rodar localmente

```bash
# 1. instalar dependências das duas workspaces (server + client)
npm install

# 2. subir o Postgres local
docker compose up -d postgres

# 3. criar os arquivos de variáveis de ambiente a partir dos exemplos
cp server/.env.example server/.env
cp client/.env.example client/.env
# edite server/.env e troque JWT_SECRET e FORM_RESPONSES_ENCRYPTION_KEY por
# valores aleatórios de 32+ caracteres cada, ex.: `openssl rand -base64 48`
# (os demais valores já funcionam com o Postgres do passo 2)

# 4. aplicar as migrations do Prisma
npm run --workspace server prisma:migrate

# 5. (opcional) popular o banco com 2 profissionais de exemplo
npm run --workspace server prisma:seed

# 6. banco de teste — `npm run test:server` trunca tabelas entre testes
# (server/test/helpers.ts), então usa um banco Postgres separado para nunca
# apagar os dados do passo 5. docker/init-test-db.sql cria esse banco
# automaticamente num volume novo (passo 2); num volume já existente, crie à
# mão:
docker exec <container_do_postgres> psql -U agendamento -d agendamento -c "CREATE DATABASE agendamento_test OWNER agendamento;"
cp server/.env.test.example server/.env.test
npm run --workspace server prisma:migrate:test

# 7. subir os dois serviços (em terminais separados)
npm run dev:server   # API em http://localhost:3000
npm run dev:client   # SPA em http://localhost:5173
```

Se rodou o seed do passo 5, os profissionais de exemplo (senha `demo1234`
para os dois — **só localmente**) ficam disponíveis em:

- `http://localhost:5173/joana-psicologa` — Psicologia
- `http://localhost:5173/carlos-personal` — Personal Trainer

Pra logar no painel deles, use a página de login com o e-mail
`joana@example.com` ou `carlos@example.com` e a senha acima.

## Variáveis de ambiente

**`server/.env`** (referência completa e comentada em `server/.env.example`):

| Variável                                              | Obrigatória | Default (dev)           | Descrição                                                                                                                                                                                                     |
| ----------------------------------------------------- | ----------- | ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `NODE_ENV`                                            | não         | `development`           | `development`, `test` ou `production`. Controla `secure`/`sameSite` do cookie de refresh.                                                                                                                     |
| `DATABASE_URL`                                        | **sim**     | —                       | Connection string do Postgres.                                                                                                                                                                                |
| `JWT_SECRET`                                          | **sim**     | —                       | 32+ caracteres aleatórios. Assina/verifica o access token. Nunca reaproveitar entre ambientes.                                                                                                                |
| `FORM_RESPONSES_ENCRYPTION_KEY`                       | **sim**     | —                       | 32+ caracteres aleatórios. Criptografa os campos de intake customizados (podem carregar resposta de saúde) em repouso. Trocar em produção torna as respostas já salvas ilegíveis — não é uma rotação trivial. |
| `PORT`                                                | não         | `3000`                  | Porta em que a API escuta.                                                                                                                                                                                    |
| `CLIENT_ORIGIN`                                       | não         | `http://localhost:5173` | Origin liberada no CORS — precisa ser a URL usada pelo frontend.                                                                                                                                              |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASS` | não         | —                       | Se as 4 estiverem setadas, e-mail de confirmação sai por SMTP real; senão cai numa conta de teste Ethereal (dev).                                                                                             |
| `SEED_DEMO_PASSWORD`                                  | não*        | `demo1234`              | Senha usada por `prisma:seed` para os 2 profissionais de exemplo. *Obrigatória se `NODE_ENV=production` — o script recusa rodar sem ela.                                                                      |

**`client/.env`** (referência em `client/.env.example`):

| Variável       | Obrigatória | Default (dev)           | Descrição                               |
| -------------- | ----------- | ----------------------- | --------------------------------------- |
| `VITE_API_URL` | não         | `http://localhost:3000` | URL base da API que o frontend consome. |

## Testes

```bash
npm run test:server
npm run test:client
```

## Typecheck

```bash
npm run typecheck:server
npm run typecheck:client
```

## Lint e formatação

```bash
npm run lint           # ESLint em client/ e server/
npm run format         # Prettier --write no repo inteiro
npm run format:check   # Prettier --check, sem escrever
```

## CI

O workflow `.github/workflows/ci.yml` roda em todo push/PR para `main`:
lint, `format:check`, typecheck e testes de `client/` e `server/` (com um
Postgres de serviço), e o build de produção do `client/`.

## Visão geral da API

Todas as rotas abaixo, exceto `/health`, `/api/auth/*` e `/api/public/*`,
exigem o access token (`Authorization: Bearer <token>`) e são
automaticamente restritas ao profissional dono do token.

| Rota                                                     | Autenticação       | Descrição                                                                                                  |
| -------------------------------------------------------- | ------------------ | ---------------------------------------------------------------------------------------------------------- |
| `GET /health`                                            | não                | Health check.                                                                                              |
| `POST /api/auth/register`                                | não                | Cria conta de profissional.                                                                                |
| `POST /api/auth/login`                                   | não                | Login, define cookie de refresh.                                                                           |
| `POST /api/auth/refresh`                                 | não (usa cookie)   | Renova o access token.                                                                                     |
| `POST /api/auth/logout`                                  | não                | Revoga o refresh token.                                                                                    |
| `POST /api/auth/forgot-password`                         | não                | Envia link de redefinição por e-mail (resposta genérica, não revela se o e-mail existe).                   |
| `POST /api/auth/reset-password`                          | não                | Troca a senha via token (válido por 20 min, uso único) e revoga todas as sessões ativas.                   |
| `GET/PATCH /api/me`                                      | sim                | Dados do profissional autenticado / atualização de perfil (foto, bio).                                     |
| `GET/POST/PATCH/DELETE /api/service-types`               | sim                | CRUD de tipos de atendimento.                                                                              |
| `GET/PUT /api/service-types/:id/availability-rules`      | sim                | Regras de disponibilidade por tipo.                                                                        |
| `GET/PUT /api/availability`                              | sim                | Disponibilidade semanal geral.                                                                             |
| `GET/POST/DELETE /api/blocked-slots`                     | sim                | Bloqueios manuais de horário.                                                                              |
| `GET /api/bookings` / `PATCH /api/bookings/:id/cancel`   | sim                | Agenda (paginada: `cursor`/`limit`, resposta `{ items, nextCursor }`) e cancelamento.                      |
| `GET /api/public/:slug`                                  | não                | Perfil público do profissional (`Cache-Control: public, max-age=30`).                                      |
| `GET /api/public/:slug/service-types`                    | não                | Tipos de atendimento do profissional (`Cache-Control: public, max-age=30`).                                |
| `GET /api/public/:slug/service-types/:id/slots`          | não                | Horários livres para aquele tipo (nunca cacheado — muda a cada agendamento).                               |
| `GET /api/public/:slug/service-types/:id/available-days` | não                | Dias do mês com pelo menos 1 horário livre (nunca cacheado).                                               |
| `POST /api/public/:slug/bookings`                        | não (rate-limited) | Cria agendamento.                                                                                          |
| `GET /api/public/sitemap-slugs`                          | não                | Slugs + `updatedAt` de todos os profissionais (paginado: `cursor`/`limit`), para o `sitemap.xml` dinâmico. |
