# Finance App — Finanças do Casal

Sistema de gestão de finanças pessoais para um casal: contas e cartões, transações (com parcelas, transferências e tags), orçamentos, metas de economia e dashboards com relatórios. Duas pessoas por família, com itens **pessoais** (`USER_A`/`USER_B`) ou **compartilhados** (`SHARED`) e filtro global de visibilidade.

## Stack

- **Monorepo** npm workspaces + Turborepo
- `apps/web` — Next.js (App Router, React 19, Tailwind v3, shadcn/ui, TanStack Query, Recharts)
- `apps/api` — NestJS 11 (class-validator, JWT + refresh rotativo)
- `packages/database` — Prisma ORM + PostgreSQL (sem migrations, `prisma db push`)
- `packages/shared` — enums, tipos e helpers compartilhados

## Setup local (primeira vez)

Pré-requisito: **Node 20.19.2** e Docker Desktop.

```bash
npm install
docker compose up -d          # Postgres na porta 5433
```

Crie os arquivos `.env` copiando os `.env.example` (veja `AGENTS.md` para a lista):
`packages/database/.env`, `apps/api/.env`, `apps/web/.env`.

Sincronize o banco e popular o seed:

```bash
npm run db:push
npm run db:seed
```

## Rodar em desenvolvimento

Em dois terminais:

```bash
npm run dev:api    # http://localhost:4000/api
npm run dev:web    # http://localhost:3000
```

Usuários demo: `gustavo@demo.dev` / `12345678` e `esposa@demo.dev` / `12345678` (household `DEMO-1234`).

## Validação

```bash
npm run lint
npm run typecheck
npm run build
```

> No Windows: pare os processos `next dev` e a API antes de rodar `db:push`/`build` (EPERM do Prisma e lock do `.next`). Detalhes em `AGENTS.md`.

## Roadmap

- **M0–M5** concluídas: scaffold · auth/household · contas e cartões+faturas · transações · budgets/metas · dashboards.
- **M6** pendente: deploy na Vercel (web + api serverless + Neon.tech).
