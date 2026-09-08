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
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASS` | não         | —                       | Se as 4 estiverem setadas, e-mail de confirmação sai por SMTP real; senão cai numa conta de teste Ethereal (dev).                        |
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

**Pendência conhecida (não bloqueia, só aviso no run):** `actions/checkout@v4`
e `actions/setup-node@v4` ainda miram Node 20, que o GitHub Actions já
descontinuou nos runners — hoje são forçados a rodar em Node 24 por trás,
sem quebrar nada, mas o aviso aparece em toda run. Bumpar as duas para `@v5`
quando der.

## Visão geral da API

Todas as rotas abaixo, exceto `/health`, `/api/auth/*` e `/api/public/*`,
exigem o access token (`Authorization: Bearer <token>`) e são
automaticamente restritas ao profissional dono do token.

| Rota                                                   | Autenticação       | Descrição                                                                             |
| ------------------------------------------------------ | ------------------ | ------------------------------------------------------------------------------------- |
| `GET /health`                                          | não                | Health check.                                                                         |
| `POST /api/auth/register`                              | não                | Cria conta de profissional.                                                           |
| `POST /api/auth/login`                                 | não                | Login, define cookie de refresh.                                                      |
| `POST /api/auth/refresh`                               | não (usa cookie)   | Renova o access token.                                                                |
| `POST /api/auth/logout`                                | não                | Revoga o refresh token.                                                               |
| `GET /api/me`                                          | sim                | Dados do profissional autenticado.                                                    |
| `GET/POST/PATCH/DELETE /api/service-types`             | sim                | CRUD de tipos de atendimento.                                                         |
| `GET/PUT /api/service-types/:id/availability-rules`    | sim                | Regras de disponibilidade por tipo.                                                   |
| `GET/PUT /api/availability`                            | sim                | Disponibilidade semanal geral.                                                        |
| `GET/POST/DELETE /api/blocked-slots`                   | sim                | Bloqueios manuais de horário.                                                         |
| `GET /api/bookings` / `PATCH /api/bookings/:id/cancel` | sim                | Agenda (paginada: `cursor`/`limit`, resposta `{ items, nextCursor }`) e cancelamento. |
| `GET /api/public/:slug`                                | não                | Perfil público do profissional (`Cache-Control: public, max-age=30`).                 |
| `GET /api/public/:slug/service-types`                  | não                | Tipos de atendimento do profissional (`Cache-Control: public, max-age=30`).           |
| `GET /api/public/:slug/service-types/:id/slots`        | não                | Horários livres para aquele tipo (nunca cacheado — muda a cada agendamento).          |
| `POST /api/public/:slug/bookings`                      | não (rate-limited) | Cria agendamento.                                                                     |
| `GET /api/public/sitemap-slugs`                        | não                | Slugs + `updatedAt` de todos os profissionais, para o `sitemap.xml` dinâmico.         |

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

Também definir `API_URL` (mesma URL pública da API, mas como variável de
ambiente do projeto Vercel — não confundir com `VITE_API_URL`, que é
embutida no bundle do cliente no build). `API_URL` é lida em runtime por
`client/middleware.ts` (Vercel Routing Middleware), que detecta bots de
busca/redes sociais em `/:slug` e devolve HTML com título, meta description
e Open Graph corretos — sem essa variável, o middleware deixa a rota seguir
para o SPA normal (visitante humano não é afetado; só o crawler perde o
HTML pré-renderizado). O mesmo `client/middleware.ts` também gera
`/sitemap.xml` dinamicamente (uma URL por profissional, buscando a lista em
`GET /api/public/sitemap-slugs`) e `client/public/robots.txt` é estático,
liberando `/` e bloqueando `/login`, `/registro` e `/painel` (sem valor de
indexação). O `robots.txt` ainda não referencia o sitemap — falta decidir o
domínio final de produção; adicione `Sitemap: https://<seu-domínio>/sitemap.xml`
nele quando tiver.

**Backend (Render ou Railway):** conectar o repositório, _root directory_
`server/`, build command `npm install && npx prisma migrate deploy && npm run build`,
start command `npm start`. Provisionar um banco Postgres gerenciado na
mesma plataforma e apontar `DATABASE_URL` para ele. Definir `JWT_SECRET`
(gerado, nunca reaproveitado de dev) e `CLIENT_ORIGIN` com a URL pública do
frontend na Vercel. Definir também `SMTP_HOST`/`SMTP_PORT`/`SMTP_USER`/`SMTP_PASS`
com as credenciais do provedor de e-mail — sem elas o e-mail de confirmação
de agendamento não sai de verdade (cai numa conta de teste Ethereal).

Os 2 profissionais demo (`/joana-psicologa`, `/carlos-personal`) também vão
existir em produção como vitrine pública. Antes de rodar
`npm run --workspace server prisma:seed` contra o banco de produção, defina
`SEED_DEMO_PASSWORD` com uma senha gerada só para lá — **nunca** a `demo1234`
usada em dev, que está documentada neste README e daria a qualquer visitante
acesso de edição ao painel deles. Os perfis continuam públicos/agendáveis
normalmente; só o login no painel fica fechado.

### Checklist pós-deploy

Itens que só dá para fechar depois que as duas plataformas estiverem no ar:

- [ ] **SMTP real:** definir `SMTP_HOST`/`SMTP_PORT`/`SMTP_USER`/`SMTP_PASS`
      no backend com um provedor de e-mail de verdade — sem isso a
      confirmação de agendamento continua caindo numa conta de teste
      Ethereal (nenhum e-mail real sai).
- [ ] **`CLIENT_ORIGIN` e `API_URL` cruzados:** depois do primeiro deploy de
      cada lado, apontar um pro outro — `CLIENT_ORIGIN` no backend (Render)
      para a URL pública da Vercel, e `API_URL` no projeto Vercel para a URL
      pública do backend.
- [ ] **`robots.txt`:** adicionar `Sitemap: https://<seu-domínio>/sitemap.xml`
      em `client/public/robots.txt` assim que o domínio final de produção
      estiver definido.
- [ ] **`trust proxy` (`server/src/app.ts`):** o app assume exatamente 1 hop
      de proxy reverso na frente (`app.set('trust proxy', 1)`), com base no
      comportamento documentado do Render/Railway. Depois de escolher e
      configurar a plataforma de fato, confirmar quantos hops existem de
      verdade entre o cliente e o processo Node (pode mudar se um CDN/WAF for
      adicionado depois) — se o número real for diferente de 1, ajustar o
      valor. Um valor errado permite spoofar `X-Forwarded-For` (contorna o
      rate limit por IP em login/registro/criação de agendamento) ou agrupa
      todos os visitantes reais num único IP (bloqueio coletivo). Achado do
      `/code-review` de 2026-09-05, adiado por não haver infraestrutura
      provisionada ainda para confirmar a topologia real.
