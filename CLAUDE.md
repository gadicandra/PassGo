# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

PassGo is a community event ticketing platform (npm workspaces monorepo: `apps/backend` Express API, `apps/frontend` Next.js). Code comments, docs, and user-facing error messages are in Indonesian; follow that.

## Commands

From the repo root (`npm install` installs all workspaces):

```bash
npm run dev:backend        # tsx watch, loads apps/backend/.env, PORT default 3000
npm run dev:frontend       # next dev on :3001
npm run build:backend      # tsc -p tsconfig.build.json → dist/
npm run db:seed            # seed first ORGANIZER (SEED_ORGANIZER_* in .env)
npm run test:api           # Newman run of postman/ collection against local backend
npm run test:api:prod      # same against https://pass-go-lime.vercel.app — writes real prod data
```

Backend (`cd apps/backend`):

```bash
npm test                   # node:test via tsx, all tests/**/*.test.ts
npm run typecheck
npx tsx --test --env-file-if-exists=.env tests/unit/orders.test.ts   # single file
npx tsx --test --test-name-pattern="orderView" --env-file-if-exists=.env "tests/**/*.test.ts"
```

Tests use `node:test` + `node:assert/strict` + `supertest` against the exported `app` (no listen, no DB for unit tests). `tests/integration/*-atlas.test.ts` are skipped unless `MONGODB_URI` is set — and since `.env` is auto-loaded, they **will** hit the configured database if it is.

Frontend (`cd apps/frontend`): `npm run lint`, `npm run typecheck`. See `apps/frontend/AGENTS.md`: this Next.js version (16.x) differs from training data — read `node_modules/next/dist/docs/` before writing Next code. `next dev` rewrites that AGENTS.md block; committing it keeps the tree clean.

## Source of truth

- `docs/api-contract.md` — REST contract v1 (error format §3, pagination §4, idempotency §5, concurrency §6, rate limits §7, endpoints §9, error codes §12). Code comments cite it as `kontrak §N`; keep code and contract in sync.
- `docs/architecture.md` — roles/authorization matrix, data model, order/payment/check-in flows, email outbox, ADRs.
- `postman/README.md` — collection folders must run in order (each fills variables for the next).

## Backend architecture

- **Two entrypoints, one app.** `src/app.ts` builds the Express app (exported for tests). `src/index.ts` is the long-running dev/start server. `server.ts` at the backend root is the **Vercel** entrypoint: lazily connects Mongo per function instance and returns 503 problem+json if the DB is down (health endpoint bypasses this). Changes to startup must work in both.
- **Layering in practice:** routes in `src/routes/` define Zod schemas inline and call services directly (`controllers/`, `validators/`, `jobs/`, `config/` are empty placeholders). Business logic and transactions live in `src/services/`; Mongoose models in `src/models/` (registered via `initModels()`).
- **IDs:** UUIDv7 strings in an `id` field (`models/base.ts` `idField`), not `_id`. `versionKey` is off; models carry their own `version` number for optimistic concurrency.
- **Errors:** throw `AppError(status, code, detail)` (`utils/app-error.ts`); `middlewares/error-handler.ts` renders RFC 9457 `application/problem+json` with `code`.
- **Authorization:** `authenticate` + `authorize(...roles)` at route level; role is read from DB per request (not from JWT), `tokenVersion` revokes tokens. Resource-level checks (STAFF only for assigned events via `EventStaff`, ATTENDEE only own orders/tickets) are in services and answer **404, not 403**.
- **Concurrency:** writes require `If-Match: "<version>"` (`utils/if-match.ts`: missing → 428, mismatch → 412). App ETags are disabled. Vercel's edge rejects any `If-Match` with 412, so clients send `X-If-Match` in prod; `middlewares/request-context.ts` aliases it. Don't reintroduce ETag responses on these routes.
- **Quota/check-in atomicity:** ticket quota is reserved with conditional atomic updates (`soldCount + reservedCount + qty <= quota`) inside Mongo transactions (`session.withTransaction`) — MongoDB must be a replica set (Atlas is). Check-in is atomic so double scans fail.
- **Idempotency:** `POST /orders` (and similar) wrap handlers in `runIdempotent` (`services/idempotency-service.ts`) keyed by `Idempotency-Key`.
- **Payments:** Midtrans Snap; webhook at `/api/v1/payments/midtrans/notifications` (needs a tunnel locally). Paid orders issue tickets via `ticket-issuance-service`.
- **Background jobs:** no in-process scheduler. `/api/v1/internal/jobs/:job` (`send-emails` outbox, `expire-pending-orders`) is guarded by `Authorization: Bearer $CRON_SECRET` and triggered by Vercel Cron (`vercel.json`). Emails go through an outbox, not sent inline.
- **Storage:** posters re-encoded to WebP with sharp, stored in Supabase Storage; without Supabase creds they fall back to local `uploads/` served at `/uploads`.
- **Vercel compile quirk:** Vercel compiles files individually, so `src/types/*.d.ts` shims are referenced explicitly where needed.

## Frontend

Next.js App Router + Tailwind v4 (via `@tailwindcss/turbopack`). Design tokens are defined in `src/app/globals.css` `@theme` (`bg-navy`, `text-brand`, …) — use them instead of raw colors. `next.config.ts` rewrites `/api/v1/*` and `/uploads/*` to `BACKEND_URL` so the browser sees one origin; this is required because the refresh-token cookie is `SameSite=Strict`. API types live in `src/types/api.ts`; `/dev/komponen` is a component showcase page.
