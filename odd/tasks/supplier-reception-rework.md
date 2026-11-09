# Supplier reception rework: exceptions only, missing vs damaged, replacements and discounts

Objective: receiving an order captures only exceptions (missing, damaged); the lot is assigned automatically; missing boxes (to replenish) and damaged boxes (to return) become separate supplier balances; earlier missing boxes can be marked received in the reception dialog; a new order can discount missing boxes from its payment. Supersedes supplier-orders S5/S6 reception and pendings behaviour. Branch `feat/supplier-reception-rework` (stacked on `feat/catalog-pricing-ui`).
Test runner: `bun test` in `abasto-web` against the isolated test database (`bun run db:up`).

## Specs

- S1: Exception inputs only — "me parece estupido tener dos inputs, uno para lo que llego bien y otro para lo que llego mal". Per reception line: inputs Faltantes and Dañadas / caducadas (whole boxes, default 0) and Caducidad; Buenas is derived = pedidas − faltantes − dañadas, never negative (reject when faltantes + dañadas > pedidas). All zero = everything arrived well. The "Buenas" input disappears.
- S2: Automatic lot — "quita el input de lote, se supone que se asigna solo ya que el pedido pertenece a un solo lote". No lot input; every lot created by the reception gets the order's folio/reference as lot code (a stable order folio when there is no reference, e.g. the order number; parent decides the format and documents it).
- S3: Missing vs damaged — "replanteemos el caso de uso, separa danadas de faltantes". Missing boxes (never arrived) become a "Por reponer" balance: the supplier owes the boxes. Damaged/expired boxes (arrived, not sellable) become a "Por devolver" balance: they never enter sellable stock and are closed when the supplier takes them back (settled by replacement or by a discount, recorded with its amount). The Saldos view shows the two sections separately. Existing pendings are migrated: those recorded as damaged → Por devolver, missing → Por reponer; nothing lost (ledger history kept).
- S4: Replacement at reception — "aqui mismo en el dialog de recibimiento es posible ver la lista de los faltantes previos de otros pedidos y registrar si llegaron y marcar como 'recibido' y asi entra al inventario." The reception dialog lists the supplier's open Por reponer balances from other orders (product, origin folio, boxes owed) with an input "Llegaron [n]" and a "Recibido" action; received boxes enter stock as a lot at the original cost per box and reduce the balance; a partial arrival leaves the rest open. They are confirmed together with the reception.
- S5: Discount on a new order — "al hacer un pedido tambien deberia aparecer un listado de faltantes y un boton de 'Descontar'"; user choice "Restar del pago": the new order dialog lists the supplier's open Por reponer balances, each with "Descontar"; a discounted balance is closed "a lo chino" (its value at original cost no longer paid, boxes no longer expected) and its amount is recorded on the new order. The order shows "Total neto − descuentos por faltantes = A pagar". Discounts are applied when the order is registered; cancelling that order reopens them (parent assumption, documented).
- S6: Checks — rules covered by `bun test` through the public service interface (exact error messages; rejected input leaves stored data and balances unchanged); migration test for existing pendings; `bunx eslint src`, prettier on touched files, `bunx tsc --noEmit`, `bun run build` green; Playwright check on the user's dev server :3000 (never another server), restoring any data it changes when possible.

## Tasks

- T1 [S1-S6 server] worker — Schema/migration, services and server functions: reception input (missing, damaged, expiry), automatic lot code, split balances, replacement reception, order discounts with cancel reopen. Status: done. Commit: ef8296c (worker stalled twice on network/timeout; parent finished: fixed orders/supplier-lots.test.ts to the new input; migration test 5/5; full suite 929/929 after restarting the stopped docker DBs; UI tsc errors left to T2).
- T2 [S1-S5 UI, S6] worker — Reception dialog, Saldos sections, new order discount list and totals. Status: pending.
- T3 [S6] verify + parent Playwright. Status: pending.

## Log

- L1 (user, screenshot of "Recibir pedido"): "Aqui cuando recibimos el pedido me parece estupido tener dos inputs, uno para lo que llego bien y otro para lo que llego mal, deberia ser solo uno para lo que llego mal, y quita el input de lote, se supone que se asigna solo ya que el pedido pertenece a un solo lote. Y replanteemos el caso de uso, separa danadas de faltantes."
- L2 (parent proposal): two exception inputs (Faltantes, Dañadas/caducadas), Buenas derived, lot = order folio, Faltantes → Por reponer (settle by replacement or "a lo chino"), Dañadas → Por devolver (outside sellable stock, settled when the supplier takes them back).
- L3 (user): "Tambien replantear un poco la reposicion, aqui mismo en el dialog de recibimiento es posible ver la lista de los faltantes previos de otros pedidos y registrar si llegaron y marcar como \"recibido\" y asi entra al inventario. Y al hacer un pedido tambien deberia aparecer un listado de faltantes y un boton de \"Descontar\""
- L4 (user choice): "Restar del pago" — Descontar subtracts the missing value from this order's payment, closes the balance, boxes no longer expected.
- L5 (parent, accepted): consolidated design; parent assumption that L3 confirmed the two inputs and damaged as return.
- L6 (user): "Implementalo asi"
- L7 (user): "que si sea en supabase, ahi esta la db dev" → migration 0027 is applied to the Supabase dev DB (.env.local) once tests pass; worker reports before/after counts.
- L8 (parent, migration 0027 on Supabase dev DB): before 27 migrations, pendings: damaged 1 row, 24 pieces, 34200 cents; after 28 migrations, identical (damaged 1 / 24 / 34200); purchases 13 with folio 13, discount_cents total 0. Nothing lost, no balance status changed.
