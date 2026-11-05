import { parsePesosToCents } from '#/modules/inventory/lib/cents'
import { parseBps } from '#/modules/pricing/lib/money'
import type { Parsed } from '#/modules/inventory/lib/parsed'
import type { SaveCustomerInput } from '#/modules/customers/lib/customer-inputs'
import type {
  CustomerView,
  RuleView,
} from '#/modules/customers/lib/customer-view'

/** Form-side rule: every editable number stays a string while typing. */
export type RuleDraft = {
  presentationId: string
  minQuantity: string
  /** Percent as typed ("12.5"); ignored when `price` is filled. */
  discountPercent: string
  /** Agreed unit price in pesos as typed; replaces the list price. */
  price: string
}

export type CustomerDraft = {
  id?: string
  name: string
  contact: string
  phone: string
  active: boolean
  /** One address per line. */
  addresses: string
  notes: string
  credit: boolean
  creditLimit: string
  termsDays: string
  rules: Array<RuleDraft>
}

const MESSAGES = {
  basics: 'Revisa nombre, límite y plazo.',
  rules: 'Revisa las condiciones comerciales.',
  duplicate: 'No repitas producto y cantidad mínima.',
}
const INT4_MAX = 2147483647

export const emptyDraft = (): CustomerDraft => ({
  name: '',
  contact: '',
  phone: '',
  active: true,
  addresses: '',
  notes: '',
  credit: false,
  creditLimit: '',
  termsDays: '15',
  rules: [],
})

export const emptyRule = (presentationId = ''): RuleDraft => ({
  presentationId,
  minQuantity: '10',
  discountPercent: '5',
  price: '',
})

/** 150050 → "1500.50" using digits only; 0 → "". */
const centsToPesos = (cents: number) =>
  cents
    ? `${Math.floor(cents / 100)}.${String(cents % 100).padStart(2, '0')}`
    : ''

const bpsToPercent = (bps: number) => String(bps / 100)

export const draftFromCustomer = (
  customer: CustomerView,
  rules: ReadonlyArray<RuleView>,
): CustomerDraft => ({
  id: customer.id,
  name: customer.name,
  contact: customer.contact,
  phone: customer.phone,
  active: customer.active,
  addresses: customer.addresses.join('\n'),
  notes: customer.notes,
  credit: customer.creditEnabled,
  creditLimit: centsToPesos(customer.creditLimitCents),
  termsDays: String(customer.termsDays),
  rules: rules.map((rule) => ({
    presentationId: rule.presentationId,
    minQuantity: String(rule.minQuantity),
    discountPercent:
      rule.discountBps === null ? '' : bpsToPercent(rule.discountBps),
    price: rule.priceCents === null ? '' : centsToPesos(rule.priceCents),
  })),
})

const fail = (message: string): Parsed<never> => ({ ok: false, message })

/** A whole number typed as text; blank means `blank`. */
function wholeNumber(text: string, blank: number | null) {
  const clean = text.trim()
  if (!clean) return blank
  return /^\d+$/.test(clean) && Number(clean) <= INT4_MAX ? Number(clean) : null
}

function parseRule(
  rule: RuleDraft,
): Parsed<SaveCustomerInput['rules'][number]> {
  const minQuantity = wholeNumber(rule.minQuantity, null)
  if (!rule.presentationId || !minQuantity) return fail(MESSAGES.rules)
  if (rule.price.trim()) {
    const price = parsePesosToCents(rule.price)
    if (!price.ok) return fail(MESSAGES.rules)
    return {
      ok: true,
      value: {
        presentationId: rule.presentationId,
        minQuantity,
        priceCents: price.value,
      },
    }
  }
  const bps = parseBps(rule.discountPercent)
  if (!bps.ok || bps.value < 1 || bps.value > 10000) return fail(MESSAGES.rules)
  return {
    ok: true,
    value: {
      presentationId: rule.presentationId,
      minQuantity,
      discountBps: bps.value,
    },
  }
}

/** Validates the form and converts it into the server input (pesos → cents, % → bps). */
export function draftToInput(draft: CustomerDraft): Parsed<SaveCustomerInput> {
  const name = draft.name.trim()
  if (!name) return fail(MESSAGES.basics)

  let credit: SaveCustomerInput['credit'] = {
    enabled: false,
    limitCents: 0,
    termsDays: 0,
  }
  if (draft.credit) {
    const limit = draft.creditLimit.trim()
      ? parsePesosToCents(draft.creditLimit, { allowZero: true })
      : ({ ok: true, value: 0 } as const)
    const termsDays = wholeNumber(draft.termsDays, 0)
    if (!limit.ok || termsDays === null || termsDays > 3650) {
      return fail(MESSAGES.basics)
    }
    credit = { enabled: true, limitCents: limit.value, termsDays }
  }

  const rules: SaveCustomerInput['rules'] = []
  const seen = new Set<string>()
  for (const rule of draft.rules) {
    const parsed = parseRule(rule)
    if (!parsed.ok) return parsed
    const key = `${parsed.value.presentationId}:${parsed.value.minQuantity}`
    if (seen.has(key)) return fail(MESSAGES.duplicate)
    seen.add(key)
    rules.push(parsed.value)
  }

  return {
    ok: true,
    value: {
      ...(draft.id ? { id: draft.id } : {}),
      name,
      contact: draft.contact.trim(),
      phone: draft.phone.trim(),
      notes: draft.notes.trim(),
      addresses: draft.addresses
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean),
      active: draft.active,
      credit,
      rules,
    },
  }
}
