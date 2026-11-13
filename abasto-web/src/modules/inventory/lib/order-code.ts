/**
 * The code shared by every lot an order creates: its reference when it has
 * one, else `PED-` plus the order folio padded to four digits (`PED-0007`).
 * The folio is a sequential number assigned once, so the code never changes.
 */
/** Supplier-order folio: `E` plus the consecutive padded to three digits (`E001`). */
export const supplierFolio = (consecutive: number) =>
  `E${String(consecutive).padStart(3, '0')}`

export const orderCode = (order: { reference: string; folio: number }) =>
  order.reference.trim() || `PED-${String(order.folio).padStart(4, '0')}`
