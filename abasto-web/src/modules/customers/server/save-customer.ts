import { AppError } from '#/lib/errors'
import type { Actor } from '#/modules/access/lib/policy'
import type { SaveCustomerInput } from '#/modules/customers/lib/customer-inputs'
import { saveCommercialRules } from '#/modules/customers/services/commercial-rules'
import {
  createCustomer,
  setCustomerCredit,
  updateCustomer,
} from '#/modules/customers/services/customers'

/**
 * Saves basics, credit settings and rules with the customer services. Each
 * service call is its own transaction, so a failure after the customer was
 * created says so instead of leaving the owner guessing.
 */
export async function saveCustomer(actor: Actor, input: SaveCustomerInput) {
  const { id, active, credit, rules, ...basics } = input
  const created = id === undefined
  const first = created
    ? await createCustomer(actor, basics)
    : await updateCustomer(actor, id, { ...basics, active })
  try {
    // A new customer is active; a new inactive one is rare and handled below.
    if (created && !active) await updateCustomer(actor, first.id, { active })
    const customer =
      created && !credit.enabled && credit.limitCents === 0 && !credit.termsDays
        ? first
        : await setCustomerCredit(actor, first.id, {
            enabled: credit.enabled,
            limitCents: credit.limitCents,
            termsDays: credit.termsDays,
          })
    const saved = await saveCommercialRules(actor, first.id, rules)
    return { customer: { ...customer, active }, rules: saved }
  } catch (error) {
    if (created && error instanceof AppError) {
      throw new AppError(
        error.code,
        `El cliente se creó, pero no se guardaron sus condiciones: ${error.message}`,
      )
    }
    throw error
  }
}
