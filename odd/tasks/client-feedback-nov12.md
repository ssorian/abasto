# Client feedback — Nov 12

Four UI adjustments the client sent as annotated photos (WhatsApp). Branch `fix/client-feedback-nov12` in `abasto-web`.
UI copy is Spanish (es-MX); code and identifiers in English.

## Specs

- **S1 — "Llegó sin pedirlo" without chips.** Client: "En Llegó sin pedirlo .. si puedes quitar esto .. solo que tenga el buscador y ya que despliegue el producto por Fas." The row of «Agregar <producto>» buttons goes away. Revised by the user (L4): products of the order's supplier are listed by default, with that supplier shown as selected; the search box narrows the list.
- **S2 — Dialog corner buttons always reachable.** Client: "En las páginas .. al darle hacia abajo .. se pueden los botines de la parte superior derecha el de cerrar y pantalla completa." User: "Esta se refiere a que se pierde el boton para cerrar el dialog y la scrollbar estorba". Close and full-screen stay visible while the dialog body scrolls, and the scrollbar does not overlap content or those buttons.
- **S3 — Counter «Nuevo pedido» like the supplier order.** Client: "Mira en esta ventana de Nuevo pedido .. me gustaría una ventana similar a la que tenemos en pedido al proveedor .. donde me despliegue todos los productos .. precio ...un filtro que sea de Lala o Alpura .. y dónde lo pueda buscar ya sea por nombre o por sku por Fas .." Table of every sellable product with its price, supplier filter, search by name or SKU, quantity typed per row.
- **S4 — Product image in Inventario.** Client: "Podrías jalar por aquí en el inventario también la imagen del producto para que se ve un poco más bonito .." Thumbnail next to the product name in the inventory list.

## Tasks

- [x] T1 — S2 — inline — InventoryDialog and CounterDialog: fixed header with corner buttons, only the body scrolls. Commit 0a948f2.
- [x] T2 — S1 — inline — reception-dialog: no candidates until a query is typed. Commit e0d8694.
- [x] T3 — S3 — inline — counter new-order dialog: product table with photo, price, quantity per row; search by name/SKU; supplier filter; «Solo agregados». Sellable options carry productName, sku, imageUrl, supplier (via ProductStock). SearchBox moved to src/components. Commit e2088d7.
- [x] T4 — S4 — inline — ProductStock.imageUrl + thumbnail in products-tab; ProductImage moved to src/components. Commit 774c6c2.

## Log

- L1 — User: "Vamos a corregir algunos detalles que nos pidio el cliente [Image#1], [Image#2] Esta se refiere a que se pierde el boton para cerrar el dialog y la scrollbar estorba, [Image#3] [Image#4]" (images quoted in S1–S4).
- L2 — Verification: Playwright against the local docker Postgres (not Supabase). S2, S3 and S4 checked on screen; S1 not checked on screen (no supplier order waiting in the local data), covered by typecheck only.
- L3 — Slice boundary: 710 authored lines in 4 commits. Suggested review split: PR 1 = 0a948f2, e0d8694, 774c6c2 (dialogs, unordered arrivals, inventory photo); PR 2 = e2088d7 (counter new-order table), chained on PR 1.
- L4 — User: "Que aparezca por default una vez seleccionado el proveedor, con un proveedor seleccionado por defecto". The order's supplier is fixed (the server rejects another supplier's products), so it shows as a fixed selected supplier next to the search; the list (photo, name, SKU, «Agregar») shows without typing. Checked on screen with a local test order PED-0020.
