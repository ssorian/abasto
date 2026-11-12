# Reception: editable price per piece and unordered products

Objective: at "Recibir pedido" show and edit the unit price per piece and totals, and add products of the same supplier that arrived without being ordered. Branch `feat/reception-price-extras` (from `main` 4d362e1).
Test runner: `bun test` in `abasto-web` against the isolated test database (`bun run db:up`).

## Specs

- S1: Price and total at reception — "que al Recibir pedido, aparezca el precio unitario por pieza y el total, con editable el precio por pieza porque pasa mucho que lo pedimos a un precio y llega con otro precio .. así desde aquí rápido lo editamos para ya darlo de entrada correctamente". Each reception line shows an editable "Precio por pieza" (list price per piece, prefilled with the ordered price) and the line total; the dialog shows the order total. User choice: "Precio de lista por pieza (Recomendado)" — the edited value is the list price; the line's fixed discount and promotion still apply.
- S2: Received cost is the real cost — when the price changes, the line's gross and net cost are recomputed before lots and balances are created, so the lot cost, "Por reponer" and "Por devolver" balances and the lot sale-price floor use the received price. The ordered price is kept on the line so the difference stays visible. The order's "Por reponer" discounts cannot exceed the new total.
- S3: Catalog update — user choice: "Checkbox, marcado por defecto (Recomendado)": when a line's price changed, a checkbox (checked by default) also updates the product's catalog list price per piece; unchecked, only this order changes.
- S4: Unordered products — "Y también aquí mismo .. agregar un producto nuevo que llegó y no lo solicitamos .. también pasa que nos mandan cosas sin pedir". User choice: "Del catálogo de ese proveedor (Recomendado)": the reception dialog can add products of the order's supplier that are not on the order, with boxes, price per piece and expiry; they become a purchase line marked as not ordered and a lot with the order's code, in the same transaction, without missing/damaged balances.
- S5: Checks — rules covered by `bun test` through the public service interface (exact error messages; rejected input leaves stored data unchanged); `bunx eslint src`, prettier on touched files, `bunx tsc --noEmit`, `bun run build` green.

## Tasks

- T1 [S1-S3] inline — price per piece at reception: schema/migration (ordered price), service, server input, draft, dialog, tests. Status: pending.
- T2 [S4] inline — unordered products at reception: service, server input, draft, dialog, tests. Status: pending.
- T3 [S5] verify (Risk: item 1, costs feed lots and balances) — independent verify. Status: pending.

## Log

- L1 (user, screenshot of "Recibir pedido"): "Mira aquí requerimos .. que al Recibir pedido, aparezca el precio unitario por pieza y el total, con editable el precio por pieza porque pasa mucho que lo pedimos a un precio y llega con otro precio .. así desde aquí rápido lo editamos para ya darlo de entrada correctamente por Fas" / "Y también aquí mismo .. agregar un producto nuevo que llegó y no lo solicitamos .. también pasa que nos mandan cosas sin pedir .." / "Como cubrimos este caso de uso?"
- L2 (parent proposal): editable list price per piece + totals, keep ordered price; extras as new purchase lines; three open decisions.
- L3 (user): "Si confirmo" + choices: catalog "Checkbox, marcado por defecto (Recomendado)"; edit "Precio de lista por pieza (Recomendado)"; extras "Del catálogo de ese proveedor (Recomendado)".
