import { formatCents } from '#/modules/inventory/lib/cents'

/** What the order dialog needs of an open "Por reponer" balance. */
export type DiscountableBalance = {
  pendingId: string
  owedValueCents: number
}

/** Adds the balance to the chosen ones, or takes it out when already chosen. */
export const toggleDiscount = (chosen: ReadonlyArray<string>, id: string) =>
  chosen.includes(id) ? chosen.filter((item) => item !== id) : [...chosen, id]

/** Value of the chosen balances: what the order no longer pays. */
export const discountTotalCents = (
  balances: ReadonlyArray<DiscountableBalance>,
  chosen: ReadonlyArray<string>,
) =>
  balances
    .filter((balance) => chosen.includes(balance.pendingId))
    .reduce((total, balance) => total + balance.owedValueCents, 0)

/** Net total of the order − discounts. */
export const payableCents = (netCents: number, discountCents: number) =>
  netCents - discountCents

/** The server's message when the discounts exceed the order total; null otherwise. */
export const discountIssue = (netCents: number, discountCents: number) =>
  discountCents > netCents
    ? 'Los descuentos no pueden superar el total del pedido.'
    : null

/** Chosen balances as the server input; nothing when none were chosen. */
export const discountsInput = (chosen: ReadonlyArray<string>) =>
  chosen.length ? chosen.map((pendingId) => ({ pendingId })) : undefined

/** Footer figures: only the net total, or net − discounts = to pay. */
export const orderTotalsText = (netCents: number, discountCents: number) =>
  discountCents > 0
    ? `Total neto ${formatCents(netCents)} − Descuentos por faltantes ${formatCents(discountCents)} = A pagar ${formatCents(payableCents(netCents, discountCents))}`
    : `Total del pedido (neto): ${formatCents(netCents)}`
