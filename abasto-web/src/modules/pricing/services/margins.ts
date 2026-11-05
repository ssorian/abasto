import { eq } from 'drizzle-orm'
import { db } from '#/db'
import { AppError } from '#/lib/errors'
import { authorize } from '#/modules/access/lib/policy'
import type { Actor } from '#/modules/access/lib/policy'
import { requireProduct } from '#/modules/inventory/services/stock-ledger'
import { productMargins } from '#/modules/pricing/db/schema'

/** Sets the target margin of a product in basis points (1200 = 12%); zero means no suggestion. */
export async function setProductMargin(
  actor: Actor,
  input: { productId: string; marginBps: number },
) {
  authorize(actor, 'catalog.manage')
  if (!Number.isSafeInteger(input.marginBps) || input.marginBps < 0) {
    throw new AppError('invalid', 'El margen debe ser cero o mayor.')
  }
  await db.transaction(async (tx) => {
    await requireProduct(tx, input.productId)
    await tx
      .insert(productMargins)
      .values(input)
      .onConflictDoUpdate({
        target: productMargins.productId,
        set: { marginBps: input.marginBps },
      })
  })
}

/** Target margin in basis points; zero when unset. Readable by any signed-in user. */
export async function getProductMargin(_actor: Actor, productId: string) {
  const row = (
    await db
      .select({ marginBps: productMargins.marginBps })
      .from(productMargins)
      .where(eq(productMargins.productId, productId))
  ).at(0)
  return row?.marginBps ?? 0
}
