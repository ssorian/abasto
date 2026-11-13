import { describe, expect, test } from 'bun:test'
import { tabBadges } from '#/modules/inventory/lib/tab-badges'

describe('tabBadges', () => {
  test('counts orders waiting and open balances', () => {
    const badges = tabBadges({
      orders: [
        { status: 'Pedido' },
        { status: 'Recibido' },
        { status: 'Pedido' },
      ],
      restock: [{}, {}],
      returns: [{}],
    })
    expect(badges).toEqual({ 'Por recibir': 2, Saldos: 3 })
  })

  test('has no badge when there is no work', () => {
    expect(
      tabBadges({
        orders: [{ status: 'Cancelado' }],
        restock: [],
        returns: [],
      }),
    ).toEqual({})
  })
})
