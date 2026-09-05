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
- [Lint e formatação](#lint-e-formatação)
- [CI](#ci)
- [Visão geral da API](#visão-geral-da-api)
- [Deploy](#deploy)
- [Pendências conhecidas](#pendências-conhecidas)

## O que o projeto faz

- **Painel do profissional** (autenticado): cadastro/login, configuração da
  disponibilidade semanal, criação de tipos de atendimento (com formulário
  customizado por tipo — campos de texto, número, seleção, área de texto),
  regras de disponibilidade específicas por tipo de atendimento, bloqueios
  manuais de horário (férias, imprevistos) e visão da agenda com
  cancelamento de agendamentos.
- **Página pública de agendamento** (`/<slug-do-profissional>`, sem login):
  o cliente escolhe o tipo de atendimento, vê os horários realmente livres
  (já cruzando disponibilidade, regras do tipo escolhido, agendamentos
  existentes e bloqueios), preenche o formulário customizado daquele tipo
  (se houver) e confirma o agendamento.

## Tecnologias

**Backend** (`server/`):

- Node.js 20+, Express, TypeScript
- Prisma ORM + PostgreSQL
- Autenticação: `jsonwebtoken` (access token) + `bcryptjs` (hash de senha)
- Validação de entrada: Zod
- `helmet` (security headers), `cors`, `cookie-parser`, `express-rate-limit`
- `date-fns` / `date-fns-tz` para cálculo de horários com fuso horário
- `nodemailer` para e-mail (ver [Pendências conhecidas](#pendências-conhecidas))
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
- Deploy alvo: Vercel (frontend) + Render ou Railway (backend + Postgres gerenciado)

## Arquitetura e decisões relevantes

- **Autenticação:** JWT de acesso, vida curta, mantido só em memória no
  cliente (não vai pro `localStorage`) + refresh token de vida longa em
  cookie `httpOnly`, renovado silenciosamente ao carregar o app. Em
  produção o cookie usa `sameSite=none` + `secure=true`, porque frontend
  (Vercel) e backend (Render) ficam em domínios diferentes.
- **Cálculo de horários disponíveis** (`server/src/modules/availability/engine.ts`):
  função pura que cruza a disponibilidade geral do profissional, as regras
  específicas por tipo de atendimento (quando existem — substituem, não
  somam, a disponibilidade geral daquele dia) e os conflitos (agendamentos
  confirmados + bloqueios manuais), fatiando o resultado em slots do
  tamanho exato da duração do atendimento escolhido. Tudo é calculado e
  armazenado em UTC, convertido para o fuso do profissional só na exibição.
- **Concorrência na criação de agendamento** (`server/src/modules/bookings/bookings.service.ts`):
  toda criação pública primeiro revalida o horário pedido contra essa mesma
  função de disponibilidade (nunca confia no horário que o cliente mandou)
  e depois insere protegido por uma constraint `EXCLUDE` no Postgres — se
  dois clientes tentarem o mesmo horário ao mesmo tempo, o banco garante
  que só um agendamento é criado.
- **Autorização por recurso:** toda rota autenticada (tipos de atendimento,
  disponibilidade, bloqueios, agenda) filtra pelo `userId` do token — um
  profissional nunca lê ou edita dado de outro.

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
# edite server/.env e troque o JWT_SECRET por um valor aleatório de 32+
# caracteres (os demais valores já funcionam com o Postgres do passo 2)

# 4. aplicar as migrations do Prisma
npm run --workspace server prisma:migrate

# 5. (opcional) popular o banco com 2 profissionais de exemplo
npm run --workspace server prisma:seed

# 6. subir os dois serviços (em terminais separados)
npm run dev:server   # API em http://localhost:3000
npm run dev:client   # SPA em http://localhost:5173
```

Se rodou o seed do passo 5, os profissionais de exemplo (senha `demo1234`
para os dois — **só localmente**, ver [Deploy](#deploy) para produção)
ficam disponíveis em:

- `http://localhost:5173/joana-psicologa` — Psicologia
- `http://localhost:5173/carlos-personal` — Personal Trainer

Pra logar no painel deles, use a página de login com o e-mail
`joana@example.com` ou `carlos@example.com` e a senha acima.

## Variáveis de ambiente

**`server/.env`** (referência completa e comentada em `server/.env.example`):

| Variável                                              | Obrigatória | Default (dev)           | Descrição                                                                                                                                |
| ----------------------------------------------------- | ----------- | ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `NODE_ENV`                                            | não         | `development`           | `development`, `test` ou `production`. Controla `secure`/`sameSite` do cookie de refresh.                                                |
| `DATABASE_URL`                                        | **sim**     | —                       | Connection string do Postgres.                                                                                                           |
| `JWT_SECRET`                                          | **sim**     | —                       | 32+ caracteres aleatórios. Assina/verifica o access token. Nunca reaproveitar entre ambientes.                                           |
| `PORT`                                                | não         | `3000`                  | Porta em que a API escuta.                                                                                                               |
| `CLIENT_ORIGIN`                                       | não         | `http://localhost:5173` | Origin liberada no CORS — precisa ser a URL pública do frontend em produção.                                                             |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASS` | não         | —                       | Declaradas mas **não usadas hoje** — ver [Pendências conhecidas](#pendências-conhecidas).                                                |
| `SEED_DEMO_PASSWORD`                                  | não*        | `demo1234`              | Senha usada por `prisma:seed` para os 2 profissionais de exemplo. *Obrigatória se `NODE_ENV=production` — o script recusa rodar sem ela. |

**`client/.env`** (referência em `client/.env.example`):

| Variável       | Obrigatória | Default (dev)           | Descrição                                                           |
| -------------- | ----------- | ----------------------- | ------------------------------------------------------------------- |
| `VITE_API_URL` | não         | `http://localhost:3000` | URL base da API. Em produção, aponta para a URL pública do backend. |

## Testes

```bash
npm run test --workspace server
npm run test --workspace client
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

| Rota                                                   | Autenticação       | Descrição                             |
| ------------------------------------------------------ | ------------------ | ------------------------------------- |
| `GET /health`                                          | não                | Health check.                         |
| `POST /api/auth/register`                              | não                | Cria conta de profissional.           |
| `POST /api/auth/login`                                 | não                | Login, define cookie de refresh.      |
| `POST /api/auth/refresh`                               | não (usa cookie)   | Renova o access token.                |
| `POST /api/auth/logout`                                | não                | Revoga o refresh token.               |
| `GET /api/me`                                          | sim                | Dados do profissional autenticado.    |
| `GET/POST/PATCH/DELETE /api/service-types`             | sim                | CRUD de tipos de atendimento.         |
| `GET/PUT /api/service-types/:id/availability-rules`    | sim                | Regras de disponibilidade por tipo.   |
| `GET/PUT /api/availability`                            | sim                | Disponibilidade semanal geral.        |
| `GET/POST/DELETE /api/blocked-slots`                   | sim                | Bloqueios manuais de horário.         |
| `GET /api/bookings` / `PATCH /api/bookings/:id/cancel` | sim                | Agenda e cancelamento.                |
| `GET /api/public/:slug`                                | não                | Perfil público do profissional.       |
| `GET /api/public/:slug/service-types`                  | não                | Tipos de atendimento do profissional. |
| `GET /api/public/:slug/service-types/:id/slots`        | não                | Horários livres para aquele tipo.     |
| `POST /api/public/:slug/bookings`                      | não (rate-limited) | Cria agendamento.                     |

## Deploy

Instruções, não provisionamento — nenhuma infraestrutura foi de fato criada
como parte deste projeto.

**Frontend (Vercel):** conectar o repositório, definir o _root directory_
como `client/`, build command `npm run build`, output `dist/`. Como o
repositório é um monorepo com npm workspaces, habilitar em
"Root Directory" → "Include files outside of the Root Directory" para o
build ver `package-lock.json`/`node_modules` hoisted da raiz — sem isso o
install falha. Configurar `VITE_API_URL` apontando para a URL pública da
API. Headers de segurança mínimos (CSP, `X-Content-Type-Options`,
`X-Frame-Options`, `Strict-Transport-Security`) e o fallback de SPA (todo
caminho cai em `index.html`, necessário para as rotas do React Router
funcionarem em acesso direto/refresh, ex. `/joana-psicologa` ou
`/painel/agenda`) já vêm de `client/vercel.json` — nenhuma configuração
extra no painel da Vercel é necessária além do toggle acima.

**Backend (Render ou Railway):** conectar o repositório, _root directory_
`server/`, build command `npm install && npx prisma migrate deploy && npm run build`,
start command `npm start`. Provisionar um banco Postgres gerenciado na
mesma plataforma e apontar `DATABASE_URL` para ele. Definir `JWT_SECRET`
(gerado, nunca reaproveitado de dev) e `CLIENT_ORIGIN` com a URL pública do
frontend na Vercel.

Os 2 profissionais demo (`/joana-psicologa`, `/carlos-personal`) também vão
existir em produção como vitrine pública. Antes de rodar
`npm run --workspace server prisma:seed` contra o banco de produção, defina
`SEED_DEMO_PASSWORD` com uma senha gerada só para lá — **nunca** a `demo1234`
usada em dev, que está documentada neste README e daria a qualquer visitante
acesso de edição ao painel deles. Os perfis continuam públicos/agendáveis
normalmente; só o login no painel fica fechado.

## Pendências conhecidas

- **E-mail de confirmação não é enviado de verdade.** `server/src/lib/email/nodemailer.ts`
  sempre usa uma conta de teste Ethereal — as variáveis `SMTP_HOST`/`SMTP_PORT`/`SMTP_USER`/`SMTP_PASS`
  (`server/.env.example`) estão declaradas mas não são lidas. Precisa trocar o
  transporter por um `nodemailer.createTransport` real antes disso valer para
  usuários de verdade. Adiado a pedido do usuário em 2026-09-04.
