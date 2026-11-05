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
      credit: { enabled: false, limitCents: 0, termsDays: 0 },
      rules: [],
    })
  })

  test('keeps the id when editing', () => {
    expect(ok(draft({ id: 'c1' })).id).toBe('c1')
  })

  test('a blank name is rejected', () => {
    expect(message(draft({ name: '  ' }))).toBe(
      'Revisa nombre, límite y plazo.',
    )
  })
})

describe('draftToInput credit', () => {
  test('pesos become integer cents without float drift', () => {
    const credit = ok(
      draft({ credit: true, creditLimit: '1500.10', termsDays: '15' }),
    ).credit
    expect(credit).toEqual({ enabled: true, limitCents: 150010, termsDays: 15 })
    expect(
      ok(draft({ credit: true, creditLimit: '0.29', termsDays: '1' })).credit
        .limitCents,
    ).toBe(29)
  })

  test('a blank limit means zero', () => {
    expect(
      ok(draft({ credit: true, creditLimit: '', termsDays: '7' })).credit,
    ).toEqual({ enabled: true, limitCents: 0, termsDays: 7 })
  })

  test('invalid limit or terms are rejected', () => {
    const basics = 'Revisa nombre, límite y plazo.'
    expect(message(draft({ credit: true, creditLimit: '1.234' }))).toBe(basics)
    expect(message(draft({ credit: true, creditLimit: '-5' }))).toBe(basics)
    expect(message(draft({ credit: true, creditLimit: 'abc' }))).toBe(basics)
    expect(message(draft({ credit: true, termsDays: '2.5' }))).toBe(basics)
    expect(message(draft({ credit: true, termsDays: '-1' }))).toBe(basics)
    expect(message(draft({ credit: true, termsDays: '3651' }))).toBe(basics)
  })

  test('credit off ignores the typed limit and terms', () => {
    expect(
      ok(draft({ credit: false, creditLimit: 'basura', termsDays: 'x' }))
        .credit,
    ).toEqual({ enabled: false, limitCents: 0, termsDays: 0 })
  })
})

describe('draftToInput turning credit off', () => {
  const stored = {
    id: 'c1',
    credit: false,
    creditLimit: '1500.50',
    termsDays: '15',
  }

  test('an existing customer keeps the stored limit and terms', () => {
    expect(ok(draft(stored)).credit).toEqual({
      enabled: false,
      limitCents: 150050,
      termsDays: 15,
    })
  })

  test('a stored zero limit stays zero', () => {
    expect(ok(draft({ ...stored, creditLimit: '' })).credit).toEqual({
      enabled: false,
      limitCents: 0,
      termsDays: 15,
    })
  })

  test('unreadable leftovers fall back to zero instead of blocking the save', () => {
    expect(
      ok(draft({ ...stored, creditLimit: 'basura', termsDays: 'x' })).credit,
    ).toEqual({ enabled: false, limitCents: 0, termsDays: 0 })
  })

  test('a draft built from a customer with credit off round-trips its values', () => {
    const customer = {
      id: 'c1',
      name: 'Don Pepe',
      contact: '',
      phone: '',
      addresses: [],
      notes: '',
      active: true,
      creditEnabled: false,
      creditLimitCents: 250000,
      termsDays: 30,
    }
    expect(ok(draftFromCustomer(customer, [])).credit).toEqual({
      enabled: false,
      limitCents: 250000,
      termsDays: 30,
    })
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
      rule({ discountPercent: '100.01' }),
      rule({ discountPercent: '1.234' }),
      rule({ discountPercent: '-5' }),
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
    creditEnabled: true,
    creditLimitCents: 150050,
    termsDays: 15,
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
      credit: true,
      creditLimit: '1500.50',
      termsDays: '15',
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
    expect(input.credit.limitCents).toBe(150050)
    expect(input.rules).toEqual([
      { presentationId: 'p1', minQuantity: 5, discountBps: 1250 },
      { presentationId: 'p2', minQuantity: 1, priceCents: 43805 },
    ])
  })
})
