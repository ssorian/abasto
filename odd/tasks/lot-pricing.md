# Lot pricing and bulk stock entry

Objective: every lot carries its own entry cost and sale price per box; sales take the oldest lot first (FIFO) and charge that lot's price; the purchase entry becomes one list of all products. Branch `feat/lot-pricing`.
Test runner: `bun test` in `abasto-web` against the isolated test database (`bun run db:up`).

## Specs

- S1: Catalog price is a standard, not fixed — "los precios no son algo fijo, son mas bien una recomendacion o un precio standard que se puede ir modificando". The existing per-warehouse presentation price (`presentation_prices`) becomes the standard/recommended price; catalog labels say so.
- S2: Per-lot entry and sale price — "una caja de un producto puede entrar a 30 pesos y queremos dar su precio de salida a 34 de forma regular, pero tambien puede ser que un lote nuevo entre a 32 y se vende a 34 de igual forma, pero si un lote llega a 34 al entrar se puede configurar su precio de salida a 36 aunque el precio standard o recomendado sea 34." Confirmed: "Esa era la idea, cada lote tiene su precio de entrada y de salida". A lot stores its sale price per box (default presentation); its cost per box is derived from the lot cost.
- S3: Sale price never below entry cost — "precio de salida standard o precio recomendado modificable a mayor del precio unitario de entrada por caja, nunca menor." Equal is allowed. Enforced on the server, not only in the UI.
- S4: Bulk entry list — "en vez de agregar uno por uno quiero que se despliegue algo asi como una lista de todos los productos, con un input de cuantas cajas llegaron (nunca llegan sueltas), precio del lote completo (Por caja no) y a lado un calculo del precio unitario de cada caja y despues un input de el precio de salida standard o precio recomendado modificable". Each row: boxes (whole boxes only), whole-lot cost, computed cost per box, sale price prefilled with the standard price for that warehouse (when there is one) and editable upward. Only rows with boxes > 0 are submitted.
- S5: FIFO sales — "la venta se basa en el stock que entro primero, osea el mas viejo." User choice: "El que entró primero (FIFO)". Order allocation takes lots by received time (oldest first), still skipping expired lots.
- S6: Mixed lines — user choice: "Todo al precio del lote más viejo". A line that spans several lots is charged entirely at the price of the oldest lot it takes. A lot without its own sale price falls back to the standard price.
- S7: No discounts — "No hay descuentos de ningun tipo, ni descuentos y asi". Customer commercial rules are left untouched (out of scope to remove).
- S8: Checks — rules covered by `bun test` through the public service interface; `bun run web:lint`, `bun run web:check`, `bun run web:build` stay green.

Assumptions (parent): the lot price applies to the default (box) presentation; other presentations keep the standard price. A transferred lot inherits its source lot's sale price. The post-purchase "Precios sugeridos" step is removed, since the price is now set per lot at entry.

## Tasks

- T1 [S2,S3,S8] inline — `lots.sale_price_cents` (nullable, > 0) + migration; `createPurchase` accepts an optional per-line `salePriceCents` and rejects one below the cost per box. Status: done. Commit: bee36c4 (RED 7 new tests; GREEN 605/605; migration 0015 applied to dev; slice counter includes generated drizzle snapshot)
- T2 [S1,S4,S8] worker — Bulk entry UI (all-products list, cost per box, sale price prefill/validation), remove the price-suggestion step, catalog "precio estándar" labels, seed lots with sale prices. Status: done. Commit: ea128cb (RED draft tests; GREEN 614+ full suite; eslint/tsc/build clean; browser not tested)
- T3 [S5,S6,S8] worker — FIFO order allocation, line price from the oldest allocated lot (quote preview matches), transfers inherit the lot price. Status: done. Commit: 373c510 (RED 7 tests; GREEN 614/614; concurrency fixture now steers by receivedAt and asserts the lock crossing)

## Log

- L1 (user request): "Necesito modificar algo importante, para mi caso de uso, en el catalogo, los precios no son algo fijo, son mas bien una recomendacion o un precio standard que se puede ir modificando, esto a razon de que cuando entra un lote de un producto nuevo entra con un gasto, por ejemplo una caja de un producto puede entrar a 30 pesos y queremos dar su precio de salida a 34 de forma regular, pero tambien puede ser que un lote nuevo entre a 32 y se vende a 34 de igual forma, pero si un lote llega a 34 al entrar se puede configurar su precio de salida a 36 aunque el precio standard o recomendado sea 34. Ahora para mejorar la experiencia y flujo de entrada de productos al inventario se hara lo siguiente, en vez de agregar uno por uno quiero que se despliegue algo asi como una lista de todos los productos, con un input de cuantas cajas llegaron (nunca llegan sueltas), precio del lote completo (Por caja no) y a lado un calculo del precio unitario de cada caja y despues un input de el precio de salida standard o precio recomendado modificable a mayor del precio unitario de entrada por caja, nunca menor."
- L2 (user): "Explicame el 3" → explanation of per-lot price, oldest lot sets the line price.
- L3 (user): "Esa era la idea, cada lote tiene su precio de entrada y de salida, la venta se basa en el stock que entro primero, osea el mas viejo."
- L4 (user choices): order "El que entró primero (FIFO)"; mixed line "Todo al precio del lote más viejo"; customer rules "No hay descuentos de ningun tipo, ni descuentos y asi".
