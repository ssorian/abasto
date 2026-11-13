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

### Flow 4 — Mantenimiento de stock (agent decisions, L7)
- S19: The product pickers of "Conteo físico", "Mínimo de existencias" and "Nuevo traslado" are searchable (type to filter by name or SKU) instead of a plain select listing every product.
- S20: The Productos toolbar drops "Fijar un mínimo" (each row already has "Mínimo"); its dialog opens from the row with the product fixed.
- S21: "Quitar existencias" with reason "Pérdida: vencido" on a lot that is already expired prefills the quantity with all the lot's available units (editable).
- S22: In the Productos tab, the "Caducidad" cell marks an expired earliest lot with a red "Vencido" badge and one expiring within 7 days with an amber badge, like the lots dialog.
- S23: /inventario loads independent data in parallel (no data or rule changes); report load time before and after on the dev server.

### Flow 5 — Mostrador (agent decisions, L7)
- S24: After "Reservar pedido" succeeds, the new order's detail opens right away, so the counter can "Preparar" or "Entregar (recoge el cliente)" without searching the list.
- S25: The order list opens on a "Por atender" filter (Reservado + Preparado) instead of "Todos"; each status chip shows its count.
- S26: In "Cobrar", quick amount buttons fill "Efectivo recibido": "Exacto" (the total) and the next round amounts above it (e.g. $550, $600, $1,000 for $524.00); Enter submits when the amount covers the total.
- S27: "Sí, cancelar pedido" looks destructive (red) and "No, volver" is the neutral option.
- S28: In the order detail, "Precio de lista" and "Condición aplicada" columns are shown only when some line has a customer rule (otherwise they repeat "Precio final" and "Precio de lista").
- S29: The customer field of "Nuevo pedido" is searchable (type to filter by name) instead of a plain select.

### Flow 6 — Caja (agent decisions, L7)
- S30: After "Cerrar caja" succeeds, a result view shows what the close dialog promises ("Al cerrar verás lo que esperaba el sistema y la diferencia"): Esperado, Contado and Diferencia ("Cuadra", "Sobran $X" or "Faltan $X") plus the note, with "Listo"; not only the toast "Caja cerrada.".
- S31: In the open-drawer panel, "Cerrar caja" is a secondary (outline) button, not the primary red one; "Abrir caja" stays primary when the drawer is closed.
- S32: "Retiro de efectivo" shows the cash available in the drawer (the limit the rule enforces) under the amount field.
- S33: "Abrir caja" shows the last close's counted cash as a hint (e.g. "El último cierre contó $1,000.00"), without prefilling.
- S34: In "Historial de caja", a shortage ("Faltan") reads in red and a surplus ("Sobran") in green; an exact close reads "Cuadra".

### Flow 7 — Repartos (agent decisions, L7)
- S35: When "Nuevo reparto" cannot be used (e.g. every active rider is already en ruta or there are none), the page says why next to the disabled button instead of only fading it.
- S36: "Liquidar" needs an open drawer: when the drawer of the warehouse is closed, the settle dialog says so up front ("Abre la caja en Mostrador para liquidar") with a link to Mostrador and the submit button disabled, instead of failing after submitting.
- S37: In "Liquidar reparto", an "Exacto" button fills "Dinero entregado" with the expected amount.
- S38: The product field of "Nuevo reparto" is the searchable product picker (type name or SKU), like the inventory dialogs.

### Flow 8 — Clientes y acceso a tienda (agent decisions, L7)
- S39: The customer list shows status as a badge ("Activo"/"Inactivo") and a "Tienda" column telling whether the customer has store access; inactive customers sort after active ones.
- S40: "Dar acceso a la tienda" validates with the app's own Spanish messages (no native browser tooltip "Completa este campo."), offers "Generar contraseña" and a show/hide toggle, and after granting access shows the email and password once with "Copiar datos de acceso" so the owner can send them to the customer.
- S41: The customer form has "Cancelar" and "Guardar cliente" aligned like the other dialogs (not a full-width button alone); the commercial-rules help text sits under the "Condiciones comerciales" heading; with no rules it reads "Sin condiciones: compra a precio de lista."; the "Estado" field is shown only when editing (a new customer starts active).
- S42: The presentation field of each commercial rule is searchable (type product name, SKU or presentation).
- S43: In the customer detail, "Editar" moves to the dialog header instead of a full-width button in the middle of the content.

### Flow 9 — Tienda (agent decisions, L7)
- S44: The dotted bar under a product's quantity stepper either disappears or gets a clear label (e.g. "12 de 444 disponibles"); no unexplained decoration.
- S45: The store header uses one wording for signing in ("Entrar") on desktop and phone.
- S46: The store sign-in page has a show/hide password toggle like the staff login.
- S47: After "Revisar y apartar" is confirmed, the customer sees a confirmation with the order code, the pickup warehouse, until when it is held ("Pasa por él antes de …") and a link to "Mis pedidos"; the sheet is emptied.

### Flow 10 — Reportes, Almacenes, Configuración (agent decisions, L7)
- S48: Reportes shows the period in long Spanish form (e.g. "6 al 12 nov 2026, comparado con 30 oct al 5 nov") instead of ISO dates, lays the five KPI cards in one row on wide screens (no half-empty second row), and offers a short section index (Ventas · Inventario · Caja y repartos) that jumps to each part of the long page.
- S49: Almacenes uses compact cards without the decorative block and big "01" numbers; "Bajo el mínimo" and "Lotes por vencer" read as alerts only when above zero, and each links to that warehouse's inventory.
- S50: In Configuración, removing a warehouse assignment (the × on a chip) asks for confirmation naming the user and the warehouse; the chip drops the "· Encargado" suffix that repeats the Rol column.

### Flow 11 — Teléfono (agent decisions, L7)
- S51: On phones (below the md breakpoint), the Mostrador order list and the Inventario "Productos" list render as stacked rows (one block per item with its key data and main action) instead of a table that scrolls sideways and hides the total and the actions.
- S52: On phones, the Mostrador cash panel collapses to one line ("Caja abierta · $X esperado") with a button to expand its actions and figures, so the orders stay in view.
- S53: On phones, the Inventario tab strip scrolls without a visible scrollbar and keeps the active tab in view.

### Flow 12 — Huecos de casos de uso (agent decision, L7)
- S54: No code. Supplier payables, customer refunds/returns and expenses are new money features with business-rule trade-offs; they are written up as proposals for the user in docs/qa/2026-11-12-flow-map/ux-review-results.md instead of being built unattended.

## Tasks
- T1 [S1, S3] Restructure Inicio: attention block first, expired lots alert, remove duplicates and zero rows — route: inline — commit: ccd54d9 ✅
- T2 [S2] Direct actions from Inicio alerts — route: inline — commit: 7c8443b ✅
- T3 [S4, S5, S6] Role label, date, footer, breadcrumb, login brand and password toggle — route: inline — commit: ccd54d9 ✅
- T4 [S7, S8, S12] Catalog table/cards toggle, single footnotes, quick wins — route: worker — commit: 98201b4 ✅
- T5 [S9] Cost and price in Nuevo producto — route: worker — commit: 1c4ce26 ✅
- T6 [S11] Archive and restore products (high risk: schema/data) — route: worker — commit: 49fd66c + 0da4eea ✅
- T7 [S13-S18] Supplier orders, reception and balances UX — route: worker — commit: 4056c68 ✅
- T8 [S19-S23] Stock maintenance pickers, expiry badges, faster load — route: worker + parent fix — commit: d0eb053 ✅
- T9 [S24-S29] Counter order flow — route: worker (after T6, shared counter surface) — commit: 7002db9 ✅
- T10 [S30-S34] Cash drawer clarity — route: worker — commit: b67afa2 ✅
- T11 [S35-S38] Rider delivery clarity — route: worker — commit: db1d40a ✅ (SKU search pending in services after T6)
- T11 note: SKU fix committed after T6 (riders 81 pass).
- T12 [S39-S43] Customers and store access — route: worker + parent fix (Generar contraseña submitted the form) — commit: abe7535 ✅
- T13 [S44-S47] Storefront polish — route: worker (after T6, shared store surface) — commit: 51fab6d ✅
- T6b [S11] Fix verify findings D1-D4 + Precios hides archived + refusal tests for transfers/balances — route: worker — commit: 0da4eea ✅
- T14 [S48-S50] Reports, warehouses and settings polish — route: worker — commit: b2f084c ✅ (DB tests pass in final run)
- T15 [S51-S53] Phone layouts — route: worker (after T6b, shared inventory-page) — commit: da9ac04 ✅
- T16 [S54] Write results and gap proposals — route: inline — commit: b2f084c ✅

## Log
- L1 (user, verbatim): "Analiza docs/qa/2026-11-12-flow-map/ la idea es que analices todo el flujo y detectes fricciones, fallas y cosas que hagan confusa y dificil la experiencia de usuario, vas a avanzar paso a paso con el flujo uno por uno y cuando detectes si algo necesita mi decision me preguntes para aplicarla, la idea es mejorar el flujo de la UI, quitar cosas inecesarias y en general mejorar mucho la experiencia de usuario"
- L2 (user decisions, Flow 1): Orden Inicio = "Alertas primero (Recomendado)"; Acciones = "Sí, acciones directas"; Vencidos = "Sí, como alerta roja".
- L3 (evidence): ccd54d9 — overview tests + full suite 1198 pass / 0 fail; visual check owner and manager on dev DB. Slice boundary: ccd54d9 is ~740 authored lines (overview page rewrite); next slices stay under ~400.
- L4 (user decision): T2 was blocked by uncommitted pre-existing inventory work; user chose "Commiteá primero lo de inventario" → committed separately as refactor(inventory): remove the standalone supplier write-off. T2 then implemented via /inventario search params (accion=quitar|pedido, producto, lote); verified in browser (Quitar opens lot removal with "Pérdida: vencido"; Pedir opens Nuevo pedido with supplier, warehouse and product prefilled; closing clears the URL). Tests: inventory + overview 348 pass / 0 fail.
- L5 (observation for Flow 4): navigating to /inventario as owner takes ~10-15 s on the dev server.
- L6 (user decisions, Flow 2): Vista catálogo = "Una opcion para cambiar a tarjetas y tabla"; Alta producto = "Costo y precio en el alta"; Costo global = "Mantener como está"; Archivar = "Sí, archivar".
- L7 (user, verbatim): "Me voy a dormir, tiene permiso de hacer lo que mas creas recomendable y funcional, no pares hasta acabar" → from Flow 3 on, decisions are taken by the agent and logged as "Agent decision" for the user's later review. No push, PR or merge.
- L8 (agent decision, Flow 3): S13-S18 chosen from screenshots mgr-50..61, owner-21..23; no business rule changes.
- L9 (evidence): T4 98201b4 (catalog+pricing+import tests 164 pass; visual check by parent: table, cards, derived placeholder, product form). T7 4056c68 (inventory 343 pass; visual check by parent: tab badges, reception without horizontal scroll, sticky footer). Slice note: commits exceed ~400 lines each because they are UI rewrites of one screen; kept one screen per commit.
- L10 (agent decision, Flow 4): S19-S23 from screenshots mgr-20..27, mgr-62..64, owner-24..26 and the slow /inventario load seen in L5.
- L11 (evidence): T8 d0eb053 — 408+ tests pass; S22 already present; S23 load ~6.9 s → ~5.3-6.2 s on dev (noisy); parent found and fixed Esc closing the whole dialog while the picker list was open (escapeClosesOpenList in ui/dialog), verified in browser.
- L12 (agent decision, Flow 5): S24-S29 from screenshots mgr-30..43.
- L13 (agent decision, Flow 6): S30-S34 from screenshots mgr-44..47, mgr-85..89 and known fact #6.
- L14 (agent decision, Flow 7): S35-S38 from screenshots mgr-70..77; the flow is already solid, changes are small.
- L15 (agent decision, Flow 8): S39-S43 from screenshots owner-40..45.
- L16 (agent decision, Flow 9): S44-S47 from screenshots store-01..06.
- L17 (evidence): T6 49fd66c — migration drizzle/0033_product_archive.sql (ADD COLUMN archived_at, nullable) generated with drizzle-kit and applied to the dev DB by the worker; full bun test 1267 pass / 2 skip / 0 fail; extra refusals added by worker: transfer en tránsito and open supplier balance. Known gaps: Precios screen (listWarehousePrices) still lists archived products; order creation does not lock the product row (tiny race, archive needs zero stock).
- L18 (evidence): independent verify of 49fd66c: conditional pass (643 tests pass). Defects: D1 reception extras accept archived products; D2 positive lot adjustment can restock an archived product; D3 inventario labels lose archived names (history regression); D4 clientes rule labels lose archived names; gaps: Precios lists archived, no tests for transfer/balance refusals.
- L19 (agent decision, Flow 10): S48-S50 from owner-60..62, mgr-80, owner-70, owner-71. Not done (logged as gap): user deactivation and password reset in Configuración.
- L20 (agent decision, Flows 11-12): S51-S54 from mgr-90, mgr-91, store-04 and README §3.2/§5; money gaps are proposals only.
- L21 (evidence): T6b 0da4eea — full bun test 1292 pass / 2 skip / 0 fail; D1-D2 RED→GREEN; CSV archived-SKU message left open (needs catalog-import validator flag).
- L22 (evidence, close): final run on da9ac04 — tsc clean, eslint --quiet clean, bun test 1293 pass / 2 skip / 0 fail (1295 tests, 167 files). All tasks T1-T16 done. Open: CSV duplicate-SKU message does not say the product is archived; money gaps are proposals only (ux-review-results.md). Not pushed.
