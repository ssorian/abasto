# Exploratory QA — abasto-web (2026-11-10)

Manual exploratory pass with Playwright over every staff-console and store use case of `abasto-web`. No source code was changed.

**TL;DR**

- 3 logic bugs that can corrupt data or reports (empty stock count wipes stock, expired stock accepted on reception, UTC dates in reports).
- App-wide: slow pages (5–30 s warm in dev), slow saves (4–15 s) with missing feedback and stale lists.
- Many silent validation failures and mixed units (cajas / piezas / unidades).

## Scope and setup

| Item | Value |
| --- | --- |
| App | `abasto-web` only (mobile excluded: screens with static data, no backend) |
| Server | `bun run dev` (Vite dev mode, port 3000) |
| Database | Durable dev DB `abasto-db` (seeded), test data prefixed `QA` |
| Roles | Owner (`dueno@abasto.local`), manager (`miguel@abasto.local`, Arcelia), store customer (created during QA), anonymous visitor |
| Viewports | 1366×850 (console), 390×844 (store, console spot checks) |

Severity labels: **Bug** (wrong behavior or data), **Confusing** (works but misleads), **Improvement** (nice to have).

## 1. Bugs

### 1.1 Data and logic (highest priority)

| # | Area | Finding | Steps | Evidence |
| --- | --- | --- | --- | --- |
| B1 | Inventory · Conteo físico | Submitting a count with an empty quantity records 0 and wipes the stock. No confirmation. | Inventario → Hacer conteo → choose product with 12 pz → leave "Cantidad contada" empty → Registrar conteo | Product row went from `12 piezas` to `0 piezas`. Dialog already showed "Diferencia: −12 piezas" before typing anything. |
| B2 | Inventory · Recibir pedido | Already-expired stock is accepted as good inventory without warning. | Recibir pedido → uncheck "Sin caducidad" → expiry `2020-01-01` → Confirmar recepción | "Pedido recibido. Las existencias ya están actualizadas." Lot PED-0008 shows `01 ene 2020 Vencido`. |
| B3 | Reports · Cortes de caja | Cash cuts are dated in UTC. Cuts closed on 10 Nov at 22:27 local appear as "11 nov". | Close a cash session in the evening → Reportes → Cortes de caja | Reports: `11 nov · Arcelia · Dueño Abasto · −$9.86`. Cash history: `10 nov 2026, 10:27 p.m.` |

### 1.2 Performance and feedback (app-wide)

| # | Finding | Evidence |
| --- | --- | --- |
| B4 | SSR is very slow with a warm server. Data volume is tiny (63 stock movements), so likely serialized or N+1 queries. | `curl` with session: `/inventario` 9–14 s, `/almacenes` 5 s, `/` 3.7 s, `/repartos` 3.9 s. Browser: `/reportes` ~30 s, `/direccion` ~25 s. Dev log: `DeprecationWarning: Calling client.query() when the client is already executing a query`. Still to compare against a production build. |
| B5 | Clicks during slow hydration are lost (tabs and buttons do nothing). | Inventario tabs needed a second click after load. |
| B6 | Mutations take 4–15 s and many give no success toast; the dialog just stays open. | No toast on: edit product, save prices, save presentations, save supplier, new warehouse, remove warehouse from user, close cash, open cash, assign delivery. |
| B7 | Lists stay stale after a mutation. | Assign warehouse (seconds late), receive and cancel transfer (row kept "En tránsito" with active buttons), cash entry ("ENTRADAS $0.00" right after "Entrada registrada."), supplier balance history. "Nuevo reparto" never showed the new delivery until a full reload. |
| B8 | Forms fail silently (button re-enables, no message). | Product with empty name, presentation factor 0, empty supplier, warehouse name of only spaces, transfer of 99 999 boxes. |

### 1.3 Validation

| # | Finding | Evidence |
| --- | --- | --- |
| B9 | Empty "Nuevo usuario" only reports the email. | Toast: "Escribe un correo válido." (name and password not mentioned). |
| B10 | Browser-native validation messages appear in English. | "Please lengthen this text to 8 characters or more…", "Please include an '@'…", "Value must be less than or equal to 100.", "Value must be greater than or equal to 1." |
| B11 | Discount of 150 % on a commercial condition gives a generic error. | "Revisa las condiciones comerciales." |
| B12 | Reception with more missing boxes than ordered keeps confirm enabled and shows a contradictory summary. | Error "Las faltantes y dañadas no pueden superar las cajas pedidas." next to "No entra ninguna caja · 10 faltantes nuevos" for an order of 5. |

## 2. Confusing behavior

| # | Area | Finding |
| --- | --- | --- |
| C1 | Units | Mixed units across screens. A piece-based product shows "Cajas de …" on supplier orders and "Entran 5 cajas" on reception, then 3 piezas in stock. Counter order shows "Disponible: 9" (boxes) next to "Pides 1200 piezas en total y solo hay 216 disponibles". Transfers say "unidades". Grammar: "piezas · 1 piezas", "Las 1 unidades". |
| C2 | Inventory status | A product with 12 expired pieces shows "Sin existencias". Inventory shows "1 Stock bajo" for Arcelia while Reports shows "2 productos con stock bajo · Arcelia 2". |
| C3 | Inventory | Two ways to remove stock: "Ajustar → Quitar existencias" and "Pérdida". |
| C4 | Catalog | "Editar producto" has two save buttons ("Guardar producto", "Guardar presentaciones") depending on the tab. |
| C5 | Configuración | Role select with a single option ("Encargado"); the users table shows the role as "Personal". |
| C6 | Catalog · Importar CSV | Template asks for `precio_venta` and `stock_minimo` but the dialog says they are not saved. |
| C7 | Reports vs cash | Delivery (reparto) sales ($230.41 liquidated) are missing from Reports sales, but count as "VENTAS" in the cash box. |
| C8 | Repartos | Renaming a rider rewrites the name on past deliveries. |
| C9 | Transfers | "Entrada · Dueño Abasto" on a transfer row does not say who sent it. |
| C10 | Store | Bottom bar shows `$1,534.68` (list price) while the sheet shows `$1,381.20` (customer price) for the same cart. |
| C11 | Store | A newly created warehouse with no stock or prices (QA-Almacén) immediately appears as a pickup option. |
| C12 | Catalog / store | A new product with a broken image URL is published with a broken image. |
| C13 | Mostrador | "RETIROS -$0.00". |
| C14 | Permissions UX | A manager opening `/configuracion` sees "No tienes permiso para esta acción." inside the layout instead of a redirect (`/almacenes` does redirect). |
| C15 | Mostrador | "Abre la caja antes de cobrar." appears only after pressing "Entregar". |

## 3. Improvements

| # | Suggestion |
| --- | --- |
| M1 | Add search to Catálogo and Inventario, and searchable product pickers. Current selects: 146 options (counter order, commercial conditions), 74 (count, minimum). Counter order lists products with "disp. 0". |
| M2 | Blind count and blind cash close: do not show the system quantity or expected cash before the user enters it. Add a note field to explain a cash difference. |
| M3 | Confirm before removing a warehouse from a user and before a count that sets stock to 0. |
| M4 | Show validation errors next to each field (`aria-invalid` with text), not only as a toast. |
| M5 | Show who made each change in price history and cash history. |
| M6 | At 390 px, `/mostrador` and `/inventario` scroll horizontally as a whole page (`scrollWidth` 551 and 416). Tables should scroll inside their own container. The store looks fine at 390 px. |
| M7 | Exported CSV file name mixes English: `abasto-ventas-day-2026-11-04-2026-11-10.csv`. |

### B4 follow-up: production build timing (2026-11-11)

`bun run build`, then `PORT=3100 bun .output/server/index.mjs` against the dev database, logged in as the seeded owner, `curl` total time per request. One warm-up round, then three rounds:

| Page | Warm-up | Round 1 | Round 2 | Round 3 |
| --- | --- | --- | --- | --- |
| `/` | 2.71 s | 2.66 s | 2.41 s | 1.23 s |
| `/inventario` | 2.73 s | 4.36 s | 3.43 s | 2.54 s |
| `/almacenes` | 1.60 s | 1.92 s | 1.45 s | 1.37 s |
| `/repartos` | 1.45 s | 1.78 s | 1.26 s | 1.52 s |
| `/reportes` | 2.88 s | 3.89 s | 2.22 s | 2.66 s |
| `/direccion` | 0.31 s (307) | 0.54 s (307) | 0.18 s (307) | 0.31 s (307) |

Faster than the dev server (`/inventario` was 9–14 s), but still 1.2–4.4 s for a tiny data set, so B4 is not solved. `/direccion` answers with a redirect, so its time does not measure a render. The next step is to profile the `/inventario` loader (`src/routes/inventario.tsx`), which waits for the overview before it loads transfers, orders and balances.

## 4. What worked

- Login with correct and wrong credentials ("Correo o contraseña incorrectos."), logout, redirect to `/login?redirect=…`.
- Duplicate checks for email and warehouse name.
- Commercial condition applied correctly: Crema Lala Caja $511.56 → $460.40 (10 % from 2).
- Cash pickup with change ("Cambio: $118.80"); blocked withdrawal larger than cash ("No hay tanto efectivo en la caja.").
- Transfer received with difference; over-receipt blocked ("Lo recibido no puede ser mayor que lo enviado.").
- Delivery liquidation with shortfall; loss over lot stock blocked ("No hay suficiente existencia en ese lote.").
- Reservation hours validation (1–720).
- Store: anonymous catalog, search, empty state, "Inicia sesión para apartar"; customer reserve and cancel; customer opening the console is sent back to `/tienda`.
- Manager scope: inventory, counter and reports are limited to Arcelia even with another `?almacen=` id.

## 5. Not tested

- A reservation expiring to "Vencido".
- Confirming a CSV import (only an invalid CSV was validated).
- Detailed checks of the Movimientos and Entradas tabs.
- Bypassing permissions by calling server functions directly.
- The mobile app (`abasto-mobile`).

## 6. Test data left in the dev database

| Type | Records |
| --- | --- |
| Users | `qa-user@abasto.local` (staff), `qa-cliente@abasto.local` (store customer) |
| Warehouse | QA-Almacén |
| Supplier | QA-Proveedor (inactive) |
| Product | QA-Leche Prueba 1 L editada (presentation Caja, prices, minimum 50) |
| Customer | QA-Abarrotes Prueba (10 % from 2 on Crema Lala Caja) |
| Supplier order | PED-0008 and its balances (one discounted, one returned) |
| Transfers | Arcelia → QA-Almacén received with difference; QA-Almacén → Arcelia cancelled |
| Orders | PED-62EF1A06 delivered; PED-C4720C56 and PED-2F142514 cancelled |
| Cash (Arcelia) | Entry $100, withdrawal $50, close with −$9.86, reopened with $500 |
| Deliveries | Rider "QA Repartidor 2" (inactive), one liquidation with −$30.41, one cancelled |

## Suggested next step

Fix B1, B2 and B3 first, each with a regression test, then profile B4 before working on feedback (B6–B8).
