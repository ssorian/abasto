import { describe, expect, test } from 'bun:test'
import {
  addLine,
  draftToOrderInput,
  removeLine,
  setLineQuantity,
} from '#/modules/counter/lib/order-draft'

describe('order draft', () => {
  test('adding the same presentation again keeps one line', () => {
    let lines = addLine([], 'p1')
    lines = addLine(lines, 'p2')
    lines = addLine(lines, 'p1')
    expect(lines).toEqual([
      { presentationId: 'p1', quantity: '1' },
      { presentationId: 'p2', quantity: '1' },
    ])
  })

  test('set quantity and remove touch only their line', () => {
    const lines = setLineQuantity(addLine(addLine([], 'p1'), 'p2'), 'p2', '7')
    expect(lines[1]).toEqual({ presentationId: 'p2', quantity: '7' })
    expect(removeLine(lines, 'p1')).toEqual([
      { presentationId: 'p2', quantity: '7' },
    ])
  })

  test('builds the service input with whole quantities', () => {
    const parsed = draftToOrderInput({
      warehouseId: 'w1',
      customerId: 'c1',
      notes: '  Pasa a las 5 ',
      lines: [{ presentationId: 'p1', quantity: ' 3 ' }],
    })
    expect(parsed).toEqual({
      ok: true,
      value: {
        warehouseId: 'w1',
        customerId: 'c1',
        notes: 'Pasa a las 5',
        lines: [{ presentationId: 'p1', quantity: 3 }],
      },
    })
  })

  test('asks for a customer, a warehouse and at least one product', () => {
    const base = {
      warehouseId: 'w1',
      customerId: 'c1',
      notes: '',
      lines: [{ presentationId: 'p1', quantity: '1' }],
    }
    const message = (change: object) => {
      const parsed = draftToOrderInput({ ...base, ...change })
      return parsed.ok ? null : parsed.message
    }
    expect(message({ customerId: '' })).toBe('Elige un cliente.')
    expect(message({ warehouseId: '' })).toBe('Elige un almacén.')
    expect(message({ lines: [] })).toBe(
      'Agrega al menos un producto al pedido.',
    )
  })

  test('rejects non-whole, zero, negative or oversized quantities', () => {
    for (const quantity of ['0', '-1', '1.5', '', 'abc', '1e3', '2147483648']) {
      const parsed = draftToOrderInput({
        warehouseId: 'w1',
        customerId: 'c1',
        notes: '',
        lines: [{ presentationId: 'p1', quantity }],
      })
      expect(parsed).toEqual({
        ok: false,
        message:
          'La cantidad de cada producto debe ser un entero mayor que cero.',
      })
    }
  })
})
