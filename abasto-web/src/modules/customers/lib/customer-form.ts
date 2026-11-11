import { parsePesosToCents } from '#/modules/inventory/lib/cents'
import { parseBps } from '#/modules/pricing/lib/money'
import type { Parsed } from '#/modules/inventory/lib/parsed'
import { DISCOUNT_RANGE_MESSAGE } from '#/modules/customers/lib/customer-inputs'
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
  rules: Array<RuleDraft>
}

const MESSAGES = {
  basics: 'Escribe el nombre del cliente.',
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
  if (bps.ok && (bps.value < 0 || bps.value > 10000)) {
    return fail(DISCOUNT_RANGE_MESSAGE)
  }
  if (!bps.ok || bps.value < 1) return fail(MESSAGES.rules)
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
      rules,
    },
  }
}
