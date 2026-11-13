# Client feedback — Nov 13

Eight adjustments the client sent as annotated photos (WhatsApp), with the user's notes and decisions. Branch `fix/client-feedback-nov13`.
UI copy is Spanish (es-MX); code and identifiers in English. The database is development only (local docker / Supabase dev): migrations that rewrite data are allowed.

## Specs

- **S1 — Mostrador → Ventas.** Client: "Cambia por Fas el nombre de Mostrador por Ventas .." The nav item and the page heading read «Ventas»; other UI text that names that page (links, hints) says «Ventas». The route path `/mostrador` stays. The sales channel label "Mostrador" in reports is data, not the page name, and stays.
- **S2 — Bigger «Nuevo pedido» dialog.** Client: "Que la ventana de Nuevo pedido se haga grande para poder ver más productos. ." The counter new-order dialog takes almost the whole viewport (width and height) so the product table shows more rows.
- **S3 — Bigger product image.** Client: "Si pudieras hacer un poquitito más grande la imagen estaría super .. del tamaño desde donde dice el nombre del producto hasta donde dice las piezas ..." The thumbnail in each product row is as tall as the text block from the product name to the availability («Disponible: N piezas») line.
- **S4 — Box and piece inputs, blocked without stock.** Client: "Aquí sería bueno mejor si no hay piezas en existencia que no me permita escribir números. Y por Fas dale una checada por qué hay productos que los jala por pieza y otros por caja. . en si TODO tiene que ser por caja.." User: "En esta crea un input para caja y pieza." Decision: one row per product with two inputs, «Cajas» and «Piezas»; total pieces = cajas × piezas por caja + piezas. When the product has no stock, both inputs are disabled. A product without a box presentation has its «Cajas» input disabled.
- **S5 — Remove «Preparado».** Client: "Yo digo que el preparado sale sobrando amigo . Es lo mismo que Reservado este es el chido , .." Decision: remove the status everywhere (prepare action, «Preparar» button, «Preparado» tab, store status strip step) and migrate stored «Preparado» orders to «Reservado».
- **S6 — Automatic supplier-order folio.** Client: "En la de Nuevo pedido al proveedor .. que esté folio lo de en automático consecutivo .. ya que no tenemos folio antes ... Ejemplo iniciar E001, E002........" Decision: fixed, not editable; consecutive from E001.
- **S7 — «Recibidos» instead of «Faltantes».** Client: "En Recibir pedido .. que también en cajas pedidas .. lo pongas como editable .. pasa también que nos llegan menos cajas o más de que se pide .." User: "En esta en vez de un input para faltantes cambialo por uno de recibidos asi se sabe si recibieron menos o mas." Decision: the «Faltantes» input becomes «Recibidas» (boxes received, defaulting to the ordered boxes). Fewer than ordered → the difference stays «Por reponer» as today. More than ordered → the extra boxes enter inventory without cost: they do not raise the amount owed to the supplier.
- **S8 — Lot adjustments for owners only.** Client: "En Lotes en el Almacén .. lo de quitar y aumentar .. solo dejarlo en el usuario de dueños por Fas". «Quitar existencias» and «Sumar existencias» show only to owners, and the server rejects those adjustments from anyone else.

## Tasks

- [x] T1 — S1-S4 — inline — counter: «Ventas» label, full-viewport new-order dialog, taller image, one row per product with «Cajas»/«Piezas» inputs disabled without stock. Commit 4cd24ea.
- [x] T2 — S5 — inline — Preparado removed (service, server fn, UI, store strip, seed); migration 0037_remove_prepared_status maps stored Preparado to Reservado and drops prepared_at. Commit 7a05322.
- [x] T3 — S6 — inline — server assigns reference E001, E002… (advisory lock, max E-number + 1); dialog shows a read-only folio. Commit 491bdd9.
- [ ] T5 — S7 — worker — reception «Recibidas» input replaces «Faltantes»; surplus enters free.
- [ ] T6 — S8 — worker — owner-only lot adjustments (UI + server).
- [ ] T4 — all — verify (S8 security, S5/S7 data) + full suite + on-screen check.

## Log

- L1 — User: "vamos a hacer cambios que pidio el cliente [Image#1] [Image#2] [Image#3] [Image#4] En esta crea un input para caja y pieza. [Image#5] [Image#6] [Image#7] En esta en vez de un input para faltantes cambialo por uno de recibidos asi se sabe si recibieron menos o mas. [Image#8]" (image captions quoted in S1–S8).
- L2 — Decisions (questionnaire): Preparado → "Quitarlo y migrar los datos"; extra boxes → "Entran sin costo"; folio → "Fijo, sin poder editarlo"; caja/pieza → "Una fila por producto con dos campos".
- L3 — User: "Tienes bastante libertad, no te preocupes por la db, no estamos en produccion y la db actual de supabase es de desarrollo"
- L4 — Writers were refused by the runtime guard (absolute spec path); T1–T3 done inline. Context backstop reached after T3: T5 and T6 delegated.
