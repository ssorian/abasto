# Inventory flow UX follow-ups

Confusing areas found in the manual Playwright run of the inventory in/out flow (catalog → supplier order → shortages → sale → rider → reorder).
Follows commit 3060df1 on `fix/inventory-flow-findings`. UI copy is Spanish (es-MX); code and identifiers in English.

## Specs

- **S1 — Rider piece pricing.** User decision: "Precio de la Pieza" — "Las piezas sueltas se cobran a $38 y las cajas completas a $440. Sin centavos raros." Today a rider's loose pieces are charged at box price ÷ pieces ($440/12 = $36.67) instead of the Pieza price ($38). At settlement, whole boxes sold are charged at the frozen box price and loose pieces at the frozen piece price of the warehouse, both frozen at assignment.
- **S2 — Supplier order totals.** User decision: "Bruto y a pagar" — "Las dos cifras: «$2,736 · a pagar $1,710». En Recibido también se ve lo que faltó o llegó dañado." Applies to the «Por recibir» and «Recibido» lists in Inventario.
- **S3 — Complete product creation.** User choice: "Alta de producto completa" — "Presentaciones desde «Nuevo producto», pestaña Presentaciones bien acomodada y poder quitar una antes de guardar." Evidence: the presentations tab renders the tablist as a half-width column and squeezes the form ("Activ" cut off); an added unsaved presentation cannot be removed.
- **S4 — New product visible in Inventario.** User choice: "Producto nuevo en Inventario" — "Aparece con «Sin existencias» desde que se crea, para fijarle mínimo y que funcione el link del catálogo." The catalog link is `/inventario?q=<name>`.
- **S5 — Counter stock warning.** User choice: "Aviso de stock en Mostrador" — "Avisar en el formulario cuando Caja + Pieza del mismo producto superan lo disponible, antes de reservar." Evidence: 6 Caja + 5 Pieza (77 pieces vs 72 available) showed no warning; only the server toast "No hay suficiente existencia disponible de …" after submit.
- **S6 — Copy and details.** User choice: "Copy y detalles" — "Quitar «a lo chino», el pie «Datos de ejemplo», «11 piezas» duplicado, el doble toast al guardar precios y el label del select en reparto."
  - "Descontar del pago (a lo chino)" → plain wording; UI copy only, no DB/enum/identifier change.
  - Footer "Datos de ejemplo · Guardado local" removed from the staff console.
  - Inventory stock cell shows "11 piezas / 11 piezas" when the product has no full box: hide the second line when it repeats the first.
  - Saving prices + supplier cost shows two toasts ("Precios guardados.", "Costo por pieza guardado."): show one.
  - In «Nuevo reparto», the Producto select's accessible name includes the help text and collides with the "Cajas" input: the help text becomes a description, not part of the label.

- **S7 — Remove bulk price changes.** User: "Quita el cambio de precios masivo, no tiene sentido para mi". Existing `bulk` price-history rows keep their source and label.

## Tasks

| ID | Specs | Route | Allowed surfaces | Commit |
|----|-------|-------|------------------|--------|
| T1 | S1, S6 (reparto label) | gentle-ai-worker (bg) | `abasto-web/src/modules/riders/**`, `abasto-web/drizzle/**` | see Log L3 |
| T2 | S2, S4, S6 (a lo chino, piezas duplicado) | gentle-ai-worker (bg) | `abasto-web/src/modules/inventory/**` | ec17331, 218bb2d |
| T3 | S3, S6 (doble toast) | gentle-ai-worker (bg) | `abasto-web/src/modules/catalog/**`, `abasto-web/src/modules/pricing/**` | 9b99a9c |
| T5 | S7 | inline | `abasto-web/src/modules/pricing/**`, `abasto-web/src/modules/catalog/components/catalog-page.tsx` | 1618bb0 |
| T4 | S5, S6 (footer) | gentle-ai-worker (bg) | `abasto-web/src/modules/counter/**`, `abasto-web/src/components/layout/app-footer.tsx` | 7103ed9 |

## Log

- L1 (user, after the manual-test report): "Y las cosas confusas?"
- L3: T1 committed (feat(riders): charge loose pieces at the frozen piece price). Loose pieces are the newest units FIFO; leftover also returns from the newest. Pending independent verification (migration + money).
- L4 (user): "Quita el cambio de precios masivo, no tiene sentido para mi" → S7, T5. Full suite after all units: 958 pass, 0 fail; tsc clean; eslint 0 errors. T1 independent verify: PASS (notes: 1-cent rounding when a box spans lots; 'box' = default presentation; no test for piece-default products).
- L2 (user answers): S1 "Precio de la Pieza"; S2 "Bruto y a pagar"; scope "Alta de producto completa", "Producto nuevo en Inventario", "Aviso de stock en Mostrador", "Copy y detalles".
