import { z } from 'zod'

import { publicCustomerId } from '#/shared/demo/customers'

import type {
  CommercialRule,
  CustomerDraft,
  CustomerRecord,
} from '#/modules/customers/lib/customer-types'

const MESSAGES = {
  basics: 'Revisa nombre, límite y plazo.',
  rules: 'Revisa las condiciones comerciales.',
  duplicate: 'No repitas producto y cantidad mínima.',
  public: 'Público general permanece activo y de contado.',
}

/** Blank numeric fields behave as zero, like the reference's number inputs. */
const numberFrom = (value: string) => (value.trim() === '' ? 0 : Number(value))

const isMoney = (value: number) =>
  Number.isFinite(value) &&
  Math.abs(value * 100 - Math.round(value * 100)) < 1e-6

const money = z
  .number()
  .refine(isMoney)
  .refine((value) => value >= 0)

const basicsSchema = z.object({
  name: z.string().trim().min(1),
  creditLimit: money,
  termsDays: z.number().int().min(0),
})

const ruleSchema = z.object({
  minQuantity: z.number().int().min(1),
  discountPercent: z.number().min(0).max(100),
  price: z
    .number()
    .refine(isMoney)
    .refine((value) => value > 0)
    .optional(),
})

export type CustomerValidation =
  { ok: true; customer: CustomerRecord } | { ok: false; message: string }

const fail = (message: string): CustomerValidation => ({ ok: false, message })

/** Validates the form draft and converts it into a stored record. */
export function validateCustomerDraft(
  draft: CustomerDraft,
  previous: CustomerRecord | undefined,
  newId: () => string,
): CustomerValidation {
  const basics = basicsSchema.safeParse({
    name: draft.name,
    creditLimit: numberFrom(draft.creditLimit),
    termsDays: numberFrom(draft.termsDays),
  })
  if (!basics.success) return fail(MESSAGES.basics)

  if (
    draft.id === publicCustomerId &&
    (draft.credit || !draft.active || draft.name !== 'Público general')
  )
    return fail(MESSAGES.public)

  const rules: Array<CommercialRule> = []
  const seen = new Set<string>()
  for (const rule of draft.rules) {
    const parsed = ruleSchema.safeParse({
      minQuantity: numberFrom(rule.minQuantity),
      discountPercent: numberFrom(rule.discountPercent),
      price: rule.price.trim() === '' ? undefined : Number(rule.price),
    })
    if (!parsed.success) return fail(MESSAGES.rules)

    const key = `${rule.productId}:${parsed.data.minQuantity}`
    if (seen.has(key)) return fail(MESSAGES.duplicate)
    seen.add(key)

    rules.push({
      productId: rule.productId,
      minQuantity: parsed.data.minQuantity,
      discountPercent: parsed.data.discountPercent,
      ...(parsed.data.price === undefined
        ? {}
        : { priceCents: Math.round(parsed.data.price * 100) }),
    })
  }

  const base = previous ?? {
    id: newId(),
    contact: '',
    phone: '',
    addresses: [],
    notes: '',
    active: true,
    credit: false,
    creditLimitCents: 0,
    termsDays: 0,
    name: '',
    rules: [],
  }

  return {
    ok: true,
    customer: {
      ...base,
      name: draft.name,
      contact: draft.contact,
      phone: draft.phone,
      active: draft.active,
      addresses: draft.addresses
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean),
      notes: draft.notes,
      credit: draft.credit,
      creditLimitCents: Math.round(basics.data.creditLimit * 100),
      termsDays: basics.data.termsDays,
      rules,
    },
  }
}
