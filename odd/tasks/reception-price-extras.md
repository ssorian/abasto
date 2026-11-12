# Reception: editable price per piece and unordered products

Objective: at "Recibir pedido" show and edit the unit price per piece and totals, and add products of the same supplier that arrived without being ordered. Branch `feat/reception-price-extras` (from `main` 4d362e1).
Test runner: `bun test` in `abasto-web` against the isolated test database (`bun run db:up`).

## Specs

- S1: Price and total at reception — "que al Recibir pedido, aparezca el precio unitario por pieza y el total, con editable el precio por pieza porque pasa mucho que lo pedimos a un precio y llega con otro precio .. así desde aquí rápido lo editamos para ya darlo de entrada correctamente". Each reception line shows an editable "Precio por pieza" (list price per piece, prefilled with the ordered price) and the line total; the dialog shows the order total. User choice: "Precio de lista por pieza (Recomendado)" — the edited value is the list price; the line's fixed discount and promotion still apply.
- S2: Received cost is the real cost — when the price changes, the line's gross and net cost are recomputed before lots and balances are created, so the lot cost, "Por reponer" and "Por devolver" balances and the lot sale-price floor use the received price. The ordered price is kept on the line so the difference stays visible. The order's "Por reponer" discounts cannot exceed the new total.
- S3: Catalog update — user choice: "Checkbox, marcado por defecto (Recomendado)": when a line's price changed, a checkbox (checked by default) also updates the product's catalog list price per piece; unchecked, only this order changes.
- S4: Unordered products — "Y también aquí mismo .. agregar un producto nuevo que llegó y no lo solicitamos .. también pasa que nos mandan cosas sin pedir". User choice: "Del catálogo de ese proveedor (Recomendado)": the reception dialog can add products of the order's supplier that are not on the order, with boxes, price per piece and expiry; they become a purchase line marked as not ordered and a lot with the order's code, in the same transaction, without missing/damaged balances.
- S6: Price difference after reception — user "Si" to "¿Agrego al detalle del pedido el precio pedido frente al cobrado y la marca «sin pedir»?": there is no order detail view today, so received orders get a read-only detail ("Ver detalle") listing each line with ordered/good/missing/damaged boxes, price per piece charged and ordered when different, line total, and a «Sin pedido» mark on unordered lines.
- S5: Checks — rules covered by `bun test` through the public service interface (exact error messages; rejected input leaves stored data unchanged); `bunx eslint src`, prettier on touched files, `bunx tsc --noEmit`, `bun run build` green.

## Tasks

- T1 [S1-S3] inline — price per piece at reception: schema/migration (ordered price), service, server input, draft, dialog, tests. Status: done. Commit: 3a73cc2 (RED 8/8 service + draft module missing; GREEN 8/8 + 42/42; full suite 1165 pass/0 fail; tsc, eslint clean). Slice: ~450 authored lines; the rest is the generated drizzle snapshot 0031.
- T2 [S4] inline + worker (dialog UI, context backstop) — unordered products at reception: migration 0032 `ordered` flag, service, server input, draft, dialog, tests. Status: done. Commit: see L4 (RED 11/12 service; GREEN service 20/20 with price tests, draft 6/6; full suite 1183 pass/0 fail; tsc, eslint clean).
- T3 [S5] verify (Risk: item 1, costs feed lots and balances) — independent verify. Status: done.
- T4 [S6] worker — received order detail dialog. Status: done (RED missing module; GREEN lib 173/0; tsc, eslint clean).
- T5 [S5] parent — apply 0031/0032 to the Supabase dev DB (user "Si") and Playwright check on :3000. Status: done (L8).

## Log

- L1 (user, screenshot of "Recibir pedido"): "Mira aquí requerimos .. que al Recibir pedido, aparezca el precio unitario por pieza y el total, con editable el precio por pieza porque pasa mucho que lo pedimos a un precio y llega con otro precio .. así desde aquí rápido lo editamos para ya darlo de entrada correctamente por Fas" / "Y también aquí mismo .. agregar un producto nuevo que llegó y no lo solicitamos .. también pasa que nos mandan cosas sin pedir .." / "Como cubrimos este caso de uso?"
- L2 (parent proposal): editable list price per piece + totals, keep ordered price; extras as new purchase lines; three open decisions.
- L3 (user): "Si confirmo" + choices: catalog "Checkbox, marcado por defecto (Recomendado)"; edit "Precio de lista por pieza (Recomendado)"; extras "Del catálogo de ese proveedor (Recomendado)".
- L4 (parent): T2 committed; full suite 1183/0 after tsc. No browser check yet.
- L5 (independent verify): S1-S5 PASS; inventory tests 335/0, tsc, eslint, build green. Low: ordered vs received price and the not-ordered flag are stored but not shown after reception (no UI reads them); 0031 backfill also fills direct-purchase lines (schema comment corrected). Info: extras accept inactive products, like order creation. Browser check not done.
- L6 (user): "Si y si" → apply migrations on Supabase dev + browser check; add ordered vs charged price and «sin pedir» to the order detail.
- L7 (parent, migrations 0031/0032 on Supabase dev DB): `bun run db:migrate` applied successfully; after: 34 rows in drizzle.__drizzle_migrations; purchase_lines 53 total, 0 without ordered price, 0 with ordered ≠ list price, 0 unordered (backfill and default correct, nothing else changed).
- L8 (parent, Playwright on :3000 against the Supabase dev DB, owner session): created order QA-PRECIO-1 (Alpura → QA-Almacén, 10 cajas Frutal Fresa 250 ml at 10.7400, net $963.90); received it with price 11.25 (line total $1,009.80, «Pedido a $10.7400» shown) and added 2 cajas Vaquitas Fresa 180 ml sin pedido ($369.02); catalog checkbox unchecked so the catalog stayed unchanged; toast «Pedido recibido. Entran 10 cajas · 2 sin pedido.»; list shows $1,378.82, 2 productos; «Ver detalle» shows the charged price in amber with «Pedido a $10.7400», the «Sin pedido» pill and totals. Fixes after the check: the reception table needed horizontal scroll to reach Caducidad (min width 1060 → 900, narrower inputs) and the pre-confirm summary omitted unordered boxes (now appends « · N sin pedido»). Test data QA-PRECIO-1 and its two lots remain in QA-Almacén.
