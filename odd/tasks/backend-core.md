# Backend core

Objective: give `abasto-web` a real backend (Postgres + Drizzle + TanStack Start server functions) for a milk/soda warehouse that buys from suppliers and sells to authorized distributors. Branch `feat/backend-core`.
Delivery strategy: `ask-on-risk` with `chain_strategy=feature-branch-chain` (chained PRs into `feat/backend-core`; forecast well over 400 authored lines). Test runner: `bun test` in `abasto-web` against an isolated Postgres test database.

## Specs

- S1: Business model — "compran a un proveedor como alpura, lala, coca cola etc, y se lo venden a distribuidores autorizados, es decir, el almacen no se encarga de la logistica, tiene cierta cantidad de clientes distribuidores autorizados". Orders are picked up; no delivery/shipment flow, no sales channels, no "Público general" walk-in customer.
- S2: Payments — "solo manejan en efectivo" plus credit: "Creo que si fian asi que estaria bien mantener los creditos". Payment methods are cash only; credit sales create a customer balance paid down with cash payments (abonos). No card/transfer.
- S3: Credit limit — user choice: "Bloquea, el dueño autoriza (Recomendado)": a credit sale that exceeds the limit or whose customer has an overdue balance is blocked unless a user with the owner role authorizes it; the authorization is recorded (who, when).
- S4: Customers — user choice: "De toda la empresa (Recomendado)": a customer can buy and pay at any warehouse and has one single credit balance; the limit is checked against the total balance.
- S5: Pricing — "Me gusta tu recomendacion del punto 3". Accepted recommendation (quoted from the proposal): "Un precio de lista vigente por producto (y por presentación), con fecha de vigencia e historial. El costo queda en el lote, solo para calcular la utilidad real. Cuando entra una compra con costo nuevo, el sistema sugiere el precio nuevo según un margen objetivo y vos confirmás. Una pantalla de cambio masivo de precios (por proveedor o categoría, por porcentaje o monto), porque los cambian muy seguido."
- S6: Price per warehouse — user choice: "Por almacén". The list price is defined per warehouse and presentation; a bulk price change can target one, several or all warehouses in one operation; the purchase-cost price suggestion applies to the receiving warehouse; a transferred lot keeps its cost and sells at the destination warehouse price.
- S7: Warehouses and roles — "actualmente tienen 4, considero adecuado un sistema de roles para manejar cada almacen". Assumption (from the accepted plan): the owner sees and operates every warehouse; other users operate only the warehouses assigned to them, each assignment carrying a role (manager or counter clerk).
- S8: Orders — "suelen pedir por telefono y pasan despues" and user choice "El de cuando pidió (Recomendado)": an order reserves stock and freezes the quoted price; the reservation expires (duration configurable by the owner — assumption), releasing stock and requiring a new quote. Flow: Reservado → Preparado → Recogido, or Cancelado.
- S9: Suppliers and purchases — suppliers are an entity (Alpura, Lala, Coca-Cola…); a purchase records supplier, warehouse, date, lines, cost and expiry, and creates the lots.
- S10: Inventory integrity (accepted plan) — stock is derived from an append-only movement ledger; quantities in base units, money in integer cents; every stock/cash mutation runs in one database transaction.
- S11: Out of scope — "dejemos fuera por el momento envases retornables", "no hay facturas", and "En el repo hay una app mobile, ignorala por completo". Also removed from the UI as each module is wired: delivery/shipping, sales channels, card/transfer, "Público general", Promociones module.
- S12: Checks — domain rules covered by `bun test` through the public service/server-function interface against an isolated test database; `bun run web:lint`, `bun run web:check`, `bun run web:build` stay green for touched files.

## Tasks

Phase 1 — base
- T1 [S10,S12] inline — Local Postgres for dev/test, `bun test` harness with isolated test DB, Drizzle migrations. Status: in progress. Commit: —
- T2 [S7] inline + verify (security) — Better Auth on Drizzle; warehouses; user warehouse assignments with roles; permission policy and server guard; owner bootstrap. Status: pending. Commit: —
- T3 [S9] inline — Catalog backend: products, presentations (base-unit presentation required, factor immutable, unique/non-reserved barcodes, unique SKU), suppliers. Status: pending. Commit: —
- T4 [S7,S9,S11] inline — Login screen; wire Catálogo, Almacenes and supplier data to server functions; drop demo identity. Status: pending. Commit: —

Later phases (refined when reached)
- T5 [S9,S10] Inventory: purchases → lots, ledger, adjustments, losses, counts. Status: pending.
- T6 [S5,S6] Pricing: per-warehouse list price with validity/history, bulk change, margin suggestion. Status: pending.
- T7 [S1,S4,S8] Orders: reservation with frozen price and expiry, prepare, pickup, cancel; customer commercial rules. Status: pending.
- T8 [S2,S3,S4] Cash and credit: cash session per warehouse, cash collection, credit with block/owner authorization, abonos, overdue balances. Status: pending.
- T9 [S6,S10] Transfers between warehouses with shortages. Status: pending.
- T10 [S5] Reports: real margin, cash cut, low stock, expiring, receivables. Status: pending.

## Log

- L1 (2026-11-04) Original request: "Necesito que analicemos un poco los casos de uso, la app web sera un sistema de inventario y venta para un almacen de leche y refresco, actualmente tenemos buenas bases pero necesito todavia refinar lo que realmente nos puede servir en realidad, el modelo de negocio de el dueno de este almacen es sencillo, compran a un proveedor como alpura, lala, coca cola etc, y se lo venden a distribuidores autorizados, es decir, el almacen no se encarga de la logistica, tiene cierta cantidad de clientes distribuidores autorizados, solo manejan en efectivo, cambian muy seguido los precios de los productos y tambien los cambian en relacion a el costo de un pedido, la ui de la app actualmente creo que la maneja por lotes con un precio de entrada y un precio configurable de salida. Ademas de esto, que mas necesita esta app, actualmente estas reglas solo se ven reflejadas en la ui, no hay logica de backend aun, en base a eso evalua el producto y como cubre las necesidades basicas de la app. En el repo hay una app mobile, ignorala por completo solo es PoC, ellos por el momento no tienen la intencion de tener una app mobile ni nada por el estilo para contactar mas clientes ya que solo tienen clientes distribuidores autorizados."
- L2 (2026-11-04) User decisions: "1.- Me gusta tu recomendacion del punto 3, 2.- Creo que si fian asi que estaria bien mantener los creditos, dejemos fuera por el momento envases retornables, 4.- actualmente tienen 4, considero adecuado un sistema de roles para manejar cada almacen, no hay facturas, suelen pedir por telefono y pasan despues."
- L3 (2026-11-04) Answers: price per warehouse "Por almacén"; order price "El de cuando pidió (Recomendado)"; credit limit "Bloquea, el dueño autoriza (Recomendado)"; customers "De toda la empresa (Recomendado)".
- L4 (2026-11-04) "Si, arranca" — authorizes the phased backend plan starting with phase 1.
- L5 (2026-11-04) Evidence: `src/db/schema.ts` only holds the starter `todos` table; Better Auth has no database adapter; `.env.local` holds placeholder credentials (`role "username" does not exist` on localhost:5432); no test runner in `abasto-web`. RDD global on.
- L6 (2026-11-04) Answers: database "Docker Compose propio (Recomendado)" — own Postgres 17 on port 55450 with separate dev and test databases; delivery "Cadena sobre rama de feature".
