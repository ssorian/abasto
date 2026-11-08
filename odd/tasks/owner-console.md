# Owner console — Stage 1: profitability

Objective: an owner-only console (`/direccion`) focused on profitability across the whole business, reusing the existing report services instead of duplicating queries. Branch `feat/executive-console`.
Test runner: `bun test` in `abasto-web` against the isolated test database (`bun run db:up`).

## Specs

- S1: Owner-only view — "yo quiero una vista exclusiva para el dueno, en el que pueda ver reportes de todo tipo". New route `/direccion` ("Dirección") visible in the sidebar only to the owner; every server function behind it refuses non-owner actors on the server (not only in the UI) with the existing forbidden error ("No tienes permiso para esta acción.").
- S2: Profitability first — "Lo mas importante es rentabilidad pero no quiere decir que descuides el resto". Gross margin (revenue, cost, margin, margin %) for a period, grouped by product, by supplier and by warehouse, over all warehouses.
- S3: Warehouse ranking vs previous period — warehouses side by side (revenue, margin, margin %, tickets, average ticket) with the change against the previous period of the same length immediately before.
- S4: Inventory value at cost per warehouse — sum over lots with stock of `on_hand × received_cost_cents / received_quantity`.
- S5: Capital tied up in non-moving products — per warehouse and product, on-hand stock with no sale in the last N days (30 by default; 30/60/90 selectable), valued at cost, sorted by value.
- S6: No duplicated numbers — revenue and COGS come from the same source as the sales report (`order_lines.line_total_cents`, COGS from `order_allocations` × lot unit cost); period and warehouse scope reuse `reports/lib/period.ts` and `reports/services/report-scope.ts`.
- S7: Checks — rules covered by `bun test` through the public service interface; `bun run web:lint`, `bun run web:check`, `bun run web:build` stay green.

Decisions (parent): supplier margin uses the product's supplier (`products.supplier_id`), same as the sales report filter. COGS stays derived from the lot (lot cost is only written at insert: `purchases.ts:171`, `reception-lots.ts:71`, `transfer-receive.ts:103`), so no cost snapshot migration. UI copy stays Spanish, matching the existing app.

Verification (independent verifier, Risk: item 2 security): S1-S6 pass, S7 partial (focused 63/63; lint/build relied on parent run). Follow-up fixed in fddaab9: owner check before the window validation, shared `requireOwner`, refusal tests for manager, clerk and customer on all four entry points (RED observed: invalid instead of forbidden; GREEN 66/66 focused). Open: native RDD review not run (assess failed: untracked user files need a declaration); not checked in a browser.

Next stages (not in this document): 2 warehouses + managers, 3 control and risk, 4 business rules.

## Tasks

- T1 [S2,S3,S6,S7] worker — `modules/executive` profitability services: margin by product/supplier/warehouse, warehouse ranking with previous period. Status: done. Commit: c82a926 (RED: missing module; GREEN 11 new tests, full suite 718/718; `pickedUpLines` exported from sales-report, `requireOwner` added to report-scope; margin in basis points, null when revenue is 0)
- T2 [S4,S5,S7] worker — `modules/executive` inventory services: value at cost per warehouse, non-moving capital. Status: done. Commit: 76ab638 (11 tests; full suite 711/711; tests written with the implementation, no observed RED against a missing implementation; a sale is a picked-up order line by `closed_at`, same as the sales report; exactly N days ago counts as moving)
- T3 [S1,S7] worker — owner guard on server functions, `/direccion` route, owner-only nav item, page UI (period selector, ranking, margin tables, inventory). Status: done. Commit: cd3bcf3 (RED: missing lib modules; GREEN 9 lib tests; parent re-run: tsc clean, eslint 0 errors (2 pre-existing no-shadow warnings in components/ui/sidebar.tsx), prettier clean, bun test 724/724; build OK per worker; not checked in a browser; non-moving days in `?sinventa=`)

## Log

- L1 (user request): "La vista actual cubre las necesidades de un administrador de un almacen, catalogo, entradas y salidas de producto al igual que reportes del almacen, eso esta bien pero yo quiero una vista exclusiva para el dueno, en el que pueda ver reportes de todo tipo, crear almacenes y asignar encargado, y demas cosas mas interesantes que hacer ingreso y venta ya que eso ya lo hace el administrador. Que me propones?"
- L2 (user): "Lo mas importante es rentabilidad pero no quiere decir que descuides el resto"
- L3 (user): "Implementa" → accepted Stage 1 (owner console + profitability).
- L4 (evidence): explore found COGS is derived at report time in `reports/services/sales-report.ts` `pickedUpLines()`; lot cost is never updated after insert.
- L5 (incident): another session switched the shared worktree to `feat/store-ui-redesign`; 76ab638 landed there and was merged to main with the store redesign. User: "Ya se hizo merge, continua". Branch fast-forwarded to main (4fca6ef).
- L6 (user, new question after Stage 1): "Ahora, cada almacen esta aislado para ver solo su operacion y que su operacion sea exclusiva? Deberias quitar filtros por almacen, que la entrada de producto solo llegue el almacen que pide."
