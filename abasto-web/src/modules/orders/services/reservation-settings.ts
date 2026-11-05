import { eq } from 'drizzle-orm'
import { db } from '#/db'
import { AppError } from '#/lib/errors'
import { authorize } from '#/modules/access/lib/policy'
import type { Actor } from '#/modules/access/lib/policy'
import { orderSettings } from '#/modules/orders/db/schema'

export const DEFAULT_RESERVATION_HOURS = 24

/** A database or an open transaction. */
type Executor = Pick<typeof db, 'select'>

export async function readReservationHours(executor: Executor = db) {
  const row = (
    await executor
      .select({ hours: orderSettings.reservationHours })
      .from(orderSettings)
      .where(eq(orderSettings.id, 1))
  ).at(0)
  return row?.hours ?? DEFAULT_RESERVATION_HOURS
}

/** Any signed-in actor may read how long a reservation lasts. */
export async function getReservationHours(_actor: Actor) {
  return readReservationHours()
}

/** Owner only: hours an order holds its stock before it expires (1–720). */
export async function setReservationHours(actor: Actor, hours: number) {
  authorize(actor, 'warehouses.manage')
  if (!Number.isInteger(hours) || hours < 1 || hours > 720) {
    throw new AppError(
      'invalid',
      'La duración de la reserva debe ser un número entero de horas entre 1 y 720.',
    )
  }
  await db
    .insert(orderSettings)
    .values({ id: 1, reservationHours: hours, updatedBy: actor.userId })
    .onConflictDoUpdate({
      target: orderSettings.id,
      set: {
        reservationHours: hours,
        updatedBy: actor.userId,
        updatedAt: new Date(),
      },
    })
}
