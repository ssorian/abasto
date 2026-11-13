/** Inventario tabs that show a count of the work they hold. */
export type TabBadges = Partial<Record<'Por recibir' | 'Saldos', number>>

/** Orders waiting to arrive and open supplier balances; tabs without work get no badge. */
export function tabBadges(input: {
  orders: ReadonlyArray<{ status: string }>
  restock: ReadonlyArray<unknown>
  returns: ReadonlyArray<unknown>
}): TabBadges {
  const waiting = input.orders.filter((order) => order.status === 'Pedido')
  const balances = input.restock.length + input.returns.length
  return {
    ...(waiting.length > 0 ? { 'Por recibir': waiting.length } : {}),
    ...(balances > 0 ? { Saldos: balances } : {}),
  }
}
