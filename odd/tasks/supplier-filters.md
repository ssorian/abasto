# Supplier filters across catalog, inventory and reports

Objective: catalog, inventory and reports can be filtered by supplier (Grupo Lala, Alpura); brand stays free text. Branch `feat/supplier-filters` in worktree `/home/onix/Projects/Abasto-supplier-filters` (from 5256196; another session owns `feat/online-store` in the main worktree).
Test runner: `TEST_DATABASE_URL=postgresql://abasto:abasto@localhost:55451/abasto_filters_test bun test` in `abasto-web` (own test database: the shared `abasto_test` is truncated by the other session's runs).

## Specs

- S1: Supplier is the filter dimension — "Quiero la adicion horizontal de filtros por marca o proveedor, la idea es que tanto inventario, catalogo y sobre todo reportes puedan ser filtrables por marca o proveedor, en este caso tenemos lala y alpura"; user choice "A. Solo proveedor (recomendado)". The filter uses `products.supplier_id`; brand stays free text and gets no filter. Options: "Todos los proveedores" (default, no filter) plus every supplier by name (inactive ones marked "(inactivo)"). Products without a supplier only appear under "Todos los proveedores". The filter combines (AND) with the existing search, warehouse and status filters.
- S2: Catalog — the catalog toolbar gets a supplier select; the product grid shows only that supplier's products. Empty result shows the existing empty state.
- S3: Inventory — the Productos tab gets a supplier select next to the search and status filters; the stock list shows only that supplier's products. The tabs that are already per supplier (Por recibir, Saldos) are unchanged.
- S4: Reports — "sobre todo reportes". A supplier filter in the report filters bar, stored in the URL as `proveedor=<supplierId>` (absent = all). It applies to the Ventas tab (every aggregate: totals, by day, by product, by customer, by warehouse count only lines of that supplier's products) and the Inventario tab (expiring lots and low stock only for that supplier's products). Cajas and Cartera are per cash register / per customer and ignore it (the select is hidden there). An unknown supplier id yields empty results, never an error.
- S5: Add suppliers — "en el catalogo deberiamos agregar una opcion para agregar proveedores o marcas". Already present: the catalog "Proveedores" button (owner only) creates, edits and activates/deactivates suppliers. New suppliers appear in every supplier filter without code changes.
- S6: Checks — server filters covered by `bun test` through the public service interface (`getSalesReport`, `getStockAlerts`); client filters covered by unit tests of the pure filter helpers; `bun run web:lint`, `bun run web:check`, `bun run web:build` stay green.

## Tasks

- T1 [S1,S2,S3,S6] worker — Shared supplier select + client filters in Catalogo and Inventario > Productos. Status: done. Commit: 3003a00 (RED 6 fail; GREEN 16/16 filter tests; stock rows resolve supplier via the page's product map, stock read untouched)
- T2 [S1,S4,S6] worker — Reports: `proveedor` URL param, `supplierId` input threaded to `getSalesReport` and `getStockAlerts`, select in report filters (Ventas, Inventario). Status: done. Commit: ca3b2f5 (RED 4 fail; GREEN 38/38 reports; supplier id compared as text so unknown/malformed ids return empty; supplier list behind managedWarehouses)
- T3 [S5] parent — Confirm the existing suppliers dialog covers S5. Status: done (create/edit/active in `catalog/forms/suppliers-dialog.tsx`). Commit: —

## Log

- L1 (user): "Quiero la adicion horizontal de filtros por marca o proveedor, la idea es que tanto inventario, catalogo y sobre todo reportes puedan ser filtrables por marca o proveedor, en este caso tenemos lala y alpura, en el catalogo deberiamos agregar una opcion para agregar proveedores o marcas."
- L2 (user): "A. Solo proveedor (recomendado)" — filter by supplier only; brand stays free text.
- L3 (user): "Worktree hermano (recomendado)" — work in `/home/onix/Projects/Abasto-supplier-filters`, branch `feat/supplier-filters` from 5256196.
- L4 (parent): own test database `abasto_filters_test` created on the db-test container; baseline 708/708 green.
- L5 (parent decisions): products without supplier only under "Todos"; inactive suppliers listed and marked; Cajas/Cartera ignore the filter.
- L6 (parent, close): full suite 722/722 on abasto_filters_test; `lint` 0 errors (2 pre-existing warnings in components/ui/sidebar.tsx); `check` fails only on 27 pre-existing unformatted files, touched files pass Prettier; `build` green. Browser not tested.
