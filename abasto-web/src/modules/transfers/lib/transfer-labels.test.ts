import { describe, expect, test } from 'bun:test'
import {
  cancelDescription,
  lineQuantityLabel,
  receiveShortageWarning,
  rowSubtitle,
  shortageLabel,
  unitCount,
} from '#/modules/transfers/lib/transfer-labels'

const piezas = (quantity: number, receivedQuantity: number | null = null) => ({
  unit: 'piezas',
  quantity,
  receivedQuantity,
})

describe('unitCount', () => {
  test('uses the real unit with the right number', () => {
    expect(unitCount(1, 'piezas')).toBe('1 pieza')
    expect(unitCount(8, 'piezas')).toBe('8 piezas')
    expect(unitCount(0, 'cajas')).toBe('0 cajas')
    expect(unitCount(1, 'bultos')).toBe('1 bulto')
  })

  test('falls back to "unidad(es)" only when the units are mixed', () => {
    expect(unitCount(1, null)).toBe('1 unidad')
    expect(unitCount(3, null)).toBe('3 unidades')
  })
})

describe('lineQuantityLabel', () => {
  test('shows what was sent, or what arrived out of what was sent', () => {
    expect(lineQuantityLabel(piezas(8))).toBe('8 piezas')
    expect(lineQuantityLabel(piezas(1))).toBe('1 pieza')
    expect(lineQuantityLabel(piezas(8, 8))).toBe('8 piezas')
    expect(lineQuantityLabel(piezas(8, 5))).toBe('5 de 8 piezas')
    expect(lineQuantityLabel(piezas(1, 0))).toBe('0 de 1 pieza')
  })
})

describe('transfer sentences', () => {
  const lines = [piezas(1)]
  const mixed = [
    piezas(2),
    { unit: 'cajas', quantity: 1, receivedQuantity: null },
  ]

  test('cancel names the real unit and never says "Las 1 unidades"', () => {
    expect(
      cancelDescription({ toWarehouseName: 'Norte', sentTotal: 1, lines }),
    ).toBe('Lo que va hacia Norte (1 pieza) regresa a sus lotes de origen.')
    expect(
      cancelDescription({
        toWarehouseName: 'Norte',
        sentTotal: 3,
        lines: mixed,
      }),
    ).toBe('Lo que va hacia Norte (3 unidades) regresa a sus lotes de origen.')
  })

  test('receive warning agrees in number', () => {
    expect(receiveShortageWarning(1, lines)).toBe(
      'Falta 1 pieza. Esa diferencia quedará registrada y no cuenta como existencia en ningún almacén.',
    )
    expect(receiveShortageWarning(3, [piezas(8)])).toBe(
      'Faltan 3 piezas. Esa diferencia quedará registrada y no cuenta como existencia en ningún almacén.',
    )
  })

  test('shortage of a received transfer', () => {
    expect(
      shortageLabel({ shortage: 3, sentTotal: 8, lines: [piezas(8)] }),
    ).toBe('Faltaron 3 de 8 piezas')
    expect(shortageLabel({ shortage: 1, sentTotal: 1, lines })).toBe(
      'Faltó 1 de 1 pieza',
    )
  })
})

describe('rowSubtitle', () => {
  const base = {
    fromWarehouseName: 'Almacén A',
    createdByName: 'Dueño Abasto',
  }

  test('an incoming transfer says who sent it and from which warehouse', () => {
    expect(rowSubtitle({ ...base, direction: 'in' })).toBe(
      'Entrada · Enviado por Dueño Abasto desde Almacén A',
    )
  })

  test('an outgoing transfer says the same from the sender side', () => {
    expect(rowSubtitle({ ...base, direction: 'out' })).toBe(
      'Salida · Enviado por Dueño Abasto desde Almacén A',
    )
  })
})
