# Real catalog seed

Replace the invented seed catalog with the real Lala route and Alpura order products from the two spreadsheets, add product photos, and reset the development database.
Sources (copied read-only to /tmp/abasto-xlsx/data): `VENTA_X_DIA_GANANCIA_CORREGIDO_7_NOV.xlsx` (Lala route Tejupilco) and `PEDIDO 3-11-26 $39,486.53.xlsx` (Alpura order and price list).

## Specs

- S1 — "actualices la seed con los datos del inventario de estos excel, incluyendo precio, descuento, sku, identificadores, numeros, promocion, y en general detalles de cada producto". Every product keeps its supplier identifiers (Lala SKU; Alpura AS400 ID, Oracle key, UPC barcode), pieces per box (and per pallet for Alpura), list price, fixed discount and promotion per piece, and its presentation details.
- S2 — Alpura scope: "Solo los 41 del pedido" — the products of the `PEDIDOS ALPURA` sheet (39 rows with data). Sale price: "Margen fijo sobre costo neto" — +20% over the net cost per piece (list − fixed discount − promotion).
- S3 — Lala scope: "Los 34, estimando lo faltante" — all 34 route products; the 12 with `DATOS` prices use the real sale price and FIFO cost; the other 22 get estimated cost, price and box size (sale price = cost + the sheet's profit per box when it has one), marked as estimated.
- S4 — "busques las fotos en internet para agregarlas": every product gets an https photo URL that answers an image.
- S5 — Initial stock in Tejupilco comes from the Alpura order pieces and the Lala route outgoing pieces; the existing seed scenarios (orders, credit, cash, transfers, losses) keep working on the new SKUs.
- S6 — "si es posible haz reset a la db actual": reset the database the app uses today (`.env.local`, remote Supabase) after a verified `pg_dump` backup: empty every `public` table (keeping schema, grants and migrations), then seed. Never `db-test`.

## Tasks

- [x] T1 — S1-S3 — extract spreadsheet data — inline — no commit (scratch /tmp/abasto-xlsx/products.json)
- [x] T2 — S4 — find product photos into `abasto-web/src/db/seed/product-images.ts` — gentle-ai-worker (background) — 68 exact, 5 approx, 72 URLs verified 200 image/*
- [x] T3 — S1-S3, S5 — rewrite seed data, seed.ts and seed tests — inline — seed test RED (18≠73) then GREEN 4/4
- [x] T4 — S6 — reset the dev database and run the seed — inline — truncated 29 public tables, db:seed OK: 73 products (73 photos, 27 with promotion), 39 barcodes, 51 lots

## Products (73)

- 1271 — Lala route: Crema 200ml
- 23131 — Lala route: Crema ácida 426ml
- 1266 — Lala route: Crema 900ml
- 25023 — Lala route: UHT Lala Desl 1Lt UE
- 25016 — Lala route: UHT Lala Entera 1L
- 25018 — Lala route: UHT Lala Semi 1Lt UE
- 25020 — Lala route: UHT Lala Light 1Lt UE
- 18583 — Lala route: UHT Lala Desl Semi 1.5L
- 20421 — Lala route: UHT Lala Entera 1.5L
- 13455 — Lala route: Plácteo UHT Nutri Entera 1L
- 21185 — Lala route: Plácteo UHT Nutri Entera 2Lt
- 27248 — Lala route: Lala Yomi 180ml
- 25421 — Lala route: Lala Yomi 960ml
- 24539 — Lala route: Café Lala Latte 960ml UE
- 20112 — Lala route: Chocolala Choco 330ml Tpris
- 20422 — Lala route: UHT Café Latte Desl 330ml
- 11523 — Lala route: Yog Cereal 100gr
- 23622 — Lala route: Yog Batido 900gm
- 23431 — Lala route: Yog Lala Beb 220gr
- 25887 — Lala route: Nutriyoghurt 210gr
- 23627 — Lala route: Cuchareables Lala 120gr - Fresa/Natural/Durazno
- 27028 — Lala route: Yog Lala Bebible 440gr
- 27042 — Lala route: Licuado Nestlé 450gr
- 25928 — Lala route: Nutriyoghurt Bebible 450ml
- 1295 — Lala route: Flan Lala Vainilla 100gr 2pz
- 12403 — Lala route: Yog Lala Batido Fresa c/Granola 190 gr
- 24479 — Lala route: Bio 4 Natural 100 gr Spz BLF
- 21440 — Lala route: Lala 100 Cacao 330ml Pet
- 12348 — Lala route: Aquafrut galón
- 18434 — Lala route: Aquafrut 1.8
- 12339 — Lala route: Aquafrut 1
- 1265 — Lala route: Crema ácida Entera Lala 4Lt
- 18758 — Lala route: Lala 100 Dorada +pro
- 18759 — Lala route: Lala 100 Plata +pro
- CR93 — Alpura: CREMA ENT PAST ACIDA /24 PZAS 190ML (UPC 7501055919390)
- CA10 — Alpura: CREMA ENTERA PASTEURIZADA ACIDIFICADA 426 ML (UPC 7501055916016)
- CR18 — Alpura: CREMA ENTERA PASTEURIZADA ACIDIFICADA 900ML (UPC 7501055909544)
- CR39 — Alpura: CREMA ENTERA PASTEURIZADA ACIDIFICADA 1 PIEZA 4L (UPC 7501055909551)
- LU53 — Alpura: LECHE SEMI UHT ULTRA EDGE 1L CHEP (UPC 7501055900046)
- LU11 — Alpura: LECHE SEMI UHT DESLACTOSADA EDGE 1L CHEP (UPC 7501055901425)
- LU22 — Alpura: LECHE DESCREMADA LIGHT UHT DESLACTOSADA 5 G GRASA EDGE 1L CHEP (UPC 7501055904143)
- LU23 — Alpura: LECHE DESCREMADA LIGHT UHT DESLACTOSADA MAGNUM 1.5L CHEP (UPC 7501055913411)
- LU55 — Alpura: LECHE UHT CLASICA EDGE 1L CHEP (UPC 7501055900039)
- LU02 — Alpura: LECHE DESCREMADA LIGHT UHT EDGE 1L CHEP (UPC 7501055900800)
- FP12 — Alpura: LECHE FORTI PLUS UHT MIDI SIN TAPA 1L (UPC 7501055902378)
- SA43 — Alpura: SABORIZADA CAFÉ LECHERO UHT SIN SELLO DESLACTOSADA COMBISMILE 315ML CHEP (UPC 7501055915187)
- LU56 — Alpura: LECHE UHT CLASICA COMBI MAGNUM 1.5L CHEP (UPC 7501055910250)
- LU12 — Alpura: LECHE SEMI UHT DESLACTOSADA MAGNUM 1.5L CHEP (UPC 7501055910274)
- SA50 — Alpura: SABORIZADA VAINILLA UHT SIN SELLO EDGE 1L CHEP (UPC 7501055900084)
- SA51 — Alpura: SABORIZADA FRESA UHT SIN SELLO EDGE 1L CHEP (UPC 7501055900077)
- SA52 — Alpura: SABORIZADA CHOCOLATE UHT SIN SELLO EDGE 1L CHEP (UPC 7501055900060)
- SA78 — Alpura: LECHE SABORIZADA UHT VAQUITAS VAINILLA SLIM 180 ML (UPC 7501055911752)
- SA79 — Alpura: LECHE SABORIZADA UHT VAQUITAS FRESA SLIM 180 ML (UPC 7501055916993)
- SA80 — Alpura: LECHE SABORIZADA UHT VAQUITAS CHOCOLATE SLIM 180 ML (UPC 7501055911769)
- YB55 — Alpura: YOGHURT BATIDO FRESA PASTEURIZADO 125G (UPC 7501055912391)
- YB57 — Alpura: YOGHURT BATIDO DURAZNO PASTEURIZADO 125G (UPC 7501055912414)
- YB61 — Alpura: YOGHURT BATIDO MANZANA PASTEURIZADO 125G (UPC 7501055912438)
- YB59 — Alpura: YOGHURT BATIDO MANGO PASTEURIZADO 125G (UPC 7501055912452)
- BP01 — Alpura: YOGHURT BEBIBLE FRESA PASTEURIZADO 220G (UPC 7501055914845)
- BP05 — Alpura: YOGHURT BEBIBLE FRESA COCO PASTEURIZADO 220G (UPC 7501055914807)
- BP02 — Alpura: YOGHURT BEBIBLE DURAZNO PASTEURIZADO 220G (UPC 7501055914838)
- BP03 — Alpura: YOGHURT BEBIBLE MANGO PASTEURIZADO 220G (UPC 7501055914852)
- BP04 — Alpura: YOGHURT BEBIBLE MANZANA PASTEURIZADO 220G (UPC 7501055914821)
- BP07 — Alpura: YOGHURT BEBIBLE PIÑA COCO PASTEURIZADO 220G (UPC 7501055914814)
- YC36 — Alpura: YOGHURT BATIDO FRESA PASTEURIZADO CON AROS SABORIZADOS 125G (UPC 7501055917259)
- YC38 — Alpura: YOGHURT BATIDO FRESA PASTEURIZADO CON ARROZ INFLADO DE CHOCOLATE 125G (UPC 7501055917235)
- YC40 — Alpura: YOGHURT BATIDO FRESA PASTEURIZADO CON HOJUELAS AZUCARADAS 125G (UPC 7501055917242)
- FT02 — Alpura: FRUTAL FRESA PASTEURIZADO TTOP NALLO 250ML (UPC 7501055905836)
- FT04 — Alpura: FRUTAL PIÑA COCO PASTEURIZADO TTOP NALLO 250ML (UPC 7501055905850)
- FT08 — Alpura: FRUTAL FRESA PLATANO PASTEURIZADO TTOP NALLO 250ML (UPC 7501055916177)
- YG20 — Alpura: YOGHURT BATIDO DURAZNO PASTEURIZADO 900G (UPC 7501055914487)
- YG78 — Alpura: YOGHURT BATIDO MANZANA PASTEURIZADO 900G (UPC 7501055914500)
- YG87 — Alpura: YOGHURT BATIDO FRESA PASTEURIZADO 900G (UPC 7501055914463)
## Log

- L1 — User: "/home/onix/Downloads/VENTA_X_DIA_GANANCIA_CORREGIDO_7_NOV.xlsx /home/onix/Downloads/PEDIDO 3-11-26 $39,486.53.xlsx Necesito que actualices la seed con los datos del inventario de estos excel, incluyendo precio, descuento, sku, identificadores, numeros, promocion, y en general detalles de cada producto y busques las fotos en internet para agregarlas, tambien si es posible haz reset a la db actual"
- L2 — User decisions: Alpura "Solo los 41 del pedido (Recomendado)"; Lala "Los 34, estimando lo faltante"; Alpura sale price "Margen fijo sobre costo neto" (+20%); "Sí, reset de la DB dev".
- L3 — Evidence: `abasto-web/env` holds a remote Supabase DATABASE_URL; the reset must verify the target is localhost:55450.
- L4 — Evidence: `.env.local` DATABASE_URL is the remote Supabase pooler, not docker. User chose: "Supabase remota (la que usa la app hoy)".
- L5 — Backup before reset: `abasto-web/.backups/supabase-20261107-222634.dump` (pg_dump -Fc of public + drizzle, 30 table data entries; remote had 19 products, 7 users, 15 orders, 21 migrations). Excluded via .git/info/exclude.
- L6 — Checks: full suite 708 pass / 0 fail, tsc clean, eslint and prettier clean on src/db/seed.
