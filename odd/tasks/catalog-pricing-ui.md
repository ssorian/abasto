# Catalog card, Edit and Prices dialogs

Objective: separate what the product is (Editar) from what it costs and sells for (Precios). The catalog card keeps two actions; one Prices dialog holds supplier cost per piece and the standard sale price per warehouse, and the supplier order row reuses it. Branch `feat/catalog-pricing-ui` (from `main` 7e7c3c0).
Test runner: `bun test` in `abasto-web` against the isolated test database (`bun run db:up`).

## Specs

- S1: Two buttons — "ocupo un solo boton de editar y un boton de precios". The catalog card shows only "Precios" and "Editar" as actions (plus the existing "Consultar inventario" link). "Presentaciones y códigos" and "Pausar/Publicar" stop being card buttons; both live inside Editar (Estado comercial select already exists).
- S2: Prices dialog content — "en el boton de precios viene el precio de venta unitario y por caja y el costo unitario al igual que el descuento y promocion". One dialog (the existing "Cambiar precios" dialog, extended): supplier cost section (price per piece, fixed discount, promotion; 4 decimals; derived net cost per piece and per box shown read-only; global for the product) and standard sale price per piece and per box for the selected warehouse (as today). Discount + promotion above the price per piece is rejected with "El descuento y la promoción no pueden superar el precio por pieza." Sale below net cost shows a non-blocking warning.
- S3: Card shows piece cost above prices — "en la tarjeta de catalogo no metas costo neto por caja solo deja costo de pieza y dejalo arribita de los precios." The card shows the net cost per piece (one line) right above the standard price rows; no cost per box on the card.
- S4: Edit dialog is identity only — the "Costo del proveedor" amounts leave "Editar producto" (supplier code stays); presentations and codes are edited inside the same Edit dialog (section). Saving Edit never overwrites the cost amounts.
- S5: Order row reuse — the supplier order row's pencil opens the same Prices dialog instead of the "Costo por pieza" dialog (parent proposal accepted with "Osea si"); saving recalculates the row and keeps typed boxes.
- S6: Checks — pure logic covered by `bun test`; `bunx eslint src`, prettier on touched files, `bunx tsc --noEmit`, `bun run build` green; Playwright check on the user's dev server :3000 (never start another server), restoring any edited value.

Parent assumption: "Osea si" answered the open question with the sketched option — sale price edited for the selected warehouse via the existing selector, not all warehouses at once.

## Tasks

- T1 [S1,S2,S3,S5,S6] worker A — Prices dialog with cost section, card layout and buttons, catalog page wiring, order row reuse. Status: in_progress.
- T2 [S1,S4,S6] worker B — Edit dialog identity-only with embedded presentations, edit patch without cost amounts. Status: in_progress.
- T3 [S6] parent — Playwright check on :3000. Status: pending.

## Log

- L1 (user, screenshots of "Editar producto" and the catalog card): "Necesito que pulas la ui y donde va cada cosa ... ocupo un solo boton de editar y un boton de precios, en el boton de precios viene el precio de venta unitario y por caja y el costo unitario al igual que el descuento y promocion. Como quedaria?"
- L2 (parent proposal): card [Precios] [Editar]; Edit = identity + status + presentations + supplier code; Prices = cost (global) on top, sale price per warehouse below with margin and below-cost warning; order pencil opens Prices.
- L3 (user): "Osea si, pero en la tarjeta de catalogo no metas costo neto por caja solo deja costo de pieza y dejalo arribita de los precios."
