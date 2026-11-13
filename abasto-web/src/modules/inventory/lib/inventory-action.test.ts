import { describe, expect, test } from 'bun:test'
import { inventoryActionOf } from '#/modules/inventory/lib/inventory-action'

describe('inventoryActionOf', () => {
  test('"quitar" opens the removal of one lot of a product', () => {
    expect(
      inventoryActionOf({ accion: 'quitar', producto: 'p1', lote: 'l1' }),
    ).toEqual({ kind: 'quitar', productId: 'p1', lotId: 'l1' })
  })

  test('"pedido" opens a supplier order for a product', () => {
    expect(inventoryActionOf({ accion: 'pedido', producto: 'p1' })).toEqual({
      kind: 'pedido',
      productId: 'p1',
    })
  })

  test('anything incomplete or unknown is no action', () => {
    expect(inventoryActionOf({})).toBeUndefined()
    expect(
      inventoryActionOf({ accion: 'quitar', producto: 'p1' }),
    ).toBeUndefined()
    expect(inventoryActionOf({ accion: 'pedido' })).toBeUndefined()
    expect(
      inventoryActionOf({ accion: 'borrar', producto: 'p1' }),
    ).toBeUndefined()
    expect(inventoryActionOf({ accion: 'pedido', producto: 7 })).toBeUndefined()
    expect(
      inventoryActionOf({ accion: 'pedido', producto: '' }),
    ).toBeUndefined()
  })
})
