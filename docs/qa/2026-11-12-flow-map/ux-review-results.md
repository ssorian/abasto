# UX review results (2026-11-12)

Outcome of the flow-by-flow review of this folder's `README.md`. Branch `feat/ux-flow-review`; specs and evidence live in `odd/tasks/ux-flow-review.md` (S1–S54, Log L1–L20).

**Who decided what**

- Flows 1–2: the owner decided (Log L2, L6).
- Flows 3–12: the agent decided under the owner's overnight permission (L7). Every agent decision is marked "agent decisions" in the spec and can be reverted per commit.

## What changed, by flow

| Flow | Main changes | Commit |
| --- | --- | --- |
| 1 Login + Inicio | Inicio leads with "Requiere atención": expired lots (red), closed drawers, orders expiring today, lots about to expire, products below minimum; duplicates and zero rows removed; long date; "Encargado" label; login brand and password toggle | `ccd54d9` |
| 1 Inicio actions | "Quitar" opens the lot's removal in Inventario; "Pedir" opens a supplier order with supplier, warehouse and product set | `7c8443b` |
| 2 Catálogo | Remembered Tabla/Tarjetas toggle; notes shown once; derived prices as placeholders; history icon only with history; Spanish CSV picker | `98201b4` |
| 2 Nuevo producto | Cost, discount, promotion and sale price captured at creation, saved in one transaction | `1c4ce26` |
| 2 Archivar | Owner archives/restores products (additive column `products.archived_at`); refused with stock, reservations or open work | `49fd66c` + T6b |
| 3 Proveedor | One "Nuevo pedido" entry point; tab badges; sticky footers; reception without sideways scroll; compact balances and entries | `4056c68` |
| 4 Stock | Searchable product pickers; "Mínimo" from its row; expired-lot removal prefilled; parallel inventory loading; Esc closes the picker list first | `d0eb053` |
| 5 Mostrador | Order opens after reserving; "Por atender" default with counts; quick cash amounts; red cancel; rule columns only when used; searchable customer | `7002db9` |
| 6 Caja | Close result shown (expected, counted, difference); "Cerrar caja" secondary; available cash on withdrawals; last count hint; colored differences | `b67afa2` |
| 7 Repartos | Says why "Nuevo reparto" is unavailable; warns about a closed drawer before settling; "Exacto" amount; searchable product; SKU search | `db1d40a`, `ed1c20a` |
| 8 Clientes | Status badges and "Tienda" column; app validation, password generator and copyable access; searchable rule presentation; tidier form | `abe7535` |
| 9 Tienda | Stepper bar removed; "Entrar" everywhere; password toggle; "Pasa por él antes de …" and "Mis pedidos" link | `51fab6d` |
| 10 Reportes, Almacenes, Configuración | See T14 in the spec | T14 |
| 11 Teléfono | See T15 in the spec | T15 |

## Use-case gaps: proposals (not built)

These touch money and need the owner's rules before any code. Each proposal names its trade-off.

### Supplier payables (README fact 1, M-OUT-2)

- **Proposal:** a supplier order gets an "A pagar" balance when received (net total minus shortage discounts). A "Pagar a proveedor" action records a payment, either from the drawer as a cash movement or as "pagado fuera de caja". A "Por pagar" section goes in the Saldos tab.
- **Trade-off:** paying from the drawer lowers expected cash, so closes stay exact. But the drawer is per warehouse while suppliers are global, so you have to pick the drawer.
- **Decision needed:**
  - Are supplier payments cash only?
  - Can they be partial?

### Customer refunds and returns (fact 2, M-OUT-4)

- **Proposal:** "Devolver" on a picked-up order (within N days). It returns chosen lines to stock (to a lot or as a loss) and posts a refund cash movement linked to the order.
- **Trade-off:** it reopens a closed order. Reports must subtract refunds from sales of the original day or of the refund day.
- **Decision needed:**
  - What is the time limit?
  - Do returned goods go back to sellable stock?
  - Which day does the refund count against?

### Expenses (M-OUT-5)

- **Proposal:** "Gasto" as a third cash movement type, beside Entrada and Retiro, with a category (fuel, wages, services). It shows in Reportes as operating expenses, so net profit = gross profit − expenses.
- **Trade-off:** the categories must be agreed. Expenses paid outside the drawer would need a non-cash entry.

### Other gaps found during the review

- **Configuración:** users cannot be deactivated, and passwords cannot be reset by the owner.
- **Rider settlement:** a shortfall is recorded but there is no follow-up ("cobrar al repartidor").
- **Expired lots:** they now surface on Inicio with a one-tap removal. An automatic "Pérdida: vencido" at close of day remains an option, but it changes stock without a person confirming it.

## Not verified

- Visual checks were done in the browser for Inicio, Catálogo, Inventario (Por recibir, recepción, conteo), Repartos, Clientes, Mostrador and Tienda.
- They were not done for every dialog state, and no money operation was submitted against the dev database.
- The dev database received one schema change: the additive migration `0033_product_archive`.
