# Supplier and warehouse filters in Reportes

Objective: add supplier and warehouse filters to the rebuilt Reportes dashboards (owner and manager), applied server-side through the existing services. Branch `feat/report-filters` (from `main` 72643fc).
Test runner: `bun test` in `abasto-web` against the isolated test database (`bun run db:up`).

## Specs

- S1: Filters — "Creo que esta bien peroooooo, necesito filtros por proveedor y por almacen".
- S2: Owner dashboard — a warehouse filter (all warehouses, or one) and a supplier filter (all suppliers, or one: Grupo Lala, Alpura, …). Both apply to every card where they make sense: KPIs, trend and previous period, margin by product/supplier/warehouse, warehouse ranking, inventory value at cost, non-moving capital, stock alerts. Cash cuts follow only the warehouse filter (a cash session mixes suppliers); the card says so.
- S3: Manager dashboard — a supplier filter on sales, top products, stock alerts and pending supplier orders (when the order service supports it). The warehouse selector keeps the existing rule (only with two or more own warehouses, no "all" option).
- S4: Filters live in the URL (`almacen`, `proveedor`), survive reloads, and an unknown or malformed id yields an empty or refused result, never another scope: a manager can never filter into a warehouse they do not manage; the executive services stay owner-only (`requireOwner` before anything else) and validate a requested warehouse through `reportWarehouses`.
- S5: One source of truth — the executive services gain optional `warehouseIds`/`supplierId` inputs using the same `pickedUpLines` supplier/warehouse filters as the sales report; no copied SQL.
- S6: Checks — `bun test` green; tsc, eslint, prettier clean on changed files; `bun run web:build` OK.

## Tasks

- T1 [S1-S6] worker — service inputs + tests, server input schemas, loaders, search parsing, filter UI for both dashboards. Risk: item 2 (owner-guarded services and warehouse scoping gain new inputs). Status: in progress. Commit: —

## Log

- L1 (user): "Creo que esta bien peroooooo, necesito filtros por proveedor y por almacen"
- L2 (evidence, explore): `getSalesReport` and `getStockAlerts` already accept `warehouseIds`/`supplierId`; `getCashCuts` only `warehouseIds`; executive `getMarginReport`, `getWarehouseRanking`, `getInventoryValue`, `getNonMovingCapital` accept neither; the route parser drops `proveedor` and the owner has no `almacen`; `reportSuppliersFn` exists but is unused.
- L3 (parent decisions): owner warehouse filter is single-select with "Todos los almacenes"; cash cuts ignore the supplier filter with a visible note.
