# Agendamento Multi-Nicho

SaaS de agendamento (estilo Calendly) para profissionais autônomos de
diferentes nichos (psicólogos, personal trainers, etc.), cada um com seus
próprios tipos de atendimento, disponibilidade e formulários customizados.
Clientes agendam por um link público, sem login.

## Arquitetura

- `server/` — API REST (Express + TypeScript + Prisma + PostgreSQL).
- `client/` — SPA (React + Vite + TypeScript + Tailwind).
- Autenticação: JWT de acesso (em memória no cliente) + refresh token em
  cookie httpOnly, com renovação silenciosa no carregamento do app.
- Cálculo de horários disponíveis (`server/src/modules/availability/engine.ts`):
  função pura que cruza a disponibilidade geral do profissional, as regras
  específicas por tipo de serviço (quando existem — substituem, não somam,
  a disponibilidade geral daquele dia) e os conflitos (agendamentos
  confirmados + bloqueios manuais), fatiando em slots do tamanho exato da
  duração do serviço escolhido. Tudo calculado e armazenado em UTC,
  convertido para o fuso do profissional só na exibição.
- Concorrência (`server/src/modules/bookings/bookings.service.ts`): toda
  criação de agendamento público primeiro re-valida o horário pedido contra
  essa mesma função de disponibilidade (nunca confia no horário que o
  cliente mandou) e depois insere protegido por uma constraint `EXCLUDE`
  no Postgres — se dois clientes tentarem o mesmo horário ao mesmo tempo,
  o banco garante que só um agendamento é criado.

## Rodando localmente

Pré-requisitos: Node 20+, Docker.

```bash
npm install
docker compose up -d postgres
cp server/.env.example server/.env    # edite JWT_SECRET
cp client/.env.example client/.env
npm run --workspace server db:migrate  # aplica as migrations do Prisma
npm run --workspace server db:seed     # cria os 2 profissionais de exemplo
npm run dev:server                     # http://localhost:3000
npm run dev:client                     # http://localhost:5173 (outro terminal)
```

Profissionais de exemplo (senha `demo1234` para ambos):
- `/joana-psicologa` — Psicologia
- `/carlos-personal` — Personal Trainer

## Variáveis de ambiente

**`server/.env`** (ver `server/.env.example`):
- `DATABASE_URL` — string de conexão do Postgres.
- `JWT_SECRET` — 32+ caracteres aleatórios.
- `PORT` — porta da API (padrão 3000).
- `CLIENT_ORIGIN` — origem permitida por CORS (padrão `http://localhost:5173`).

**`client/.env`** (ver `client/.env.example`):
- `VITE_API_URL` — URL base da API (padrão `http://localhost:3000`).

## Testes

```bash
npm run test --workspace server
npm run test --workspace client
```

## Deploy

Instruções, não provisionamento — nenhuma infraestrutura foi de fato criada
como parte deste projeto.

**Frontend (Vercel):** conectar o repositório, definir o *root directory*
como `client/`, build command `npm run build`, output `dist/`. Configurar
`VITE_API_URL` apontando para a URL pública da API. Headers de segurança
mínimos (CSP, `X-Content-Type-Options`, `X-Frame-Options`,
`Strict-Transport-Security`) já vêm de `client/vercel.json` — nenhuma
configuração extra no painel da Vercel é necessária.

**Backend (Render ou Railway):** conectar o repositório, *root directory*
`server/`, build command `npm install && npx prisma migrate deploy && npm run build`,
start command `npm start`. Provisionar um banco Postgres gerenciado na
mesma plataforma e apontar `DATABASE_URL` para ele. Definir `JWT_SECRET`
(gerado, nunca reaproveitado de dev) e `CLIENT_ORIGIN` com a URL pública do
frontend na Vercel.
