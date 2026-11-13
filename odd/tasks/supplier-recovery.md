# Supplier recovery: merma, return credits and the recovered/lost indicator

Money owed by suppliers for missing or damaged boxes must be usable and visible:
damaged boxes can be written off as merma, a return discount becomes a credit for
the next order, and reports show what was recovered, what is pending and what was lost.

## Specs

- **S1 — Merma for damaged boxes.** "para cajas danadas o se devuelven o se cuentan como perdida (merma)". Decided "Después, desde pendientes": a "Por devolver" balance can be closed as merma from the supplier pendings tab. It closes the balance (all or some boxes) with its value as a loss and does not touch stock (those boxes never entered stock).
- **S2 — Return discount becomes a credit for the next order.** "Como esta, se selecciona si se puede hacer o no, no se hace en automatico": a return closed with resolution "Descuento" leaves its credit amount selectable, by hand, in the next order to that supplier, exactly like a "Por reponer" balance today. Never applied automatically. Cancelling the order that used it reopens it.
- **S3 — Unrecognized difference is a loss.** When the supplier credits less than the value of the returned boxes, the difference counts as lost.
- **S4 — Stock losses have a value.** A stock loss (caducado, dañado, otro) is valued at its lot's cost per unit (`received_cost_cents / received_quantity`).
- **S5 — Report indicator.** "deberia haber un indicador en reportes que diga cuanto dinero fue devuelto en caso de ser asi". Per period and per supplier: **Recuperado** (descontado en pedidos + repuesto en mercadería), **Pendiente** (what suppliers still owe), **Perdido** (merma + pérdidas de stock + lo no reconocido).
- **S6 — Product cost.** "que pasa con lo descontado en el siguiente pedido como afecta al costo de los productos?": discounts never change lot costs. Lots of the new order keep their full line cost; the discount only lowers the payable. Already true; no change.

Constraint: "No hay absolutamente nada en prod aun" — schema may change freely (new migration, no data backfill).

## Tasks

| ID | Specs | Route | Commit |
| --- | --- | --- | --- |
| T0 | — | inline: commit pre-existing work on `main` ("commitea lo que tenemos y continua") | 733b493, 4d045c0, 673732e, 173f523 |
| T1 | S1 | inline: `scrapped` pending type, migration 0035, `scrapPendings` service/server fn, pendings tab action + dialog, labels | e67c493 |
| T2 | S2, S3 | inline: credits from `returned`+`discount` as discountable balances in `createSupplierOrder`, order dialog, reopen on cancel | |
| T3 | S4, S5 | worker (context backstop): supplier recovery report service (recovered, pending, lost incl. valued stock losses) | |
| T4 | S5 | worker (with T3): owner reports card with breakdown, period and supplier filters | |

## Log

- **L1** (original request): "Que pasa con el dinero que entra y sale por reposicion y perdida y desconteo en pedidos a proveedores?"
- **L2**: "Es que creo que deberia haber un indicador en reportes que diga cuanto dinero fue devuelto en caso de ser asi, y que pasa con lo descontado en el siguiente pedido como afecta al costo de los productos?"
- **L3**: "Analizando esto, que me recomiendas? No hay absolutamente nada en prod aun"
- **L4**: "Hay un caso de uso que no te dije, para cajas danadas o se devuelven o se cuentan como perdida (merma)"
- **L5**: Answers — merma: "Después, desde pendientes"; return discount: "Como esta, se selecciona si se puede hacer o no, no se hace en automatico".
- **L6**: "commitea lo que tenemos y continua". Not committed: `abasto-web/env` (credentials), `abasto-web/.impeccable/` (tool scratch incl. a DB dump), `docs/qa/2026-11-12-flow-map/shots/` (15 MB screenshots; previous QA commits kept only markdown).
- **L7**: Evidence — reception lots carry only good units' cost (`supplier-reception.ts:351-355`); missing/damaged go to `supplier_pendings` at line-share value. `written_off` is a legacy settlement type ("Descontado del pago"), so merma uses a new `scrapped` type.
- **L8**: T1/T2 design as implemented — merma is a `scrapped` settlement of a `damaged` origin (migration 0035). A return closed with resolution `discount` and a credit > 0 also appends a new origin entry `credit` (kind `credit`, "Descuentos a favor", migration 0036) worth `creditCents` for the returned units, same `purchaseId` as the damaged origin; it is listed in `listSupplierPendings().credits`, shown in the Saldos tab and offered next to "Por reponer" balances in the order dialog, discounted only when chosen (`discounted` settlement; cancelling reopens). The `returned` settlement keeps `valueCents` (original value) and `creditCents`; S3 loss = returned value − credit when positive.
