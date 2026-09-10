# M6 — Plano de deploy na Vercel

> Status: **planejado** (a fazer). Decisões de arquitetura registradas em 05/09/2026.

## Arquitetura alvo

Monorepo reconhecido pela Vercel (npm workspaces + Turborepo), com **2 projetos separados** apontando para a mesma raiz:

| Projeto Vercel | Root dir | Framework | Runtime |
|---|---|---|---|
| `finance-web` | `apps/web` | Next.js (auto) | Node 20.x |
| `finance-api` | `apps/api` | "Other" | Node 20.x (serverless function) |

Web chama a API direto do browser via `NEXT_PUBLIC_API_URL` (Bearer token em `localStorage`, sem cookies → CORS simples). Banco em **Neon.tech** (Postgres serverless).

## Decisões de arquitetura

1. **Adapter serverless**: Nest 11 não tem `platform-serverless`. Usar **`serverless-http`** envolvendo o app Express atual (sem reescrever controllers/services). Sem `app.listen()`; exporta-se um `handler`.
2. **Uma única function** agregando toda a API (não um arquivo por rota). Nest inicializa rápido; simplifica cold start da conexão Prisma/Neon e o build.
3. **Neon pooled** + Prisma 6 (clássico): connection string do pooler com `?sslmode=require&pgbouncer=true`. Sem migrations (mantém `db push`).
4. **Node 20.x** nos dois projetos (consistência com AGENTS; evita o CLI do Nest 12 que exige Node 22).

## Etapas

### 1. Infra (Neon)
- Criar projeto Neon; usar connection string **pooled** como `DATABASE_URL` de prod.
- Rodar `npm run db:push` contra o Neon e um seed **adaptado** (seed de demo não deve ir a prod — gated por env, se necessário).

### 2. Código da API (pré-deploy)
- Extrair configuração do app de `apps/api/src/main.ts` (`ValidationPipe`, CORS com `WEB_APP_URL`, prefixo `api`) para helper compartilhado.
- Criar `apps/api/src/serverless.ts`: `NestFactory.create` → mesmo helper → `app.init()` → `serverless(app.getHttpAdapter().getInstance())`, exportando `handler` (CJS default export).
- Criar `apps/api/vercel.json`: rota `/(.*)` para o handler compilado (`dist/serverless.js`) via builder `@vercel/node`; configurar `functions.maxDuration`.
- Schema Prisma: adicionar `binaryTargets = ["native","debian-openssl-3.0.x"]` (runtime Linux da Vercel). `prisma generate` já roda no build do Turborepo (`@finance/database`).

### 3. Variáveis de ambiente (Vercel)
- `finance-api`: `DATABASE_URL` (Neon pooled), `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `ACCESS_TOKEN_TTL`, `REFRESH_TOKEN_TTL`, `WEB_APP_URL=https://<finance-web>.vercel.app`.
- `finance-web`: `NEXT_PUBLIC_API_URL=https://<finance-api>.vercel.app`.

### 4. Projetos na Vercel
- Importar o repo; configurar Root Directory, Install Command (`npm install`), Build Command (`npm run build`), Output Directory, Node 20.x.
- **`finance-web`**: para API e web no mesmo domínio (ex.: `app.seudominio.com` + `/api`), adicionar rewrite em `next.config.ts` → elimina CORS/mixed-content, mas acopla os dois no mesmo projeto. **Recomenda-se começar em domínios separados.**

### 5. Pós-deploy / validação
- Varrer: registro/login/refresh, fluxo de parcela/fatura (datas), CORS (`WEB_APP_URL`), tempo de cold start.
- Se necessário: pool Neon com `connection_limit`, manutenção da function aquecida, ou migração futura para driver adapters.

## Gotchas previstos
- `prisma generate` com engine errada/EPERM em Linux → ajustar `binaryTargets`.
- `next build`/esbuild da Vercel não emite `design:paramtypes` (quebra DI do Nest) → handler deve entrar **compilado** (`dist` via `nest build`), nunca TS cru em `api/*`.
- Validar local antes de subir: `vercel dev` / `vercel build` na raiz de cada projeto.
