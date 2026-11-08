# Remove customer credit

Objective: the business gives no credit to customers. Remove the Cobros module and every customer balance / credit feature from `abasto-web` (code, schema, data). Supplier balances (what the business owes suppliers) stay. Branch `feat/remove-customer-credit`.
Test runner: `bun test` in `abasto-web` against an isolated `db-test` database.

## Specs

- S1: Cobros module — "Elimina el modulo de cobros": the `/cobros` route, its navigation entry, the `credit` module (abonos, statements, authorizations, charges, ledger) and its permissions are gone.
- S2: No customer balance anywhere — "y en general todo lo que tenga que ver con saldo de clientes, el negocio no da creditos": no credit payment terms at the counter/pickup (cash only), no customer balance, credit limit or credit-enabled fields in Clientes, no receivables aging report or CSV, no receivables/credit metrics in overview or cash.
- S3: Data — user choice "Migración que las elimina": a new Drizzle migration drops `credit_authorizations`, `customer_ledger`, and the customers credit columns (`credit_enabled`, `credit_limit_cents`), plus any other credit-only schema objects; seed no longer creates credit data.
- S4: Out of scope — supplier balances (`inventory/services/supplier-balance.ts`, supplier pendings) remain unchanged.

## Tasks

- T1a [S2] inline — Pickup cash only (orders/counter) and customers without credit fields (`credit_enabled`, `credit_limit_cents`, `terms_days`). Status: done (uncommitted). RED: `order-inputs.test.ts` accepted `{terms:'credito'}`; GREEN: orders/counter/cash 67/67, customers 47/47. New fixture `cash/services/testing.ts` (`setupSales`, `paymentState`) replaces the credit testing helper; `counter/server/pickup-receipt.ts` deleted (pickup.ts calls `pickupOrder`). Blank-name form message now "Escribe el nombre del cliente." (same as the service).
- T1b [S2] delegated (context backstop) — Remove reports receivables: `cartera`/aging tab, receivables-aging service, aging lib, `agingCsv`, Abonos columns/fields in cash cuts and CSV. Status: done (worker; parent deleted files the worker sandbox could not). Legacy abono rows fold into cash-cut entries (test inserts one directly).
- T1c [S1,S2,S4] delegated (context backstop) — Delete `credit` module, `/cobros` route + nav + routeTree, `credit.authorize` permission, overview/cash credit metrics, seed credit data, `db/schema.ts` re-export. Status: done (worker + parent deletions, build regenerated routeTree; tsc clean). Worker choices: `movementLabel('abono')` → 'Entrada'; seed drops the historical credit sales instead of converting them to cash.
- T2 [S3] inline + verify (high risk item 1) — `drizzle-kit generate` → `0023_drop_customer_credit.sql` (CASCADE and RLS noise removed so an unexpected dependency fails the migration instead of being dropped), own commit. Status: in progress.

## Log

- L1 (2026-11-08) Original request: "Elimina el modulo de cobros, y en general todo lo que tenga que ver con saldo de clientes, el negocio no da creditos"
- L2 (2026-11-08) Answers: data "Migración que las elimina"; branch "Rama nueva desde HEAD" → `feat/remove-customer-credit` from `2d30b64` (main after online-store merge).
- L3 (2026-11-08) Uncommitted seed edits (`seed-data.ts`, `seed.test.ts`: Charola → Caja) and `abasto-web/env` belong to the user and are not part of this feature; never stage them.
- L4 (2026-11-08) Explore map (gentle-ai-explore): credit only persisted in `customer_ledger` + `credit_authorizations` (no orders payment-terms column; no incoming FKs). `cash_movements` has `type='abono'` (CHECK, 0008) and an append-only trigger (0009) that blocks DELETE/UPDATE. `ledger_append_only()` and `append_only_no_truncate()` are shared and stay; DROP TABLE removes the ledger's own triggers. Mobile has no credit feature.
- L6 (2026-11-08) User: "merge" → choice "Terminar todo y mergear a main": finish T1/T2 with verification, then merge `feat/remove-customer-credit` into local `main` (no push).
- L5 (2026-11-08) Decisions (A): `customers.terms_days` is credit-only → dropped too. Pickup stays `{ terms: 'contado', tenderedCents }` (credito removed) to keep the input shape. Legacy `abono` cash rows are immutable history: the `abono` CHECK value stays in the DB and the schema, no code creates new ones, and they still count toward expected drawer cash without any abono/crédito label.
