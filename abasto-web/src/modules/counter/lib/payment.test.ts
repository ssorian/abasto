import { describe, expect, test } from 'bun:test'
import {
  changeFor,
  contadoPayment,
  creditRefusalNote,
  receiptLines,
} from '#/modules/counter/lib/payment'

describe('changeFor', () => {
  test('change is tendered minus total, in integer cents', () => {
    expect(changeFor(43850, '500')).toEqual({
      ok: true,
      value: { tenderedCents: 50000, changeCents: 6150 },
    })
    expect(changeFor(1000, '10.00')).toEqual({
      ok: true,
      value: { tenderedCents: 1000, changeCents: 0 },
    })
  })

  test('tendered cash that does not cover the total says how much is missing', () => {
    expect(changeFor(1000, '9.50')).toEqual({
      ok: false,
      message: 'Faltan $0.50 para cubrir el total.',
    })
  })

  test('blank or malformed amounts are refused with the pesos message', () => {
    expect(changeFor(1000, '').ok).toBe(false)
    expect(changeFor(1000, '1,000').ok).toBe(false)
    expect(changeFor(1000, '10.999').ok).toBe(false)
  })
})

describe('contadoPayment', () => {
  test('builds the pickup input shape in cents', () => {
    expect(contadoPayment(1000, '20')).toEqual({
      ok: true,
      value: { terms: 'contado', tenderedCents: 2000 },
    })
    expect(contadoPayment(1000, '5').ok).toBe(false)
  })
})

describe('creditRefusalNote', () => {
  test('tells the clerk the owner was asked when a request was left pending', () => {
    expect(
      creditRefusalNote(
        'Este pedido supera el límite de crédito o el cliente tiene saldo vencido. Pídele al dueño que lo autorice y vuelve a intentar.',
      ),
    ).toBe('Le avisamos al dueño. Cuando lo autorice, vuelve a entregar.')
    expect(
      creditRefusalNote(
        'Este pedido espera la autorización del dueño. Pídele que la apruebe y vuelve a intentar.',
      ),
    ).toBe('Le avisamos al dueño. Cuando lo autorice, vuelve a entregar.')
  })

  test('says nothing for other refusals', () => {
    expect(
      creditRefusalNote('El dueño no autorizó el crédito de este pedido.'),
    ).toBeNull()
    expect(
      creditRefusalNote('Este cliente no tiene crédito habilitado.'),
    ).toBeNull()
  })
})

describe('receiptLines', () => {
  test('cash shows total, tendered and change', () => {
    expect(
      receiptLines(
        1000,
        { terms: 'contado', tenderedCents: 2000, changeCents: 1000 },
        null,
      ),
    ).toEqual([
      ['Total', '$10.00'],
      ['Efectivo recibido', '$20.00'],
      ['Cambio', '$10.00'],
    ])
  })

  test('credit shows the charge and its due date', () => {
    expect(receiptLines(1000, { terms: 'credito' }, '2026-11-11')).toEqual([
      ['Total', '$10.00'],
      ['Cargo a crédito', '$10.00'],
      ['Vence', '11 nov 2026'],
    ])
  })

  test('credit without a known due date omits it', () => {
    expect(receiptLines(1000, { terms: 'credito' }, null)).toEqual([
      ['Total', '$10.00'],
      ['Cargo a crédito', '$10.00'],
    ])
  })
})
