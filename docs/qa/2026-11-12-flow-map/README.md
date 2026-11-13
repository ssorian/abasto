# Abasto web — product and money flows, screen by screen (2026-11-12)

Handoff package for a UX/product review. It maps every product-lifecycle and money use case to the screen, dialog and screenshot where it happens, and states the business rule behind it. The reviewer should suggest general improvements: flow friction, clarity, missing states, consistency, and gaps in the use cases themselves.

**What is in this folder**

| Item | Content |
| --- | --- |
| `README.md` | This map |
| `shots/` | 102 PNG screenshots: desktop 1600×1000 unless the name says `telefono` (433×937) or `completo` (full page) |

**How the screenshots were taken**

- App: `abasto-web` at commit `fix/client-feedback-nov12` merge plus uncommitted inventory changes (standalone write-off dialog removed). `abasto-mobile` is out of scope: it is a static demo with no data.
- Data: local seeded development database, not production.
- Roles: owner (`Dueño`, all warehouses), warehouse manager (`Encargado`, Laura Méndez, warehouse **Centro**), store customer (Minisúper El Güero). There are no cashier or rider logins: managers run the counter, and riders are records without accounts.
- File prefixes: `owner-` owner, `mgr-` manager, `store-` customer storefront, `all-` shared.
- UI copy is Spanish (Mexico). Labels below are quoted exactly as they appear.

## 1. App map

| Route | Screen | Who | Main use cases |
| --- | --- | --- | --- |
| `/login` | Sign in | everyone | Staff login. `all-00` |
| `/` | Inicio | owner, manager | Day overview: sales, gross profit, open orders, drawer status per warehouse, expiring lots. `owner-01`, `mgr-01` |
| `/catalogo` | Catálogo | owner (edit), manager (prices) | Products, suppliers, CSV import, cost and prices |
| `/inventario` | Inventario, tabs `Productos`, `Entradas`, `Por recibir`, `Saldos`, `Movimientos`, `Conteos`, `Traslados` | owner, manager | Stock, lots, supplier orders, reception, supplier balances, counts, transfers |
| `/mostrador` | Mostrador + `Caja` panel | owner, manager | Counter orders, cash payment, cash drawer |
| `/repartos` | Repartos | manager | Rider assignment and settlement |
| `/clientes` | Clientes | owner | Customers, commercial rules, store access |
| `/reportes` | Reportes | owner (all), manager (own warehouse) | Sales, margin, cash cuts, CSV export |
| `/almacenes` | Almacenes | owner | Warehouses. `owner-70` |
| `/configuracion` | Configuración | owner | Users and warehouse assignment. `owner-71` |
| `/tienda`, `/tienda/entrar`, `/tienda/pedidos` | Storefront | public, customer | Browse, build a pick list, reserve, own orders |

## 2. Product lifecycle

### 2.1 Entry into the catalog

| # | Use case | Where | Screenshots | Rule in code |
| --- | --- | --- | --- | --- |
| P1 | Browse catalog per warehouse | `/catalogo` | `owner-10`, `mgr-81` | Shows published and paused counts; prices are the selected warehouse's |
| P2 | Create product | `/catalogo` → `Nuevo producto` | `owner-11` | Owner only. SKU unique (case-insensitive); amounts ≥ 0; discount + promotion ≤ list cost; image is an external URL only (no upload) |
| P3 | Edit product, pause/resume | card `Editar`, tab `Datos del producto` | `owner-12` | Pause = status select `Publicado`/`Pausado`. Paused products cannot be ordered. **There is no delete or archive** |
| P4 | Presentations and barcodes | same dialog, tab `Presentaciones y códigos` | `owner-13` | Factor ≥ 1, unique barcode, exactly one default presentation |
| P5 | Suppliers | `Proveedores` | `owner-14` | — |
| P6 | Bulk CSV import | `Importar CSV` (3 steps) | `owner-15` (step 1 only) | One transaction per row; saves product, price and stock minimum |
| P7 | Supplier cost and sale prices | card `Precios` | `owner-16`, `mgr-82` | Cost per piece (4 decimals) applies to all warehouses; sale price is per warehouse and presentation; a presentation without its own price is derived from the default one (`Derivado` vs `Propio`); shows margin |
| P8 | Price history | history icon in `Precios` | `owner-17` | Prices are append-only history |

### 2.2 Stock in (supplier)

| # | Use case | Where | Screenshots | Rule in code |
| --- | --- | --- | --- | --- |
| S1 | New supplier order | `/inventario` → `Nuevo pedido` | `mgr-50` | Does not move stock; waits in `Por recibir` |
| S2 | Discount an open shortage on the new order | same dialog, block `Faltantes por reponer`, button `Descontar` | `mgr-59`, `mgr-60`, `mgr-61` | Footer shows `Total neto − Descuentos por faltantes = A pagar`. The discount is recorded when the order is **registered**, before it is received |
| S3 | Pending orders | tab `Por recibir` | `owner-22`, `mgr-51` | Row actions `Ver detalle`, `Recibir`, `Cancelar` |
| S4 | Cancel supplier order | `Cancelar` | `mgr-52` | Only in status `Pedido` |
| S5 | Receive order | `Recibir` → `Confirmar recepción` | `mgr-53`, `mgr-54`, `mgr-55` | Per line: cost correction, missing boxes, damaged/expired boxes, expiry date or `Sin caducidad`; unordered items under `Llegó sin pedirlo`. Creates lots and purchase movements. Missing → `Por reponer`; damaged → `Por devolver` (not stock). Order closes and can no longer be edited |
| S6 | Supplier balances | tab `Saldos` | `owner-23`, `mgr-56` | Sections `Por reponer`, `Por devolver`, and a history table |
| S7 | Return damaged boxes | `Marcar como devuelto` | `mgr-57` | Resolution `Las repuso` or `Descuento` |
| S8 | Receipt history | tab `Entradas` | `owner-21` | — |

### 2.3 Stock maintenance

| # | Use case | Where | Screenshots | Rule in code |
| --- | --- | --- | --- | --- |
| M1 | Stock list | tab `Productos` | `owner-20`, `mgr-20`, `mgr-91` (phone) | Filters `Stock bajo`, `Sin existencias` |
| M2 | Lots of a product | row `Lotes` | `mgr-21` | FIFO by expiry; per-lot actions |
| M3 | Positive adjustment | `Sumar existencias` | `mgr-23` | Non-zero integer, reason required |
| M4 | Stock minimum | row `Mínimo` | `mgr-24` | ≥ 0, per product and warehouse |
| M5 | Physical count | `Hacer conteo` | `mgr-62`, history `owner-25` | Blind count: the difference is applied to lots and logged |
| M6 | Transfers between warehouses | tab `Traslados` → `Nuevo traslado` | `owner-26`, `mgr-63`, `mgr-64` | Send, receive (`Recibir con diferencia`), cancel |
| M7 | Movement ledger | tab `Movimientos` | `owner-24`, `mgr-27` | Append-only: purchase, adjustment, loss, count, sale, transfer |

### 2.4 Stock out

| # | Use case | Where | Screenshots | Rule in code |
| --- | --- | --- | --- | --- |
| O1 | Counter order (reserve) | `/mostrador` → `Nuevo pedido` → `Reservar pedido` | `mgr-31`, `mgr-32`, `mgr-33`, `mgr-41` | Reserves stock FIFO for 48 h and freezes prices. Only published products; expired lots are never allocated |
| O2 | Order detail | `Ver pedido` | `mgr-35`, `owner-36` | Shows list price, final price, applied customer rule, lots |
| O3 | Prepare | `Preparar` | `mgr-36` | Reservado → Preparado |
| O4 | Pickup with payment | `Entregar (recoge el cliente)` → `Cobrar y entregar` | `mgr-37` … `mgr-40` | See money M-IN-1 |
| O5 | Cancel order | `Cancelar pedido` → `Sí, cancelar pedido` | `mgr-42`, `mgr-43` | Only Reservado/Preparado; releases the reservation. A picked-up order cannot be cancelled |
| O6 | Expiry of unpicked orders | automatic, no screen | status `Vencido` in `mgr-30` | Releases the reservation |
| O7 | Rider delivery | `/repartos` → `Nuevo reparto` | `mgr-70` … `mgr-73` | Stock leaves the warehouse "en ruta"; not sold until settled |
| O8 | Cancel rider delivery | `Cancelar` | `mgr-74` | Only while en ruta |
| O9 | Loss / shrinkage | `Lotes` → `Quitar existencias` | `mgr-22`, `mgr-25`, `mgr-26` | Reason `Pérdida: vencido`, `Pérdida: dañado`, `Otro motivo`; quantity in presentation and loose pieces; cannot remove reserved units. This replaces the removed standalone write-off |
| O10 | Storefront reserve | `/tienda` → `Agregar a la hoja` → `Revisar y apartar` | `store-01` … `store-07`, `store-04` (phone) | Customer sees own prices; pays at pickup in the warehouse |
| O11 | Customer's orders | `/tienda/pedidos` | `store-09` | Customer can `Cancelar apartado` |

## 3. Money

All money lives in one cash drawer per warehouse (`cash_sessions`) and its append-only movements (`cash_movements`, integer cents). Only cash is accepted.

### 3.1 Money in

| # | Use case | Where | Screenshots | Rule in code |
| --- | --- | --- | --- | --- |
| M-IN-1 | Counter sale payment | `Cobrar y entregar` | `mgr-37`, `mgr-38` (short: `Faltan $24.00 para cubrir el total.`, button disabled), `mgr-39`, `mgr-40` (`Total`, `Efectivo recibido`, `Cambio`) | Cash only, drawer must be open, tendered ≥ total. Posts one `sale` for the total; change is stored on the row, not as a movement. Stock leaves in the same transaction |
| M-IN-2 | Rider settlement | `Liquidar` → `Liquidar reparto` | `mgr-75`, `mgr-76` (`Faltante $118.00`), `mgr-77` | Returned goods go back to stock; the rest is sold at the prices frozen at assignment. Cash handed in enters the drawer; the difference is a `rider_difference` movement. Needs an open drawer |
| M-IN-3 | Manual cash entry | `Caja` → `Entrada` → `Registrar entrada` | `mgr-44`, `mgr-45` | Amount > 0, reason required |
| M-IN-4 | Opening float | `Abrir caja` | `mgr-88`, `mgr-89` | ≥ 0; one open drawer per warehouse |

### 3.2 Money out

| # | Use case | Where | Screenshots | Rule in code |
| --- | --- | --- | --- | --- |
| M-OUT-1 | Cash withdrawal | `Retiro` | `mgr-46` | Reason required; cannot exceed expected cash |
| M-OUT-2 | Supplier payment | **no screen** | — | Not recorded anywhere: purchases store cost and discount, not payments or what is owed |
| M-OUT-3 | Supplier shortage discount | `Descontar` in supplier order | `mgr-60` | Lowers the amount to pay on the new order; no cash movement |
| M-OUT-4 | Customer refund | **no screen** | — | Not possible: picked-up orders cannot be reversed; only an unlinked manual withdrawal |
| M-OUT-5 | Expenses | **no screen** | — | Not modeled |

### 3.3 Drawer lifecycle

| Step | Where | Screenshots | Rule |
| --- | --- | --- | --- |
| Open | `Abrir caja` | `mgr-88` | Manager |
| Closed state | `Caja · cerrada — Ábrela para poder cobrar pedidos.` | `mgr-86` | Counter payment and rider settlement are blocked |
| Blind close | `Cerrar caja` | `mgr-47`, `mgr-85`, `mgr-86` | Cashier types counted cash; server computes expected and difference. No manager approval |
| History / cuts | `Historial` | `owner-35`, `mgr-87` | Opening, close, sales, expected, counted, difference, note |
| Reports | `/reportes` | `owner-60`, `owner-61`, `owner-62`, `mgr-80` | Sales, gross margin, cash cuts, CSV |

### 3.4 How a sale price is computed

1. Default presentation: the sale price of the oldest sellable lot. Other presentations: the warehouse price (`presentation_prices`), or derived from the default by factor.
2. Customer commercial rule (set in `/clientes`, `owner-43`): the rule with the highest minimum quantity reached wins; either a fixed price or a percentage discount (half-up to the cent).
3. Prices freeze at reservation. Margin = revenue − lot cost per unit received.

## 4. Customers and access

| Use case | Where | Screenshots |
| --- | --- | --- |
| List, status, conditions | `/clientes` | `owner-40`, `mgr-83` |
| New customer | `Nuevo cliente` | `owner-41` |
| Detail and order history | `Ver cliente` | `owner-42` |
| Edit customer and commercial rules | `Editar cliente y condiciones` | `owner-43`, `owner-43b` (full page) |
| Give store access | `Dar acceso a la tienda` (email + password typed by the owner) | `owner-44`, `owner-45` |
| Store login | `/tienda/entrar` | `store-03` |

## 5. Facts the reviewer should know

Confirmed in code or while capturing; they are input for the review, not suggestions.

1. **No supplier payables.** The system knows what goods cost, not what was paid or is owed.
2. **No refunds or sale reversals.** Corrections are manual cash movements not linked to the order.
3. **No product delete or archive**, only pause.
4. **Expired lots** are never sold, but stay in stock until someone records a `Pérdida: vencido` by hand.
5. **Two price sources** for one product: lot price for the default presentation, warehouse price for the rest.
6. **Blind close shows no result.** The close dialog says "Al cerrar verás lo que esperaba el sistema y la diferencia", but after closing only a toast `Caja cerrada.` appears (`mgr-86`); expected and difference are visible only in `Historial` (`mgr-87`).
7. **Insufficient cash** disables `Cobrar y entregar` and shows the missing amount (`mgr-38`).
8. **Shortage discount** is booked when the supplier order is registered, not when it is received or paid (`mgr-56` history shows `Descontado en un pedido` immediately).
9. **Rider settlement** asks for returned boxes and loose units separately and computes sold value and difference live (`mgr-76`).
10. **Phone layout**: console screens on a phone in `mgr-90`, `mgr-91`; storefront in `store-04`.

## 6. Not captured

| Item | Reason |
| --- | --- |
| CSV import steps 2–3 | Needs a file upload |
| Store reservation confirmation and an order in `/tienda/pedidos` | The confirm step after `Revisar y apartar` was not completed; `store-09` shows the empty list |
| Physical count, transfer and return submitted | Dialogs captured; not submitted |
| Transfer reception with difference | No transfer addressed to Centro |
| `Saldos` → `Historial` dialog | Locator failed; the history table is visible inline in `mgr-56` |
| Manager history of cash before this session's close | Only this session's close appears in `mgr-87` |
| Mobile app | Out of scope (static demo) |

## 7. Data created while capturing (local development DB only)

Counter order PED-599A096E (reserved, prepared, picked up, $524.00 paid with $600.00); counter order PED-D15CD80D (cancelled); cash entry $200.00; loss of 1 unit of Agua Ciel 1 L (`dañado`); Alpura order received with 1 box missing; new Alpura order with that shortage discounted; rider delivery to Juan Pérez settled with a $118.00 shortage; Centro drawer closed with a test count of $1,000.00 (hence the large shortage in `mgr-87`) and reopened with $500.00; store access for Minisúper El Güero (`guero@abasto.local`).

## 8. Suggested prompt for the reviewer

> You are reviewing a wholesale grocery distribution web app (Spanish UI, Mexico). Read `README.md`, then look at the screenshots in `shots/` in the order of sections 2–4. For each flow, judge: number of steps and decisions, clarity of copy and state, error and empty states, consistency across screens, and risk of operator mistakes with money or stock. Treat section 5 as known facts. Return: (1) the top 10 improvements ranked by impact on daily operation, each with screenshot references; (2) gaps in the use cases themselves (missing flows such as supplier payments or refunds) with a short proposal; (3) quick wins that change only copy or layout. Do not propose changes to business rules without stating the trade-off.
