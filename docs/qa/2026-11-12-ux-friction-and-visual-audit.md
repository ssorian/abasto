# UX friction and visual audit — abasto-web (2026-11-12)

Two read-only passes over `abasto-web`: a flow-friction audit read from the code, and a visual audit over screenshots of the running app. No source code was changed.

**TL;DR**

- 74 findings: 1 bug, 36 flow-friction items, 8 on write-offs and returns, 29 visual items. None of the proposed fixes changes a business rule.
- Flow friction clusters in seven patterns; the worst are a closed cash drawer that blocks without offering a way out, and forms that ask for what the app already knows.
- Visually the console has one coherent identity but lacks hierarchy, a single component system and a real phone layout. Heuristic scores: console pages 23/40, dialogs and store 26/40.

## Scope and method

| Item | Value |
| --- | --- |
| App | `abasto-web` only (`abasto-mobile` excluded) |
| Flow pass | Code reading of routes, components, forms and the validation they call. The app was not run. |
| Visual pass | 75 screenshots as owner on the seeded dev DB, desktop (~1600×1000) and phone (~433×937), plus the impeccable detector and grep measurements |
| Screenshots | `abasto-web/.impeccable/critique/shots/` (untracked) |
| Detector output | `abasto-web/.impeccable/critique/detector-b.json` (untracked) |

Paths are relative to `abasto-web/src/`. Severity: **H** blocks or misleads a frequent task, **M** slows it down, **L** minor.

**Limits of this audit**

- Line numbers come from the reading passes and were not all rechecked; treat them as "near this line".
- Reception, rider settle and assign dialogs, and "Descontar del pago" could not be opened in the browser (no data or disabled button). They were judged from source.
- Role permission rules (`modules/access/lib/policy.ts`) and the full service layer were not read.
- The manager and customer roles were not captured in the visual pass; only the owner.

## 1. Bug

| ID | Problem | Where |
| --- | --- | --- |
| B1 | "Sumar existencias" shows the toast "Existencias quitadas." because adding reuses the negative-adjustment action, whose message is fixed. | `modules/inventory/hooks/use-inventory-actions.ts:127`, called from `modules/inventory/forms/lot-operation-dialog.tsx:76` |

## 2. Flow friction

### 2.1 A closed cash drawer blocks with no way out

Rule kept: money always goes into an open cash session.

| ID | Sev | Problem | Where | Proposed fix |
| --- | --- | --- | --- | --- |
| F1 | H | Charging an order shows "Abre la caja antes de cobrar." with no action to open it; the cash panel is behind the dialog. | `modules/counter/components/order-view-dialog.tsx:185`, `modules/counter/lib/order-status.ts:19` | "Abrir caja" button inside the notice, returning to the order. |
| F2 | H | "Liquidar reparto" is disabled while the drawer is closed; the user must go to Mostrador, open it, come back and reopen the dialog. | `modules/riders/forms/settle-dialog.tsx:93`, `:189`; warning in `modules/riders/components/repartos-page.tsx` | Same "Abrir caja" action inside the settle dialog. |

### 2.2 The app asks for what it already knows

| ID | Sev | Problem | Where | Proposed fix |
| --- | --- | --- | --- | --- |
| F3 | H | "Cobrar y entregar" stays disabled until "Efectivo recibido" is typed, even for exact payment. | `modules/counter/components/payment-step.tsx:46`, `:85-88` | Prefill with the total; add "Pago exacto" and quick bills. |
| F4 | H | Rider settlement needs two typed fields per product ("Regresó (cajas)", "Regresó (unidades)") plus the money; "Vendió" appears only after typing. | `modules/riders/forms/settle-dialog.tsx:~120-160` | Returns default to 0, "Vendió" computed live, "Entregó lo esperado" button. |
| F5 | H | Reception table has 8 columns and 4–5 inputs per row; expiry is required per line and its error appears only after the first submit. | `modules/inventory/forms/reception-dialog.tsx` (`attempted` filter), `modules/inventory/lib/reception-draft.ts:42` | "Caducidad para todas" bulk field and inline validation. |
| F6 | H | Boxes and units are asked separately in assign and settle; the conversion is a small hint. | `modules/riders/forms/assign-dialog.tsx:92`, `:~115-125` | One field in boxes, units optional, live "= N unidades · quedan M". |
| F7 | M | Restock arrivals have two inputs for one fact: a "Llegaron" number and a "Recibido" toggle. | `modules/inventory/forms/reception-dialog.tsx` (replacement section) | Keep the toggle; number field only as override; prefill expiry. |
| F8 | M | Cash "Motivo" is free text, so reasons will vary and reports will be hard to read. | `modules/cash/components/cash-movement-dialog.tsx:59` | Preset list plus "Otro" with optional note. |

### 2.3 One job split across two screens

| ID | Sev | Problem | Where | Proposed fix |
| --- | --- | --- | --- | --- |
| F9 | H | A customer cannot be created while composing an order; the user must close it, go to Clientes and come back. | `modules/counter/components/new-order-dialog.tsx:95`, `modules/counter/lib/order-draft.ts:52` | Inline "+ Nuevo cliente" (name and phone). |
| F10 | H | Supplier cost is edited from three or four places with different labels: Precios, the order row, reception. | `modules/catalog/forms/product-form-dialog.tsx`, `modules/pricing/forms/warehouse-prices-dialog.tsx`, `modules/inventory/forms/reception-dialog.tsx` | One reusable "Costo" panel. |
| F11 | M | "Nuevo usuario" has no role or warehouse; warehouses are assigned afterwards from the row. | `modules/access/components/new-user-dialog.tsx:62` | Role and warehouse in the create dialog. |
| F12 | M | Store access is a second step after saving the customer, with a plain-text password and no generate or copy action. | `modules/store/components/store-access-section.tsx:58` | Optional block in the create form, hidden password with toggle, "Generar y copiar". |
| F13 | L | "Duración de la reserva" is an owner setting placed on Mostrador. | `modules/counter/components/reservation-setting.tsx`, rendered in `modules/counter/components/counter-page.tsx` | Move to Configuración. |

### 2.4 Silent effects

| ID | Sev | Problem | Where | Proposed fix |
| --- | --- | --- | --- | --- |
| F14 | H | "Actualizar también el costo por pieza en el catálogo" is checked by default, so one receipt's correction changes every future order. | `modules/inventory/forms/reception-dialog.tsx:92` | Unchecked by default; state the impact in the label. |
| F15 | H | The price dialog saves cost first and sale prices second; if prices fail it shows an error although the cost was saved. | `modules/pricing/forms/product-prices-dialog.tsx:~105-122` | Save both in one request, or report the partial save. |
| F16 | M | "Agregar condición" creates "5% desde 10" from prefilled defaults nobody chose. | `modules/customers/lib/customer-form.ts:52-54` | Start blank; show a summary line before saving. |
| F17 | M | "Quitar existencias" records a loss or an adjustment depending on the reason, without telling the user which. | `modules/inventory/forms/lot-operation-dialog.tsx:36-38`, `modules/inventory/lib/stock-drafts.ts:55` | "Se registrará como: pérdida / ajuste" under the select. |
| F18 | M | "Desactivar" a rider takes effect at once, with no warning about open assignments. | `modules/riders/components/riders-catalog.tsx:80` | Confirm only when the rider has an open assignment. |
| F19 | M | Changing the import type wipes the pasted content. | `modules/product-import/components/import-csv-dialog.tsx` (mode `onChange`) | Keep the text; detect the type from the headers. |

### 2.5 Disabled or blocked with no reason

| ID | Sev | Problem | Where | Proposed fix |
| --- | --- | --- | --- | --- |
| F20 | H | "Nuevo reparto" is greyed out when every rider is on route; the reason only shows in the empty state. | `modules/riders/components/repartos-page.tsx:102`, `modules/riders/components/assignments-section.tsx:47` | "Todos los repartidores están en ruta" beside the button. |
| F21 | H | The store cart is blocked by sold-out lines that must be removed one by one. | `modules/store/components/cart-sheet.tsx:176`, `:224`; `modules/store/components/pick-list-panel.tsx:100` | "Quitar agotados (n)". |
| F22 | H | A visitor builds a cart and learns at the footer that login is required; the total then changes. | `modules/store/components/cart-sheet.tsx:296` | Say it at the top of catalog and sheet; show the price the user will pay. |
| F23 | M | Staff opening "Mis pedidos" see "Esta sesión no es de cliente" with no action. | `modules/store/components/orders-page.tsx:61` | "Cerrar sesión" and "Ir a Mostrador" in the notice. |

### 2.6 Structure and navigation

| ID | Sev | Problem | Where | Proposed fix |
| --- | --- | --- | --- | --- |
| F24 | H | Inventario has 7 tabs; "Entradas", "Movimientos" and "Conteos" receive the same rows. "Nuevo pedido" sits in "Entradas" although it moves no stock. | `modules/inventory/components/inventory-page.tsx` | One "Movimientos" tab with type filters; "Nuevo pedido" in "Por recibir". |
| F25 | M | The owner report is one long page of about ten sections with no grouping. | `modules/reports/components/owner/` | "Needs action" first; the rest in tabs (Ventas, Stock, Caja). |
| F26 | M | Owner and manager reports use two filter bars with the same presets. | `modules/reports/components/owner/owner-period-filters.tsx`, `modules/reports/components/manager/manager-filters.tsx` | One filter component. |
| F27 | M | "Guía rápida" in the menu leads nowhere. | `config/navigation.ts:52` | Remove it or link it. |
| F28 | M | No account menu and no staff password change; logout is an icon-only button. 2FA and passkeys exist only on the unmerged branch `feat/two-factor-passkeys`. | `components/layout/app-topbar.tsx:41-42` | Avatar menu with name, role, change password and logout. |
| F29 | M | Fixing a wrong presentation means deactivating it and creating another. | `modules/catalog/forms/product-form-dialog.tsx` (presentations tab) | Allow editing name and barcode; lock only the factor once stock exists. |
| F30 | M | In transfers the destination defaults to the first option, lots are chosen with no preview, and receiving has no damaged option. | `modules/transfers/forms/transfer-dialog.tsx`, `modules/transfers/forms/receive-dialog.tsx` | Lot preview before sending; damaged option on receipt. |

### 2.7 Inconsistent vocabulary

| ID | Sev | Problem | Where | Proposed fix |
| --- | --- | --- | --- | --- |
| F31 | M | A customer order is "Reservar pedido", "Nuevo pedido", "Apartar", "Apartado" and "Hoja de surtido"; "Nuevo pedido" is also the supplier order. | `modules/counter/components/new-order-dialog.tsx:85`, `:255`; `modules/inventory/forms/order-dialog.tsx:179`; `modules/store/` | One staff glossary; keep "apartar" only in the public store. |
| F32 | M | Delivery is "Entregar", "Cobrar y entregar", "Pedido entregado" and status "Recogido". Cancelling is "Cancelar pedido" and "Cancelar apartado". | `modules/counter/components/order-view-dialog.tsx:81`, `:198`; `modules/store/components/orders-page.tsx:130` | One verb per action. |
| F33 | M | "Repartos de hoy" also lists routes from earlier days; settled and cancelled rows both read "Cerró". | `modules/riders/components/assignments-section.tsx:44`, `:134` | "Abiertos y de hoy"; "Liquidada" or "Cancelada" as the label. |
| F34 | M | Every staff account and warehouse role is labelled "Encargado". | `modules/access/lib/role-labels.ts:7`, `:14` | Distinct labels per role. |
| F35 | M | "Preparar" looks required but pickup is allowed straight from Reservado. | `modules/counter/lib/order-status.ts` | "Marcar como preparado (opcional)". |
| F36 | L | "Por recibir", "Por reponer", "Por devolver" and "Saldos" overlap as names for pending items. | `modules/inventory/components/supplier-pendings-tab.tsx` | One glossary in the Saldos header. |

## 3. Inventory write-offs and returns

"Baja" does not exist as a word in the UI: it is "Quitar existencias", "Pérdida" or "Descontar del pago" depending on the screen.

| ID | Sev | Problem | Where | Proposed fix |
| --- | --- | --- | --- | --- |
| R1 | H | "Las repuso" closes the balance but the replaced boxes do not enter stock ("Nada de esto entra al inventario"). The toast says "el proveedor repondrá las cajas" (future) for an option worded in the past. | `modules/inventory/forms/return-dialog.tsx:52`, `:76`; `modules/inventory/services/supplier-pendings.ts:174`; toast in `modules/inventory/hooks/use-inventory-actions.ts:65` | Ask for expiry and enter the lot there, or move the balance to "Por reponer". **Business decision.** |
| R2 | H | "Quitar existencias" is three levels deep (Productos → lots → lot). The reason starts on "Pérdida: vencido" unchosen, "¿Qué pasó?" is required even when the reason says it, and there is no "whole lot" shortcut. | `modules/inventory/forms/lots-dialog.tsx:115`; `modules/inventory/forms/lot-operation-dialog.tsx:51`, `:131`; `modules/inventory/lib/stock-drafts.ts` | No preselected reason; note required only for "Otro motivo"; "Todo el lote" button. |
| R3 | M | Stock that expires on the shelf never reaches "Por devolver"; per the Saldos copy only damage found at reception does. Not confirmed in the loss service. | `modules/inventory/components/supplier-pendings-tab.tsx:60-63` | **Business decision:** whether shelf-expired stock can be returned. |
| R4 | M | An empty discount amount means "original value", explained only in a hint. | `modules/inventory/forms/return-dialog.tsx:82` | Prefill the field with that value, editable. |
| R5 | M | Three ways to "discount" with different names: "Descontar del pago", "Descuento" inside "Marcar como devuelto", and "Descontar" in a new order. | `modules/inventory/forms/write-off-dialog.tsx`, `modules/inventory/forms/return-dialog.tsx`, `modules/inventory/forms/order-dialog.tsx`, `modules/inventory/lib/pending-labels.ts` | One "Resolver" action per row with the valid options. |
| R6 | M | The write-off shows "Se descuentan aproximadamente $X" on an action that "No se puede deshacer". | `modules/inventory/forms/write-off-dialog.tsx:50`, `:65` | Ask the server for the exact amount before confirming. |
| R7 | M | No per-supplier total of what was discounted was found; only a line-by-line history. | `modules/inventory/components/supplier-pendings-tab.tsx` | "A tu favor" total per supplier. |
| R8 | L | Server errors say "cancelar" where the screen says "descontar". | `modules/inventory/services/supplier-pendings.ts:140-162` | Use the screen's verb. |

## 4. Visual findings

### 4.1 Hierarchy

| ID | Sev | Problem | Where | Proposed fix |
| --- | --- | --- | --- | --- |
| V1 | H | Mostrador has two filled red primaries: "Nuevo pedido" and "Cerrar caja". | `modules/cash/components/cash-panel.tsx:88`, `modules/counter/components/counter-page.tsx:39` | Only "Nuevo pedido" filled; "Cerrar caja" outlined. |
| V2 | H | The reservation-setting card pushes the orders table to mid-screen. | `modules/counter/components/counter-page.tsx`, `modules/counter/components/reservation-setting.tsx:27` | Move it out (see F13). |
| V3 | M | Inicio shows six equal-weight panels; nothing ranks urgency. | `modules/overview/components/overview-page.tsx:106`, `:130` | One alert row on top (expiries, orders due today). |
| V4 | M | "Nuevo pedido" appears twice in Inventario, both filled red. | `modules/inventory/components/inventory-page.tsx`, `modules/inventory/components/entries-tab.tsx:30` | Keep one. |
| V5 | M | Report KPI cards carry an axis-less sparkline, a "— vs. anterior" placeholder and a repeated sentence. | `modules/reports/components/owner/kpi-cards.tsx:125` | Hide the dash when there is no prior data. |

### 4.2 Density

| ID | Sev | Problem | Where | Proposed fix |
| --- | --- | --- | --- | --- |
| V6 | H | Catálogo is about 20,000 px tall on desktop and 33,000 px on phone, with no pagination. Each card stacks a 205 px image, description, price block, a repeated unit note, two buttons and a link. | `modules/catalog/components/catalog-card.tsx:33`, `:55`, `:67`, `:89`; `modules/catalog/components/catalog-page.tsx:152` | Dense list with price and status columns; the note once; search or pagination. |
| V7 | M | "Entradas" rows repeat "Entrada por compra" and "Compra" and mix units ("+3 piezas", "+1 caja"). | `modules/inventory/components/movement-table.tsx:29`, `:84` | Group by date; one unit column. |
| V8 | L | Almacenes shows 62 px ghost numbers that read like counts. | `modules/warehouses/components/warehouse-card.tsx` | Drop or shrink them. |

### 4.3 Phone layout

| ID | Sev | Problem | Where | Proposed fix |
| --- | --- | --- | --- | --- |
| V9 | H | The Mostrador table clips status pills ("Cancela", "Recogi") and "Ver pedido" is off-screen. | `modules/counter/components/data-table.tsx:7` | Stacked row per order under `md`. |
| V10 | H | Long dialogs lose title and footer: Cancelar/Guardar scroll away in "Precios" and "Nuevo producto". | `modules/catalog/components/catalog-modal.tsx:40-48`, `modules/pricing/forms/product-prices-dialog.tsx:315`, `modules/catalog/forms/product-form-dialog.tsx:264` | Scroll only the body; pin the footer. |
| V11 | H | Reception has three tables with 760–900 px minimum width inside the dialog, and the error text sits in the product cell, far from the failing input. | `modules/inventory/forms/reception-dialog.tsx:253`, `:282`, `:402`, `:431`, `:551`, `:573` | Card per line under `md`; error under the field. |
| V12 | M | Inventario's first fold shows only names and SKUs; stock and status are hidden. | `modules/inventory/components/products-tab.tsx:72`, `:93` | Bring stock and status into the first line. |
| V13 | M | The Clientes "Condiciones" column is clipped. | `modules/customers/components/customers-table.tsx:42` | Put conditions under the name. |
| V14 | M | Supplier order tables also need 860 px. | `modules/inventory/forms/order-table.tsx:89`, `modules/inventory/forms/order-detail-dialog.tsx:70` | Same stacked layout. |

### 4.4 Legibility

| ID | Sev | Problem | Where | Proposed fix |
| --- | --- | --- | --- | --- |
| V15 | H | Form field borders are nearly invisible: `#e8e1e3` on white, about 1.3:1. | `modules/inventory/components/form-controls.tsx:6`, `modules/counter/components/form-controls.tsx:6` | Use the store's `#9c8f92` (3:1). |
| V16 | H | Three of the five most used muted text colours fall below 4.5:1 on white: `#907e84` 3.82, `#9c898f` 3.29, `#89747b` 4.33. Worse outliers: `#a08f95` 3.06, `#b1a0a6` 2.49. | 57 uses in total; e.g. `components/layout/app-topbar.tsx:20`, `:29` | One muted text token at 4.5:1 or better. |
| V17 | M | Dialog descriptions and 11 px hints sit near 3.2:1. | `modules/inventory/components/inventory-dialog.tsx:72`, `modules/counter/components/counter-dialog.tsx:46`, `modules/pricing/forms/product-prices-dialog.tsx:153`, `modules/inventory/components/form-controls.tsx:21` | Same muted token. |
| V18 | M | Base buttons and inputs are 32 px tall, below the 44 px touch target. | `components/ui/button.tsx:26`, `components/ui/input.tsx:20` | 44 px default on touch surfaces. |

### 4.5 Component system

| ID | Sev | Problem | Where | Proposed fix |
| --- | --- | --- | --- | --- |
| V19 | H | Four dialog shells with different padding, close placement and footers: Cancel left, right cluster, or no Cancel at all. | `modules/inventory/components/inventory-dialog.tsx:33`, `:117`; `modules/catalog/components/catalog-modal.tsx:27`; `modules/customers/components/customer-modal.tsx:26`; `modules/counter/components/counter-dialog.tsx:24`; `modules/cash/components/cash-movement-dialog.tsx:66` | One shell, one footer rule. |
| V20 | M | "Nuevo cliente" uses 1,080 px for three fields and leaves half the box empty. | `modules/customers/forms/customer-form-dialog.tsx:65` | Standard width; conditions below. |
| V21 | M | In "Nuevo producto" section labels take a grid cell alone, so "IDENTIDAD" sits over an empty column. | `modules/catalog/forms/product-form-dialog.tsx:52-54` | Section title as a full-width row. |
| V22 | M | Four button families with different heights and radii: `ActionButton`, `CatalogButton`, `CustomerButton`, `st-btn`. | `modules/inventory/components/action-button.tsx`, `modules/catalog/`, `modules/customers/`, `modules/store/styles/store.css` | One button with variants. |
| V23 | M | Four reds and an amber mean "alert": `#b26357`, `#c35850`, `#c65956`, plus the stock badge amber. | `modules/warehouses/components/warehouse-card.tsx:20`, `modules/inventory/components/info-blocks.tsx:45`, `:106`, `modules/inventory/components/movement-table.tsx:85`, `modules/inventory/components/warehouse-summary.tsx:86`, `modules/inventory/components/stock-badge.tsx:8` | One danger and one warning token. |
| V24 | M | Status is a pill everywhere except Clientes, where it is grey text. | `modules/customers/components/customers-table.tsx:66` | Same pill. |
| V25 | M | "Importar CSV" uses an off-palette yellow chip and the browser's native file input. | `modules/product-import/components/import-csv-dialog.tsx:201`, `:264` | Plum-tint chip; styled file button. |
| V26 | L | Inicio shows the date as "2026-11-12"; tables show "10 nov 2026". | `modules/overview/components/overview-page.tsx` | One date format. |
| V27 | L | In Configuración the role is folded into the warehouse chip and a user with no warehouse shows an empty cell. | `modules/access/components/users-section.tsx` | Separate role column; "Sin almacén" text. |

### 4.6 Store

| ID | Sev | Problem | Where | Proposed fix |
| --- | --- | --- | --- | --- |
| V28 | M | A solid raspberry "+" on every presentation dilutes the action colour. `DESIGN.md` already lists it as not canonized. | `modules/store/components/product-card.tsx:86`, `modules/store/styles/store.css:368-377` | Tinted outline at rest; solid once added. |
| V29 | M | Dialog loading states are bare text ("Cargando…") in empty boxes. | `modules/counter/components/order-view-dialog.tsx`, customer detail dialog | Skeleton rows. |

## 5. Measured evidence

| Check | Result |
| --- | --- |
| Detector | 161 advisory findings: 148 font sizes off the documented scale, 7 radii, 6 colours |
| Hard-coded hex colours in `.tsx` | 143 distinct values in 505 uses across 100 files; 15 match a defined token |
| Arbitrary font sizes | 25 distinct (13 px ×68, 11 px ×34) |
| Border radii | 14 arbitrary values plus 8 named steps |
| Tables wider than 700 px | 5, all in supplier order and reception forms |
| Icon-only buttons without a label | None confirmed |

## 6. Not confirmed

| Item | Where | What is missing |
| --- | --- | --- |
| The TanStack devtools button covers "Ver pedido" on Mostrador and "Ver hoja" in the store. | `routes/__root.tsx:98` (mounted unconditionally) | Whether the production build removes it. |
| The active Inventario tab shows a heavy purple box that reads as an error. | `components/ui/tabs.tsx:69` | May be the focus ring left by the automated click. |
| `/tienda/pedidos` on phone seems to leave a bare strip on the right. | `modules/store/components/orders-page.tsx` | Check for horizontal overflow. |

## 7. Recommended order

1. **Component base** (V15–V19, V22, V23): one dialog shell, one button, one field border, alert and text tokens. Fixes contrast, touch targets and consistency everywhere at once.
2. **Cash drawer and prefilled forms** (F1–F6): the most frequent tasks; small, isolated changes.
3. **Silent effects** (F14–F19, B1): can produce wrong data unnoticed.
4. **Phone layout** (V9–V14).
5. **Inventario structure and glossary** (F24, F31–F36): cheaper before production than after staff are trained.
6. **Business decisions first** for R1 and R3.
