import { describe, expect, test } from 'bun:test'
import {
  receiveInputFromDraft,
  shortageOf,
  transferActions,
  transferInputFromDraft,
} from '#/modules/transfers/lib/transfer-drafts'

const line = { productId: 'p1', packs: '2', loose: '3', factor: 12 }

describe('transferInputFromDraft', () => {
  test('converts packs to base units and trims the note', () => {
    expect(
      transferInputFromDraft({
        fromWarehouseId: 'a',
        toWarehouseId: 'b',
        notes: ' Para el sábado ',
        lines: [line],
      }),
    ).toEqual({
      ok: true,
      value: {
        fromWarehouseId: 'a',
        toWarehouseId: 'b',
        notes: 'Para el sábado',
        items: [{ productId: 'p1', quantity: 27 }],
      },
    })
  })

  test('needs a different destination', () => {
    const message = 'Elige un almacén de destino distinto del origen.'
    for (const toWarehouseId of ['', 'a']) {
      expect(
        transferInputFromDraft({
          fromWarehouseId: 'a',
          toWarehouseId,
          notes: '',
          lines: [line],
        }),
      ).toEqual({ ok: false, message })
    }
  })

  test('needs at least one product, each with a quantity', () => {
    const base = { fromWarehouseId: 'a', toWarehouseId: 'b', notes: '' }
    expect(transferInputFromDraft({ ...base, lines: [] })).toEqual({
      ok: false,
      message: 'Agrega al menos un producto.',
    })
    expect(
      transferInputFromDraft({ ...base, lines: [{ ...line, productId: '' }] }),
    ).toEqual({ ok: false, message: 'Selecciona el producto en cada línea.' })
    expect(
      transferInputFromDraft({
        ...base,
        lines: [{ ...line, packs: '', loose: '' }],
      }).ok,
    ).toBe(false)
  })
})

describe('receiveInputFromDraft', () => {
  const lines = [
    { lineId: 'l1', sent: 10, received: '8' },
    { lineId: 'l2', sent: 4, received: '0' },
  ]

  test('reads the received quantity of every line', () => {
    expect(receiveInputFromDraft('t1', lines)).toEqual({
      ok: true,
      value: {
        transferId: 't1',
        lines: [
          { lineId: 'l1', receivedQuantity: 8 },
          { lineId: 'l2', receivedQuantity: 0 },
        ],
      },
    })
  })

  test('rejects more than sent, blanks and decimals', () => {
    expect(
      receiveInputFromDraft('t1', [{ lineId: 'l1', sent: 10, received: '11' }]),
    ).toEqual({
      ok: false,
      message: 'Lo recibido no puede ser mayor que lo enviado.',
    })
    expect(
      receiveInputFromDraft('t1', [{ lineId: 'l1', sent: 10, received: '' }]),
    ).toEqual({ ok: false, message: 'Indica lo recibido en cada línea.' })
    expect(
      receiveInputFromDraft('t1', [{ lineId: 'l1', sent: 10, received: '1.5' }])
        .ok,
    ).toBe(false)
  })
})

describe('shortageOf', () => {
  test('sums what did not arrive and ignores unreadable entries', () => {
    expect(
      shortageOf([
        { sent: 10, received: '8' },
        { sent: 4, received: '4' },
        { sent: 6, received: 'x' },
        { sent: 5, received: '9' },
      ]),
    ).toBe(2)
  })
})

describe('transferActions', () => {
  const transfer = {
    status: 'En tránsito' as const,
    fromWarehouseId: 'a',
    toWarehouseId: 'b',
  }
  const manages = (...ids: Array<string>) => new Set(ids)

  test('the destination manager receives, the source manager cancels', () => {
    expect(transferActions(transfer, manages('b'))).toEqual({
      canReceive: true,
      canCancel: false,
    })
    expect(transferActions(transfer, manages('a'))).toEqual({
      canReceive: false,
      canCancel: true,
    })
    expect(transferActions(transfer, manages('a', 'b'))).toEqual({
      canReceive: true,
      canCancel: true,
    })
  })

  test('nothing to do once it left transit', () => {
    expect(
      transferActions({ ...transfer, status: 'Recibido' }, manages('a', 'b')),
    ).toEqual({ canReceive: false, canCancel: false })
  })
})
