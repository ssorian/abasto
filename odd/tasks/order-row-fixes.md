# Supplier order row fixes

Objective: fix two end-user issues in the supplier order dialog (letters in "Cajas", errors hard to locate), make cost vs price wording clear, and let the warehouse manager edit everything in the Prices dialog. Branch `feat/order-row-fixes` (from `main` b277807).
Test runner: `bun test` in `abasto-web` against the isolated test database (`bun run db:up`); checks `bunx tsc --noEmit`, `bunx eslint src`, prettier on touched files.

## Specs

- S1: Boxes input digits only — "Sería bueno que no permitirá ingresar letras". The order row "Cajas" input drops any non-digit as typed or pasted (e.g. "yyy" → "", "12abc" → "12") and opens the numeric keyboard (`inputMode="numeric"`). Existing `parseBoxCount` and server validation stay as fallback.
- S2: Terminology — "Importante hacer bien la distincion de costo y precio" / "Terminologia mas clara, solo costo por pieza y ya." The supplier amount per piece (today "precio por pieza") is called "costo por pieza" everywhere in UI copy and messages: "Sin precio por pieza" → "Sin costo por pieza"; "El descuento y la promoción no pueden superar el precio por pieza." → "El descuento y la promoción no pueden superar el costo por pieza." (order client + server, catalog draft + service), and the cost field label in the Prices dialog. Sale prices keep the word "precio".
- S3: Error goes to the product — "sería bueno que si me sale algún tipo de error me ponga en automático en pantalla la producto del error para ya no volverlo andar buscando". When saving an order fails on a product row, the dialog clears the search if it hides that product, scrolls to its row, highlights it and focuses its "Cajas" input. Rows whose discount + promotion exceed the cost per piece show that message in red as soon as boxes are typed. (Parent choice per "Fuera de eso implementa": clear the filter rather than search by SKU.)
- S4: Manager edits the Prices dialog — "Tambien deberia de estar disponible el boton para el manager del almacen" / "el manager puede corregir todo lo que abre el dialog, solo piensa, que pasa si el dueno esta ocupado en otro almacen y al manager se le notifica que tiene que cambiar alguna de estas cosas?". The order row "Precios" button shows for the owner and for the manager of the order's warehouse; the manager can edit cost per piece, fixed discount, promotion and the sale prices of that warehouse. Server: a new permission for the cost terms only (owner, or a manager of at least one warehouse) with its own save accepting only the three amounts; name, supplier and presentations stay `catalog.manage` (owner). Catalog Prices dialog shows the cost section to managers too.

## Tasks

- T1 [S1] parent inline — digits-only boxes input. Status: pending.
- T2 [S2] parent inline — cost terminology. Status: pending.
- T3 [S3] parent inline — error row navigation and inline red warning. Status: pending.
- T4 [S4] parent inline — cost permission for managers, order button. Risk: item 2 (permissions) → own commit, independent verify. Status: pending.

Delivery: forecast ~400-600 authored lines; strategy `ask-on-risk`.

## Log

- L1 (user, original request): "Son dos detalles que tiene el usuario final [Image#1] ayudame a corregirlos. Antes de hacer cualquier cosa proponme algo". Image: (1) "yyy" typed in Cajas — "Sería bueno que no permitirá ingresar letras"; (2) "Leche Alpura Clásica UHT 1 L: El descuento y la promoción no pueden superar el precio por pieza." while the search shows BP03 — "Este error me dio por el precio, que obviamente no debería de hacerlo ya que se tengan todos lo precios .. ahora sería bueno que si me sale algún tipo de error me ponga en automático en pantalla la producto del error para ya no volverlo andar buscando .."
- L2 (user): "Importante hacer bien la distincion de costo y precio"
- L3 (user): "Ademas no tenian un boton de edicion de precio al hacer pedido?" — explorer: button exists, owner only (`routes/inventario.tsx:85` `canEditProducts`); cost save requires `catalog.manage` (`catalog/services/products.ts:193`); sale prices already `warehouse.manage` (`pricing/services/prices.ts:75`).
- L4 (user): "Tambien deberia de estar disponible el boton para el manager del almacen"
- L5 (user): "No, el manager puede corregir todo lo que abre el dialog, solo piensa, que pasa si el dueno esta ocupado en otro almacen y al manager se le notifica que tiene que cambiar alguna de estas cosas?"
- L6 (user): "Terminologia mas clara, solo costo por pieza y ya. Fuera de eso implementa"
