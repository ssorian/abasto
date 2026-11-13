import { describe, expect, test } from 'bun:test'
import {
  draftFromCustomer,
  draftToInput,
  emptyDraft,
} from '#/modules/customers/lib/customer-form'
import type { CustomerDraft } from '#/modules/customers/lib/customer-form'

const draft = (change: Partial<CustomerDraft> = {}): CustomerDraft => ({
  ...emptyDraft(),
  name: 'Abarrotes Don Pepe',
  ...change,
})

const rule = (change: Partial<CustomerDraft['rules'][number]> = {}) => ({
  presentationId: 'p1',
  minQuantity: '5',
  discountPercent: '10',
  price: '',
  ...change,
})

const ok = (value: CustomerDraft) => {
  const parsed = draftToInput(value)
  if (!parsed.ok) throw new Error(parsed.message)
  return parsed.value
}
const message = (value: CustomerDraft) => {
  const parsed = draftToInput(value)
  if (parsed.ok) throw new Error('expected a failure')
  return parsed.message
}

describe('draftToInput basics', () => {
  test('trims text, splits addresses by line and defaults to cash only', () => {
    expect(
      ok(
        draft({
          name: '  La Esquinita ',
          addresses: ' Calle 1 \n\nCalle 2 ',
        }),
      ),
    ).toEqual({
      name: 'La Esquinita',
      contact: '',
      phone: '',
      notes: '',
      addresses: ['Calle 1', 'Calle 2'],
      active: true,
      rules: [],
    })
  })

  test('keeps the id when editing', () => {
    expect(ok(draft({ id: 'c1' })).id).toBe('c1')
  })

  test('a blank name is rejected', () => {
    expect(message(draft({ name: '  ' }))).toBe(
      'Escribe el nombre del cliente.',
    )
  })
})

describe('draftToInput rules', () => {
  test('a percent becomes basis points', () => {
    expect(
      ok(draft({ rules: [rule({ discountPercent: '12.5' })] })).rules,
    ).toEqual([{ presentationId: 'p1', minQuantity: 5, discountBps: 1250 }])
    expect(
      ok(draft({ rules: [rule({ discountPercent: '100' })] })).rules[0],
    ).toMatchObject({ discountBps: 10000 })
  })

  test('an agreed price wins over the discount and becomes cents', () => {
    expect(
      ok(draft({ rules: [rule({ price: '438.50', discountPercent: '10' })] }))
        .rules,
    ).toEqual([{ presentationId: 'p1', minQuantity: 5, priceCents: 43850 }])
  })

  test('rejects an empty, zero, over-100 or too-precise rule', () => {
    const invalid = 'Revisa las condiciones comerciales.'
    for (const bad of [
      rule({ discountPercent: '' }),
      rule({ discountPercent: '0' }),
      rule({ discountPercent: '1.234' }),
      rule({ price: '0' }),
      rule({ price: '1.005' }),
      rule({ minQuantity: '0' }),
      rule({ minQuantity: '2.5' }),
      rule({ minQuantity: '' }),
      rule({ presentationId: '' }),
    ]) {
      expect(message(draft({ rules: [bad] }))).toBe(invalid)
    }
  })

  test('a discount outside 0-100 % names the range', () => {
    for (const discountPercent of ['150', '100.01', '-5']) {
      expect(message(draft({ rules: [rule({ discountPercent })] }))).toBe(
        'El descuento debe estar entre 0 y 100 %.',
      )
    }
  })

  test('the same presentation and minimum twice is rejected', () => {
    expect(
      message(draft({ rules: [rule(), rule({ discountPercent: '5' })] })),
    ).toBe('No repitas producto y cantidad mínima.')
    expect(
      ok(draft({ rules: [rule(), rule({ minQuantity: '10' })] })).rules,
    ).toHaveLength(2)
  })
})

describe('draftFromCustomer', () => {
  const customer = {
    id: 'c1',
    name: 'La Esquinita',
    contact: 'Ana',
    phone: '555',
    addresses: ['Calle 1', 'Calle 2'],
    notes: 'Paga los viernes',
    active: false,
    hasStoreAccess: false,
  }

  test('shows pesos, percents and one address per line', () => {
    const result = draftFromCustomer(customer, [
      {
        presentationId: 'p1',
        minQuantity: 5,
        discountBps: 1250,
        priceCents: null,
      },
      {
        presentationId: 'p2',
        minQuantity: 1,
        discountBps: null,
        priceCents: 43800,
      },
    ])
    expect(result).toMatchObject({
      id: 'c1',
      active: false,
      addresses: 'Calle 1\nCalle 2',
    })
    expect(result.rules).toEqual([
      {
        presentationId: 'p1',
        minQuantity: '5',
        discountPercent: '12.5',
        price: '',
      },
      {
        presentationId: 'p2',
        minQuantity: '1',
        discountPercent: '',
        price: '438.00',
      },
    ])
  })

  test('round-trips through draftToInput', () => {
    const rules = [
      {
        presentationId: 'p1',
        minQuantity: 5,
        discountBps: 1250,
        priceCents: null,
      },
      {
        presentationId: 'p2',
        minQuantity: 1,
        discountBps: null,
        priceCents: 43805,
      },
    ]
    const input = ok(draftFromCustomer(customer, rules))
    expect(input.active).toBe(false)
    expect(input.rules).toEqual([
      { presentationId: 'p1', minQuantity: 5, discountBps: 1250 },
      { presentationId: 'p2', minQuantity: 1, priceCents: 43805 },
    ])
  })
})

describe('new customer defaults', () => {
  test('a new customer starts active with no rules', () => {
    expect(emptyDraft()).toMatchObject({ active: true, rules: [] })
  })
})
