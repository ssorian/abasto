import type { MovementEntry } from '#/modules/inventory/types/stock'

/** One line of "Entradas": what arrived, from which order, who received it and when. */
export type EntryRow = {
  id: string
  /** Supplier order code; it is also the code of the lot the line created. */
  orderCode: string
  productId: string
  quantity: number
  receivedBy: string
  createdAt: string
}

/** Purchase movements only, reduced to the columns of the table. */
export const entryRows = (
  movements: ReadonlyArray<MovementEntry>,
): Array<EntryRow> =>
  movements
    .filter((movement) => movement.type === 'purchase')
    .map((movement) => ({
      id: movement.id,
      orderCode: movement.lotCode,
      productId: movement.productId,
      quantity: movement.quantity,
      receivedBy: movement.actorName,
      createdAt: new Date(movement.createdAt).toISOString(),
    }))
