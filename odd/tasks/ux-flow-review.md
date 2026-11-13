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

## Tasks
- T1 [S1, S3] Restructure Inicio: attention block first, expired lots alert, remove duplicates and zero rows — route: inline — commit: ccd54d9 ✅
- T2 [S2] Direct actions from Inicio alerts — route: inline — commit: (see L4) ✅
- T3 [S4, S5, S6] Role label, date, footer, breadcrumb, login brand and password toggle — route: inline — commit: ccd54d9 ✅

## Log
- L1 (user, verbatim): "Analiza docs/qa/2026-11-12-flow-map/ la idea es que analices todo el flujo y detectes fricciones, fallas y cosas que hagan confusa y dificil la experiencia de usuario, vas a avanzar paso a paso con el flujo uno por uno y cuando detectes si algo necesita mi decision me preguntes para aplicarla, la idea es mejorar el flujo de la UI, quitar cosas inecesarias y en general mejorar mucho la experiencia de usuario"
- L2 (user decisions, Flow 1): Orden Inicio = "Alertas primero (Recomendado)"; Acciones = "Sí, acciones directas"; Vencidos = "Sí, como alerta roja".
- L3 (evidence): ccd54d9 — overview tests + full suite 1198 pass / 0 fail; visual check owner and manager on dev DB. Slice boundary: ccd54d9 is ~740 authored lines (overview page rewrite); next slices stay under ~400.
- L4 (user decision): T2 was blocked by uncommitted pre-existing inventory work; user chose "Commiteá primero lo de inventario" → committed separately as refactor(inventory): remove the standalone supplier write-off. T2 then implemented via /inventario search params (accion=quitar|pedido, producto, lote); verified in browser (Quitar opens lot removal with "Pérdida: vencido"; Pedir opens Nuevo pedido with supplier, warehouse and product prefilled; closing clears the URL). Tests: inventory + overview 348 pass / 0 fail.
- L5 (observation for Flow 4): navigating to /inventario as owner takes ~10-15 s on the dev server.
