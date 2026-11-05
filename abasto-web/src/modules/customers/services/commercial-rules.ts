import { and, asc, eq, inArray } from 'drizzle-orm'
import { db } from '#/db'
import { AppError } from '#/lib/errors'
import { authorize } from '#/modules/access/lib/policy'
import type { Actor } from '#/modules/access/lib/policy'
import { presentations } from '#/modules/catalog/db/schema'
import {
  customerCommercialRules,
  customers,
} from '#/modules/customers/db/schema'
import { customerNotFound } from '#/modules/customers/services/customers'

export type CommercialRule = typeof customerCommercialRules.$inferSelect
/** Exactly one of `discountBps` (1–10000) or `priceCents` (> 0). */
export type CommercialRuleInput = {
  presentationId: string
  /** Minimum quantity in that presentation, integer ≥ 1. */
  minQuantity: number
  discountBps?: number
  priceCents?: number
}
export type CustomerPriceInput = {
  customerId: string
  presentationId: string
  /** Quantity ordered, in the presentation. */
  quantity: number
  listPriceCents: number
}
export type CustomerPrice = {
  unitPriceCents: number
  listPriceCents: number
  rule: CommercialRule | null
}

const INT4_MAX = 2147483647
const invalid = (message: string) => new AppError('invalid', message)
const inRange = (value: number, min: number, max: number) =>
  Number.isInteger(value) && value >= min && value <= max

function validRule(rule: CommercialRuleInput): boolean {
  const { discountBps, priceCents } = rule
  if (!inRange(rule.minQuantity, 1, INT4_MAX)) return false
  if ((discountBps === undefined) === (priceCents === undefined)) return false
  if (discountBps !== undefined) return inRange(discountBps, 1, 10000)
  return inRange(priceCents!, 1, INT4_MAX)
}

/** Any signed-in actor may read a customer's rules (needed to quote a sale). */
export async function listCommercialRules(
  _actor: Actor,
  customerId: string,
  executor: Pick<typeof db, 'select'> = db,
): Promise<Array<CommercialRule>> {
  return executor
    .select()
    .from(customerCommercialRules)
    .where(eq(customerCommercialRules.customerId, customerId))
    .orderBy(
      asc(customerCommercialRules.presentationId),
      asc(customerCommercialRules.minQuantity),
    )
}

/** Replaces the customer's whole rule set in one transaction. */
export async function saveCommercialRules(
  actor: Actor,
  customerId: string,
  rules: Array<CommercialRuleInput>,
): Promise<Array<CommercialRule>> {
  authorize(actor, 'customers.manage')
  if (!rules.every(validRule)) {
    throw invalid('Revisa las condiciones comerciales.')
  }
  const tiers = new Set(
    rules.map((r) => `${r.presentationId}:${r.minQuantity}`),
  )
  if (tiers.size !== rules.length) {
    throw invalid('No repitas producto y cantidad mínima.')
  }
  return db.transaction(async (tx) => {
    const customer = (
      await tx
        .select({ id: customers.id })
        .from(customers)
        .where(eq(customers.id, customerId))
        .for('update')
    ).at(0)
    if (!customer) throw customerNotFound()
    const ids = [...new Set(rules.map((r) => r.presentationId))]
    const known = ids.length
      ? await tx
          .select({ id: presentations.id })
          .from(presentations)
          .where(inArray(presentations.id, ids))
      : []
    if (known.length !== ids.length) {
      throw new AppError('not_found', 'No encontramos esa presentación.')
    }
    await tx
      .delete(customerCommercialRules)
      .where(eq(customerCommercialRules.customerId, customerId))
    if (!rules.length) return []
    await tx.insert(customerCommercialRules).values(
      rules.map((r) => ({
        customerId,
        presentationId: r.presentationId,
        minQuantity: r.minQuantity,
        discountBps: r.discountBps ?? null,
        priceCents: r.priceCents ?? null,
      })),
    )
    return listCommercialRules(actor, customerId, tx)
  })
}

/**
 * Frozen unit price for a customer: the rule with the highest `minQuantity`
 * not above `quantity` applies. A discount rounds once to the nearest cent
 * (half up); a fixed price replaces the list price; no rule keeps the list price.
 * Pass a transaction as `executor` to read inside the caller's transaction.
 */
export async function resolveCustomerPrice(
  input: CustomerPriceInput,
  executor: Pick<typeof db, 'select'> = db,
): Promise<CustomerPrice> {
  const { customerId, presentationId, quantity, listPriceCents } = input
  if (
    !inRange(quantity, 1, INT4_MAX) ||
    !inRange(listPriceCents, 1, INT4_MAX)
  ) {
    throw invalid('Revisa la cantidad y el precio de lista.')
  }
  const customer = (
    await executor
      .select({ id: customers.id })
      .from(customers)
      .where(eq(customers.id, customerId))
  ).at(0)
  if (!customer) throw customerNotFound()
  const rows = await executor
    .select()
    .from(customerCommercialRules)
    .where(
      and(
        eq(customerCommercialRules.customerId, customerId),
        eq(customerCommercialRules.presentationId, presentationId),
      ),
    )
  const rule =
    rows
      .filter((r) => r.minQuantity <= quantity)
      .sort((a, b) => b.minQuantity - a.minQuantity)
      .at(0) ?? null
  let unitPriceCents = listPriceCents
  if (rule?.priceCents != null) unitPriceCents = rule.priceCents
  else if (rule?.discountBps != null) {
    unitPriceCents = Math.floor(
      (listPriceCents * (10000 - rule.discountBps) + 5000) / 10000,
    )
  }
  return { unitPriceCents, listPriceCents, rule }
}
