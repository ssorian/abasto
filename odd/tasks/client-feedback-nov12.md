# Client feedback — Nov 12

Four UI adjustments the client sent as annotated photos (WhatsApp). Branch `fix/client-feedback-nov12` in `abasto-web`.
UI copy is Spanish (es-MX); code and identifiers in English.

## Specs

- **S1 — "Llegó sin pedirlo" without chips.** Client: "En Llegó sin pedirlo .. si puedes quitar esto .. solo que tenga el buscador y ya que despliegue el producto por Fas." The row of «Agregar <producto>» buttons shown before typing goes away; the section shows only the search box, and matching products appear once the user types.
- **S2 — Dialog corner buttons always reachable.** Client: "En las páginas .. al darle hacia abajo .. se pueden los botines de la parte superior derecha el de cerrar y pantalla completa." User: "Esta se refiere a que se pierde el boton para cerrar el dialog y la scrollbar estorba". Close and full-screen stay visible while the dialog body scrolls, and the scrollbar does not overlap content or those buttons.
- **S3 — Counter «Nuevo pedido» like the supplier order.** Client: "Mira en esta ventana de Nuevo pedido .. me gustaría una ventana similar a la que tenemos en pedido al proveedor .. donde me despliegue todos los productos .. precio ...un filtro que sea de Lala o Alpura .. y dónde lo pueda buscar ya sea por nombre o por sku por Fas .." Table of every sellable product with its price, supplier filter, search by name or SKU, quantity typed per row.
- **S4 — Product image in Inventario.** Client: "Podrías jalar por aquí en el inventario también la imagen del producto para que se ve un poco más bonito .." Thumbnail next to the product name in the inventory list.

## Tasks

- T1 — S2 — inline — InventoryDialog: fixed header with corner buttons, body scrolls.
- T2 — S1 — inline — reception-dialog: hide candidates until a query is typed.
- T3 — S3 — pending exploration — counter new-order dialog redesign.
- T4 — S4 — pending exploration — inventory product thumbnail.

## Log

- L1 — User: "Vamos a corregir algunos detalles que nos pidio el cliente [Image#1], [Image#2] Esta se refiere a que se pierde el boton para cerrar el dialog y la scrollbar estorba, [Image#3] [Image#4]" (images quoted in S1–S4).
