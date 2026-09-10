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

- **NestJS 11**, não 12: o CLI do Nest 12 exige Node ≥22 e quebra no Node 20. `@nestjs/config@^4.0.4` e `@nestjs/mapped-types@^2.1.1` são os pares corretos do Nest 11. **`@nestjs/mapped-types` NÃO pode subir pra v12** (ESM-only, `"type":"module"`): quebra `require()` no runtime da Vercel com `ERR_REQUIRE_ESM`. Ficar na `2.x` (CommonJS).
- **Deploy = suporte nativo "NestJS on Vercel" (zero-config)**: a Vercel detecta `apps/api/src/main.ts` (bootstrap convencional com `app.listen`) e roda a API como uma única Vercel Function (Fluid compute). **Não usar `serverless-http` nem `@nestjs/platform-serverless`** (obsoleto) — desnecessários. CLI da Vercel ≥ 48.4.0 para `vercel dev`.
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

## Deploy (M6) — como está montado

- **Banco = Neon.tech** (Postgres gerenciado; Vercel não tem banco persistente). Em produção, `DATABASE_URL` = connection string **pooled** do Neon (host com `-pooler`), usada em runtime pelo Prisma. `prisma db push`/`seed` devem rodar com a string **direct** (sem pooler) — rodar local com `$env:DATABASE_URL` apontando pro Neon antes do comando (o `dotenv` dos scripts não sobrescreve env já setada).
- **2 projetos Vercel** (web e api), cada um com `Root Directory` apontando pra pasta do app:
  - **web**: framework Next.js, root `apps/web`. Build Command: `npx turbo run build --filter=@finance/web` (builda o `@finance/shared` antes). Env: `NEXT_PUBLIC_API_URL=https://<api-project>.vercel.app` (o client do web já anexa `/api`).
  - **api**: framework NestJS (zero-config, detecta `apps/api/src/main.ts`), root `apps/api`. **Sem** Build Command. Install Command: `npm install && npx turbo run build --filter=@finance/shared --filter=@finance/database` (gera o Prisma client + `dist` dos workspaces antes do bundle da Vercel). Env: `DATABASE_URL` (pooled), `JWT_ACCESS_SECRET`, `ACCESS_TOKEN_TTL`, `REFRESH_TOKEN_TTL`, `WEB_APP_URL=https://<web-project>.vercel.app`. `PORT`/`JWT_REFRESH_SECRET` não são usados.
- **Node 20.x**: projeto Vercel exige selecionar "Node.js Version 20.x" nas Settings (raiz do repo tem `.nvmrc`). `@nestjs/mapped-types@2.1.1` é CJS e roda em qualquer Node ≥18.

## Status do projeto

- Concluídas: **M0** scaffold/monorepo/DB · **M1** auth+household · **M2** contas e cartões+faturas · **M3** transações (categorias, parcelas, transferências, tags) · **M4** budgets e metas · **M5** dashboards e relatórios (Recharts) + `paidBy`.
- Em andamento/pendente: **M6 — deploy na Vercel** (2 projetos + Neon.tech). Código já compatível (bootstrap nativo NestJS). Falta criar contas Neon/Vercel, conectar os projetos, setar envs e rodar `db:push`/`db:seed` na Neon (ver seção "Deploy (M6)" acima).
- Pendente (B): **botão "Pagar fatura"** no card do cartão, que abre o diálogo de transação já como transferência com o cartão no destino, valor = total da fatura, conta de origem e data sugeridas. A transferência com cartão como destino (A) já está implementada.
