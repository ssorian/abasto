# Piece-based supplier cost

Objective: the piece is the base unit of supplier cost; list price per piece, fixed discount and promotion live on the catalog product, and an order line only takes boxes, everything else derived. Supersedes supplier-orders S2/T6 (gross line cost input). Branch `feat/piece-cost` (stacked on `feat/rider-assignments`).
Test runner: `bun test` in `abasto-web` against the isolated test database (`bun run db:up`).

## Specs

- S1: Piece is the base unit — "la unidad base no es la caja, es la pieza, la pieza define el costo y derivados de absolutamente todo". User choice "Solo costo": list price per piece − fixed discount − promotion defines net cost per piece, per box (× pieces per box), per line and per lot. Sale (standard) prices stay per box/presentation as today.
- S2: Configured in the catalog — "ademas es configurable desde el catalogo". The product stores the list price per piece (4 decimals, ten-thousandths of a peso) next to fixed discount and promotion; editable in "Editar producto". Reject discount + promotion above the list price.
- S3: Order input is boxes only — "eso deja que cuando se vaya a hacer un pedido desde inventario ya no sea configurable el precio, el input solo son las cajas y lo demas es derivado." The order table has no price input; per row: boxes (input) and read-only price per piece, fixed discount, promotion, net cost per box, net line cost. The S4 warning (net cost per box above the standard price) stays. The order line snapshots list price, discount and promotion at creation (parent assumption): later catalog edits do not change existing orders or received lots.
- S4: Price dialog in the order — "tambien ahi mismo en el pedido quiero un dialog que permita configurar precio por pieza del producto y sus descuentos y hacer un guardado con persistencia si se edita." Each order row opens a dialog to edit the product's price per piece, fixed discount and promotion; saving persists to the catalog product and the row recalculates. Only users allowed to edit products.
- S5: Existing data — existing order lines keep their stored costs (nothing lost); received lots unchanged; products get their list price per piece from their most recent non-cancelled order line when available, else zero.
- S6: Checks — rules covered by `bun test` through the public service interface; rejected input leaves stored data unchanged; `bun run web:lint`, `bun run web:check` (touched files), `bun run web:build` stay green.

## Tasks

- T1 [S1-S6] explore — Map current cost model. Status: done (L4).
- T2 [S1,S2,S3 server,S5,S6] worker — Backend: product list price per piece (schema, migration with backfill, validation, product form), order lines from boxes only with snapshot. Status: done (e9e27b6; RED 59 failing → GREEN 874 pass / 0 fail).
- T3 [S3,S4,S6] worker — UI: order table boxes-only, price dialog with persistence. Status: pending.

## Log

- L1 (user): "Quiero cambiar algunas cosas de la logica de caluculo de costos, la unidad base no es la caja, es la pieza, la pieza define el costo y derivados de absolutamente todo, ademas es configurable desde el catalogo, eso deja que cuando se vaya a hacer un pedido desde inventario ya no sea configurable el precio, el input solo son las cajas y lo demas es derivado. tambien ahi mismo en el pedido quiero un dialog que permita configurar precio por pieza del producto y sus descuentos y hacer un guardado con persistencia si se edita."
- L2 (user choice): "Solo costo" — sale prices stay per box/presentation.
- L3 (parent): reverses supplier-orders L7/L9/S2/T6; order lines snapshot costs at creation.
- L4 (T1 explore): products.list_price_per_piece was dropped by 0019; purchase_lines stores gross_cost_cents (0020), list price derived on read (supplier-order-reads.ts:155). Latest migration 0025; next 0026, hand-edited SQL with inline backfill, snapshot + journal updated.
- L5 (parent design for T2):
  - products: add `list_price_per_piece integer not null default 0` (ten-thousandths), CHECK >= 0. Backfill: from the product's most recent non-cancelled purchase line (by purchase date/created, then line id) as half-up `gross_cost_cents*100 / quantity`; else 0.
  - Product service: `listPricePerPiece` joins `fixedDiscountPerPiece`/`promotionPerPiece` in amount validation (same message). New rule: on create, and on update when the patch touches any of the three amounts, reject discount + promotion > list price (merged with stored values) with "El descuento y la promoción no pueden superar el precio por pieza." Rejected input changes nothing.
  - purchase_lines: add `list_price_per_piece integer not null default 0` snapshot (CHECK >= 0 in supplier_amounts_min); backfill existing lines with half-up gross*100/quantity. Keep gross_cost_cents, now derived at creation: half-up(quantity × list / 100). total_cost_cents stays `netLineCents(gross, quantity, discount, promotion)`. Reads return the stored line list price (no derivation).
  - createSupplierOrder lines: `{ productId, boxes }` only (zod input too); any extra price field is ignored/rejected by the shape. Snapshot list/discount/promo from the product. Zero list price stays allowed (zero-cost line, existing flag). Net < 0 still rejected.
  - box-products / order product reads expose `listPricePerPiece` so the order UI can derive rows.
  - Product draft/form ("Editar producto" cost fieldset): add "Precio por pieza" field (4 decimals) before discount and promotion; update comments that say the list price is typed per order line.
  - Seed: products get their list price; order lines boxes only.
- L6 (T2 worker): commit e9e27b6. Covered S1, S2, S3 (server), S5, S6. RED: 59 failing in catalog/inventory/dashboard tests before implementation; GREEN: full `bun test` 874 pass, 0 fail; `eslint src`, prettier and `bun run build` clean. Migration 0026_piece_list_price applied with `bun run db:migrate` to the database in abasto-web/.env.local (remote, not the local docker `abasto` db): 27 migrations, 73 products (32 with list price), 52 lines (all with list price).
- L7 (T2 decisions): the order rejects net < 0 (legacy products with discounts and zero list) with "El descuento y la promoción no pueden superar el precio por pieza."; a derived gross above int4 gives "El pedido es demasiado grande."; `listPricePerPieceOf` replaced by `grossLineCents(quantity, listPrice)`. Order UI minimally adapted for T3: draft/table lose the cost input (`rowOf(product, boxesText)`, `OrderProduct.listPricePerPiece`).
- L8 (parent design for T3): the order row's pencil button opens a focused "Costo por pieza" dialog (price per piece, fixed discount, promotion — 4 decimals, same parse/validation messages as the product form, ABOVE_LIST_PRICE_MESSAGE) instead of the full product dialog; saving calls the existing product update with only those three fields, refreshes catalog data, and the row recalculates. Draft logic lives in a pure lib with tests. Shown only when canEditProducts.
