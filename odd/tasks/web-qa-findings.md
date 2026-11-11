# Fix the 2026-11-10 web QA findings

Objective: fix every Bug (B1–B12) and Confusing (C1–C15) finding of `docs/qa/2026-11-10-web-exploratory-qa.md` in `abasto-web`, and probe the untested permission bypass. Improvements M1–M7 are out of scope. Branch `fix/web-qa-findings` (from `main` 9debbcc).
Test runner: `bun test` in `abasto-web` against the isolated test database (`bun run db:up`). Workers load the `code-organization` skill first (AGENTS.md).

## Specs

- S1: Scope — "Corrige todo, si tienes dudas preguntame"; user chose "Bugs + confusos": B1–B12 and C1–C15 plus probing the permission bypass; M1–M7 stay for another batch.
- S2: B1 — "Submitting a count with an empty quantity records 0 and wipes the stock. No confirmation." An empty "Cantidad contada" must not submit and must not show a difference; a count is only registered with an explicit number (0 included). The stock row stays unchanged on rejection.
- S3: B2 — "Already-expired stock is accepted as good inventory without warning." User decision: "Advertir y confirmar" — reception with an expiry date already past shows a warning and requires an explicit confirmation before it is accepted.
- S4: B3 — "Cash cuts are dated in UTC. Cuts closed on 10 Nov at 22:27 local appear as \"11 nov\"." Every report date is shown and grouped in the business time zone.
- S5: B4/B5 — slow SSR and lost clicks during hydration; remove the concurrent `client.query()` use ("Calling client.query() when the client is already executing a query") and serialized/N+1 loader queries; measure before and after. Interactive controls must not silently drop clicks before hydration.
- S6: B6 — every mutation shows success feedback (toast) and closes its dialog: "edit product, save prices, save presentations, save supplier, new warehouse, remove warehouse from user, close cash, open cash, assign delivery", with pending state while saving.
- S7: B7 — lists refresh right after a mutation: assign warehouse, receive/cancel transfer, cash entry totals ("ENTRADAS $0.00" right after "Entrada registrada."), supplier balance history, "Nuevo reparto".
- S8: B8 — no silent form failures: "Product with empty name, presentation factor 0, empty supplier, warehouse name of only spaces, transfer of 99 999 boxes" each show a Spanish error message.
- S9: B9 — empty "Nuevo usuario" reports every missing field (name, email, password), not only "Escribe un correo válido."
- S10: B10 — no English browser-native validation messages; Spanish messages replace "Please lengthen this text…", "Please include an '@'…", "Value must be less than or equal to 100.", "Value must be greater than or equal to 1."
- S11: B11 — a discount of 150 % says specifically that the discount must be between 0 and 100 %, not "Revisa las condiciones comerciales."
- S12: B12 — reception with missing+damaged above the ordered boxes disables confirm and the summary never contradicts the error ("No entra ninguna caja · 10 faltantes nuevos" for an order of 5).
- S13: C1 — consistent units: piece-based products are not called "cajas"; counter availability uses the same unit as the requested quantity; transfers name the real unit, not "unidades"; correct plural ("1 pieza", "1 unidad").
- S14: C2 — a product whose only stock is expired shows "Vencido" (not "Sin existencias"); Inventory and Reports agree on the low-stock count.
- S15: C3 — user decision: one single action "Quitar existencias" that asks for the reason (pérdida: vencido / dañado, or otro motivo); no second duplicate path.
- S16: C4 — "Editar producto" has one save action.
- S17: C5 — user decision: remove the role selector; new users are Encargado and the users table shows "Encargado" (not "Personal").
- S18: C6 — user decision: the CSV import saves `precio_venta` and `stock_minimo`; the dialog stops saying they are not saved.
- S19: C7 — user decision: Reports sales include liquidated delivery (reparto) sales, labeled by channel, matching the cash box.
- S20: C8 — user decision: keep renaming as is; the rider edit form warns that the name changes on past deliveries too.
- S21: C9 — a transfer row says who sent it and from which warehouse.
- S22: C10 — the store bottom bar and the sheet show the same (customer) price for the same cart.
- S23: C11 — user decision: a warehouse is offered as pickup only when it has at least one product with stock and price.
- S24: C12 — a broken or unreachable image URL is rejected (or falls back to a placeholder) and never shown broken in the store.
- S25: C13 — no "-$0.00": zero amounts show "$0.00".
- S26: C14 — a manager opening `/configuracion` is redirected like `/almacenes`.
- S27: C15 — the counter says "Abre la caja antes de cobrar." before the user starts a sale (or disables charging), not only after "Entregar".
- S28: Permission probe — calling owner-only server functions directly as a manager or store customer is refused; any hole found is fixed with a test.
- S29: Checks — `bun test` green; tsc, eslint, prettier clean on changed files; `bun run build` OK.

## Tasks

- T0 [S1-S28] explore — map owners and shared patterns. Status: done (see L5).
- T1 (U0) [S5, S6-S8, S10] worker, first — shared plumbing: move `modules/cash/hooks/use-action-runner.ts` to `src/hooks/` (success toast + pending + close), Spanish native validation in `src/components/ui/{input,textarea,select}.tsx`, `src/lib/boundary.ts` messages, sequence the concurrent `tx` selects in `inventory/services/stock-reads.ts:59-61`. Risk: item 4 (concurrency). Status: pending. Commit: —
- T2 (U1 inventory) [S2, S3, S7, S8, S12, S13, S14, S15] worker. Risk: item 1 (stock writes). Status: pending. Commit: —
- T3 (U2 reports/cash/counter) [S4, S5, S7, S14, S19, S25, S27] worker. Risk: item 6 (report sums). Status: pending. Commit: —
- T4 (U3 catalog/pricing/customers/store/import) [S6, S8, S11, S16, S18, S22, S23, S24] worker. Risk: item 1 (CSV import writes). Status: pending. Commit: —
- T5 (U4 access/riders/transfers/warehouses/routes) [S6-S9, S13, S17, S20, S21, S26, S28] worker. Risk: item 2 (permissions). Status: pending. Commit: —
- T6 [S1-S29] verify — independent verification of high-risk items (S2, S3, S19, S28) and full checks. Status: pending.

## Log

- L1 (user): "Revisa el reporte de fallas de docs" → then "Corrige todo, si tienes dudas preguntame"
- L2 (user decisions): scope "Bugs + confusos (Recomendado)"; B2 "Advertir y confirmar"; C7 "Incluirlas en Reportes (Recomendado)"; C8 "Dejarlo como está (Recomendado)"; C3 "(custom) Quitar existencias y aclarar si es por perdida u otro motivo"; C6 "Guardarlos (Recomendado)"; C11 "Ocultarlo hasta tener stock con precio (Recomendado)"; C5 "Sacar el selector (Recomendado)".
- L3 (parent decisions): C4 single save button; C10 show customer price in both; C14 redirect; C12 validate URL with placeholder fallback.
- L5 (evidence, explore): B1 `inventory/lib/stock-drafts.ts:72` + `count-dialog.tsx:59` use `toBaseUnits(…, {allowZero:true})`; B2 `inventory/services/supplier-reception.ts:97,121` only check ISO format; C7 `reports/services/sales-report.ts:72` `o.status = 'Recogido'` excludes rider settlements (`riders/services/assignments.ts:447`); B4 warning `inventory/services/stock-reads.ts:59-61` Promise.all over one `tx`; C14 `routes/configuracion.tsx:10` vs `routes/almacenes.tsx:10`; C2 `inventory/lib/stock-metrics.ts:71`; B3 not confirmed (cash-cuts-card.tsx:144 businessDate of openedAt — check close time vs open time); S28 statically all guarded, runtime probe pending.
- L4 (evidence, parent): `modules/reports/lib/manager-format.ts:6,10,14` format dates with `timeZone: 'UTC'` while line 32 uses `businessTimeZone`; range filters in `report-scope.ts:66-71` already use the business zone.
