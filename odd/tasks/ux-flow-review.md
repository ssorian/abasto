# UX flow review (2026-11-12)
Flow-by-flow UX improvements from docs/qa/2026-11-12-flow-map/. Each flow is analyzed, the user decides open questions, then the decisions are implemented.
Branch: feat/ux-flow-review. Do not touch the pre-existing uncommitted inventory write-off changes.

## Specs

### Flow 1 — Login + Inicio
- S1: Inicio is reorganized "Alertas primero": a top "Requiere atención" block (closed drawers, expired lots, lots about to expire, low stock, orders that expire today), then the day's numbers. No duplicated cards (the bottom "Ventas de hoy" card duplicates the KPI; the second "Ir a mostrador") and no rows that are all zero.
- S2: Alerts get direct actions: expiring/expired lot → "Quitar existencias" for that lot; low stock → "Nuevo pedido" to the supplier, prefilled.
- S3: Expired lots still in stock are shown on Inicio as a red alert listing the lots and their pieces, so someone records the loss.
- S4: The manager role shows "Encargado" in the header, not "Personal".
- S5: Copy fixes: the date reads in long Spanish form (e.g. "jueves 12 de noviembre"), the technical timezone footer note is removed or simplified, and the breadcrumb is not shown on top-level pages.
- S6: Login shows the brand and offers a show/hide password toggle.

### Flow 2 — Catálogo
- S7: The catalog offers "Una opcion para cambiar a tarjetas y tabla": a toggle between a dense table (one row per product: small thumbnail, name, default presentation, supplier, cost per piece, sale prices of the selected warehouse, status, actions) and cards. The choice is remembered on the device. Cards no longer show the empty photo block when there is no image.
- S8: Texts repeated on every card ("Es una referencia: cada lote puede venderse más caro al darle entrada.", "El inventario se lleva en piezas.") are shown once on the page, not per product.
- S9: "Costo y precio en el alta": Nuevo producto captures the supplier cost per piece (with fixed discount and promotion) and the sale price of the default presentation for the selected warehouse, saved together with the product, so a new product never stays without price.
- S10: The manager keeps editing the supplier cost ("Mantener como está"); no change.
- S11: "Sí, archivar": a product can be archived; it disappears from the catalog, orders and the store, keeps its history and can be restored. It can be archived only without stock and without open orders.
- S12: Quick wins: a derived price is visibly derived (the input does not look like an own price; typing makes it own); the price-history icon is hidden when there is no own price history; the CSV file picker shows Spanish copy instead of the browser's "Choose File No file chosen"; section labels of the product form ("IDENTIDAD", …) are full-width headings, not a grid cell.

### Flow 3 — Entrada de proveedor (agent decisions, L7)
- S13: Inventario shows one "Nuevo pedido" entry point: the page header button. The duplicated "Nuevo pedido" buttons inside the "Por recibir" and "Entradas" tabs are removed (an empty state may keep its own call to action).
- S14: Inventario tabs show a count badge when they hold work: "Por recibir" (orders waiting) and "Saldos" (open "Por reponer" + "Por devolver" balances).
- S15: Nuevo pedido al proveedor and Recibir pedido keep their footer (total and buttons) always visible (sticky) while the body scrolls, and their intro paragraphs are shortened to one short sentence each, keeping the rules visible where they apply (e.g. near the fields).
- S16: Recibir pedido shows every column (including "Caducidad") without horizontal scrolling at 1600 px wide; "Llegó sin pedirlo" is collapsed behind a button "Agregar algo que llegó sin pedirlo" until used.
- S17: In "Por recibir", the Total column shows "a pagar" only when it differs from the total (a discount was applied).
- S18: "Saldos" empty sections are a single compact line instead of a large empty box; "Entradas" drops the redundant "Movimiento"/"Motivo" columns that repeat "Entrada por compra"/"Compra" on every row, and shows supplier order code, product, lot, quantity, who received it and date.

## Tasks
- T1 [S1, S3] Restructure Inicio: attention block first, expired lots alert, remove duplicates and zero rows — route: inline — commit: ccd54d9 ✅
- T2 [S2] Direct actions from Inicio alerts — route: inline — commit: 7c8443b ✅
- T3 [S4, S5, S6] Role label, date, footer, breadcrumb, login brand and password toggle — route: inline — commit: ccd54d9 ✅
- T4 [S7, S8, S12] Catalog table/cards toggle, single footnotes, quick wins — route: pending — commit: —
- T5 [S9] Cost and price in Nuevo producto — route: pending — commit: —
- T6 [S11] Archive and restore products (high risk: schema/data) — route: pending — commit: —
- T7 [S13-S18] Supplier orders, reception and balances UX — route: worker — commit: —

## Log
- L1 (user, verbatim): "Analiza docs/qa/2026-11-12-flow-map/ la idea es que analices todo el flujo y detectes fricciones, fallas y cosas que hagan confusa y dificil la experiencia de usuario, vas a avanzar paso a paso con el flujo uno por uno y cuando detectes si algo necesita mi decision me preguntes para aplicarla, la idea es mejorar el flujo de la UI, quitar cosas inecesarias y en general mejorar mucho la experiencia de usuario"
- L2 (user decisions, Flow 1): Orden Inicio = "Alertas primero (Recomendado)"; Acciones = "Sí, acciones directas"; Vencidos = "Sí, como alerta roja".
- L3 (evidence): ccd54d9 — overview tests + full suite 1198 pass / 0 fail; visual check owner and manager on dev DB. Slice boundary: ccd54d9 is ~740 authored lines (overview page rewrite); next slices stay under ~400.
- L4 (user decision): T2 was blocked by uncommitted pre-existing inventory work; user chose "Commiteá primero lo de inventario" → committed separately as refactor(inventory): remove the standalone supplier write-off. T2 then implemented via /inventario search params (accion=quitar|pedido, producto, lote); verified in browser (Quitar opens lot removal with "Pérdida: vencido"; Pedir opens Nuevo pedido with supplier, warehouse and product prefilled; closing clears the URL). Tests: inventory + overview 348 pass / 0 fail.
- L5 (observation for Flow 4): navigating to /inventario as owner takes ~10-15 s on the dev server.
- L6 (user decisions, Flow 2): Vista catálogo = "Una opcion para cambiar a tarjetas y tabla"; Alta producto = "Costo y precio en el alta"; Costo global = "Mantener como está"; Archivar = "Sí, archivar".
- L7 (user, verbatim): "Me voy a dormir, tiene permiso de hacer lo que mas creas recomendable y funcional, no pares hasta acabar" → from Flow 3 on, decisions are taken by the agent and logged as "Agent decision" for the user's later review. No push, PR or merge.
- L8 (agent decision, Flow 3): S13-S18 chosen from screenshots mgr-50..61, owner-21..23; no business rule changes.
