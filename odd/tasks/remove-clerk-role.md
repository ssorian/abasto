# Remove the clerk warehouse role

Objective: keep a single warehouse role (manager, "Encargado"); the clerk role (UI label "Mostrador", called "auxiliar" in chat) disappears from schema, policy, UI, seed, tests and docs. Branch `feat/warehouse-scoped-views` (follows 758a93b).
Test runner: `bun test` in `abasto-web` against the isolated test database (`bun run db:up`).

## Specs

- S1: Remove the role — "elimina el rol de auxiliar, hace basicamente lo mismo que el encargado". `warehouseRoles` becomes `['manager']`; no code path, label, input schema or dialog offers or accepts `clerk`. The assign-warehouse dialog defaults to manager.
- S2: Existing data — migration `0024` converts every `warehouse_assignments.role = 'clerk'` row to `'manager'` (no row lost; PK `(user_id, warehouse_id)` prevents duplicates) and replaces `warehouse_assignments_role_check` with `role in ('manager')`. Former clerks gain `warehouse.manage` on their warehouse, as the user asked ("hace basicamente lo mismo").
- S3: Seed — "Puedes modificar la seed para agregar un perfil por almacen y un perfil para el dueno?": the seed creates the owner plus exactly one manager per warehouse (Tejupilco, Arcelia, Luvianos, Amatepec); the clerks Carlos Ruiz and Diego López are removed; operations formerly done by a clerk are done by that warehouse's manager. Preserve the user's uncommitted seed edits (Caja instead of Charola, no Tarima).
- S4: Tests — fixtures no longer create clerks; tests that asserted clerk-only refusals are removed or rewritten to assert the new behavior; cross-warehouse tests keep an actor assigned to a single warehouse. A test pins that `clerk` is rejected by the assignment input.
- S5: Docs — README and PRODUCT mentions of clerks updated. `odd/tasks/*` history untouched.
- S6: Checks — `bun test` green; `bunx tsc --noEmit`, eslint and prettier clean on changed files; `bun run web:build` OK.

Decisions (parent): the `role` column is kept (single allowed value) instead of dropping it, to keep the change small. Mobile app has no role references.

## Tasks

- T1 [S1,S2,S4,S6] worker — schema, migration 0024, policy, labels, server input, assign dialog, test fixtures and clerk tests. Risk: items 1 and 2. Status: done. Commit: 004f351 (RED 2/16 in policy + staff-management; GREEN 707/710, the 3 failures are seed tests owned by T2; migration test runs the shipped SQL in a rolled-back transaction; db:migrate NOT applied: `.env.local` points at Supabase; `clerkA` renamed `staffA`, a second single-warehouse manager of A)
- T2 [S3,S5,S6] worker — seed (one manager per warehouse) and docs. Status: done. Commit: a246994 (bun test 710/710, tsc clean, eslint/prettier clean on seed+docs, build OK; includes the user's Caja/no-Tarima seed edits; README also reformatted by prettier)

## Log

- L1 (user): "Puedes modificar la seed para agregar un perfil por almacen y un perfil para el dueno?" → seed already had owner + one manager per warehouse + 2 clerks.
- L2 (user): "elimina el rol de auxiliar, hace basicamente lo mismo que el encargado"
- L3 (evidence): clerk differs from manager only by `warehouse.manage` (`access/lib/policy.ts:26-29`); UI label is "Mostrador" (`access/lib/role-labels.ts:13-14`); ~38 test files reference clerk; fixture `inventory/services/testing.ts:72-80`.
- L4 (user): "si es base de desarrollo, solo que esta en suppabase" → parent ran `bun run db:migrate` on the Supabase dev DB: before `manager 4, clerk 2`, after `manager 6` (no row lost).
