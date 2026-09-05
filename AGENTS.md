# AGENTS.md — Contexto para agentes de IA (opencode)

Guia de trabalho neste monorepo. Leia antes de alterar código.

## Visão geral

Sistema de finanças pessoais multi-usuário para um casal (2 usuários por família). Monorepo npm workspaces + Turborepo:

- `apps/web` — Next.js (App Router, React 19, Tailwind v3, componentes estilo shadcn/ui, TanStack Query v5, Recharts).
- `apps/api` — NestJS (11) com DTOs `class-validator`, JWT + refresh rotativo.
- `packages/database` — Prisma ORM + schema + seed + client singleton.
- `packages/shared` — enums, tipos e helpers compartilhados (compilado via `tsc`; apps importam o `dist`).

## Pré-requisitos e setup do zero (máquina nova)

1. **Node 20.19.2** (não usar Node 16/22). Se o ambiente tiver múltiplos nvm, garanta que o node ativo na PATH seja 20.
2. Instalar deps na raiz: `npm install`.
3. Subir o Postgres local (Docker): `docker compose up -d` (porta **5433**, ver gotcha abaixo).
4. Criar os `.env` copiando os `.env.example` (nenhum `.env` é versionado):
   - `packages/database/.env` → `DATABASE_URL`
   - `apps/api/.env` → `DATABASE_URL`, `PORT=4000`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `ACCESS_TOKEN_TTL`, `REFRESH_TOKEN_TTL`, `WEB_APP_URL`
   - `apps/web/.env` → `NEXT_PUBLIC_API_URL=http://localhost:4000`
5. Sincronizar schema e popular seed (sem migrations): `npm run db:push` e `npm run db:seed` (reset total: `npm run db:reset`).
6. Rodar dev: `npm run dev:api` (porta 4000) e `npm run dev:web` (porta 3000) em terminais separados. Acessar http://localhost:3000.

Credenciais do seed: `gustavo@demo.dev` / `12345678` (USER_A) e `esposa@demo.dev` / `12345678` (USER_B). Household `DEMO-1234`.

## Scripts

- Raiz: `npm run dev`, `dev:web`, `dev:api`, `build`, `lint`, `typecheck`.
- Database (em `packages/database` ou via raiz): `npm run db:push`, `db:seed`, `db:reset`, `db:studio`.
- Validação obrigatória após alterações: `npm run lint`, `npm run typecheck`, `npm run build` (todos os 4 pacotes). Nunca entregar com erros.

## Modelo de dados / regras de negócio

- Valores monetários em **centavos inteiros** (`*Cents`). Conversão/helpers em `@finance/shared` (`money.ts`) e no web (`lib/money.ts`).
- **Visibilidade** (filtro global no header): cada Account/Transaction tem `ownerType ∈ {USER_A, USER_B, SHARED}`. O usuário tem `memberRole ∈ {USER_A, USER_B}`.
  - Filtro `SELF` = `[meu papel, SHARED]`; `PARTNER` = `[papel do cônjuge, SHARED]`; `ALL` = todos.
  - Helper `ownerTypesForVisibility` em `@finance/shared`; **toda query de listagem respeita isso**.
- Transação: tipo INCOME/EXPENSE/TRANSFER. Transferência = **uma linha** (`accountId` origem, `transferToAccountId` destino) — saldo de origem subtrai e destino soma por esse campo.
- Parcelas de cartão: gera N transações com `installmentGroupId/index/total` e datas mensais (`addMonths`). Fatura agrupa por janela de fechamento (`getBillingWindow`, vencimento = `dueDay` do mês seguinte).
- `paidById` em despesas EXPENSE identifica quem pagou (para a "divisão de custos do casal" no dashboard).
- Budgets agregam despesas da categoria **incluindo subcategorias**.

## Endpoints principais (prefixo global `/api`)

- `auth`: register (cria household como USER_A ou entra via `inviteCode` como USER_B), login, refresh (rotação), logout.
- `users/me`, `household`.
- `accounts` (CRUD + `:id/invoice`), `categories`, `transactions` (+`/tags`), `budgets`, `goals` (+`:id/contributions`).
- `dashboard`: `overview`, `categories`, `net-worth`, `couple-split`.

## Decisões-chave (não reverter sem motivo)

- **NestJS 11**, não 12: o CLI do Nest 12 exige Node ≥22 e quebra no Node 20. `@nestjs/config@^4.0.4` e `@nestjs/mapped-types@^12.0.0` são os pares corretos do Nest 11.
- **Prisma 6.19.3** (pino): Prisma 7/8 mudou o generator (ESM + driver adapters). **Sem migrations** — schema sincronizado com `prisma db push`.
- Os scripts do Prisma usam `dotenv -e .env -- prisma ...` porque o loader de `.env` do Prisma 6.19 se comportou mal neste setup.
- Porta do Postgres Docker = **5433** (a 5432 do host já é usada por um PostgreSQL nativo do Windows).
- `.env` contém só valores `KEY=value` corretos (ex.: `DATABASE_URL=...`).

## Gotchas do ambiente (Windows)

- **`prisma generate` falha com EPERM** (query engine DLL) se a API dev estiver rodando → pare a API antes de `db:push`/build que gere o client.
- **`next build` trava/se `next dev` estiver ativo** segurando `.next` → mate os processos `next dev`/`start-server.js` antes de buildar.
- Para rodar dev em background de forma estável: `Start-Process powershell -WindowStyle Hidden -Command "npm run dev:api ..."` (desanexado).
- `structuredClone is not defined` no eslint = está rodando com Node 16 (trocar para 20).
- Valores de data vêm como `"YYYY-MM-DD"` do cliente; parsear com `parseDateOnly` (fuso local), nunca `new Date(string)` (UTC desloca o dia em -03:00).

## Status do projeto

- Concluídas: **M0** scaffold/monorepo/DB · **M1** auth+household · **M2** contas e cartões+faturas · **M3** transações (categorias, parcelas, transferências, tags) · **M4** budgets e metas · **M5** dashboards e relatórios (Recharts) + `paidBy`.
- Pendente: **M6 — deploy na Vercel** (web + api serverless + Neon.tech, trocar `DATABASE_URL`). `@nestjs/platform-serverless` não existe mais no registry; decidir adaptador (ex.: `serverless-http`) ao fazer a M6.
