import {
  CardEmpty,
  ManagerCard,
} from '#/modules/reports/components/manager/manager-card'
import { RiderShortfallsTable } from '#/modules/reports/components/rider-shortfalls-table'
import type { RiderShortfallRow } from '#/modules/reports/types/reports'

/** "Faltantes de reparto" of the manager's warehouse for the period. */
export function RiderShortfallsCard({
  rows,
  warehouse,
}: {
  rows: Array<RiderShortfallRow>
  warehouse: string
}) {
  return (
    <ManagerCard
      title="Faltantes de reparto"
      subtitle={`Diferencia entre lo vendido y lo entregado por cada repartidor de ${warehouse} en el periodo.`}
    >
      {rows.length === 0 ? (
        <CardEmpty>No hubo faltantes ni sobrantes de reparto.</CardEmpty>
      ) : (
        <RiderShortfallsTable rows={rows} />
      )}
    </ManagerCard>
  )
}
