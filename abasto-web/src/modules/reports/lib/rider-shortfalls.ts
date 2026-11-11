import { formatCents } from '#/modules/pricing/lib/money'
import type { RiderShortfallRow } from '#/modules/reports/types/reports'

/** One sentence about the period's net rider shortage or surplus. */
export function riderShortfallSentence(rows: ReadonlyArray<RiderShortfallRow>) {
  if (rows.length === 0) {
    return 'Ningún reparto liquidado tuvo faltante ni sobrante en el periodo.'
  }
  const net = rows.reduce((total, row) => total + row.netCents, 0)
  const deliveries = rows.reduce((total, row) => total + row.deliveries, 0)
  const count = `${deliveries} ${deliveries === 1 ? 'reparto' : 'repartos'} con diferencia`
  if (net === 0)
    return `Faltantes y sobrantes se compensan en el periodo; ${count}.`
  const side = net < 0 ? 'faltaron' : 'sobraron'
  return `En el periodo ${side} ${formatCents(Math.abs(net))} en repartos; ${count}.`
}

/** "Faltante" / "Sobrante" / "Cuadra" for one rider's net. */
export const riderNetLabel = (netCents: number) =>
  netCents < 0 ? 'Faltante' : netCents > 0 ? 'Sobrante' : 'Compensado'
