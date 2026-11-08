import { BanknoteIcon, PackageXIcon, TimerIcon, TruckIcon } from 'lucide-react'
import type { ReactNode } from 'react'

import { formatCents } from '#/modules/pricing/lib/money'
import { stockLevels } from '#/modules/reports/lib/manager-chart-data'
import { shortDate, timeLabel } from '#/modules/reports/lib/manager-format'
import type { ManagerDashboard } from '#/modules/reports/types/manager-dashboard'

function AttentionCard({
  color,
  icon,
  label,
  figure,
  note,
}: {
  color: string
  icon: ReactNode
  label: string
  figure: string
  note: string
}) {
  return (
    <div
      className="flex min-w-0 items-center gap-3.5 rounded-xl border border-[#f0e9e1] bg-white px-[18px] py-4 text-ink-row"
      style={{ boxShadow: `inset 0 4px 0 ${color}` }}
    >
      <span style={{ color }} aria-hidden="true">
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <div className="text-[11px] text-ink-muted">{label}</div>
        <div className="text-[19px] font-bold tracking-[-0.7px] text-ink-figure">
          {figure}
        </div>
        <div className="text-xs">{note}</div>
      </div>
    </div>
  )
}

/** What needs action first: low stock, expiring lots, the drawer and pending orders. */
export function ManagerAttention({ data }: { data: ManagerDashboard }) {
  const { lowStock, expiring, expired } = data.stock
  const veryLow = stockLevels(lowStock).filter((row) => row.critical).length
  const atRiskCents = expiring.reduce((sum, lot) => sum + lot.valueCents, 0)
  const firstExpiry = expiring.reduce<string | undefined>(
    (first, lot) => (!first || lot.expiresOn < first ? lot.expiresOn : first),
    undefined,
  )
  const openCut = data.cash.rows.find((row) => row.status === 'open')
  const orders = data.pendingOrders
  const ordersCents = orders.reduce((sum, row) => sum + row.totalCostCents, 0)
  const nextArrival = orders
    .flatMap((row) => (row.expectedOn ? [row.expectedOn] : []))
    .sort()[0]

  return (
    <div className="mb-[18px] grid grid-cols-1 gap-[18px] sm:grid-cols-2 xl:grid-cols-4">
      <AttentionCard
        color="#a77a24"
        icon={<PackageXIcon size={24} />}
        label="Stock bajo"
        figure={
          lowStock.length
            ? `${lowStock.length} ${lowStock.length === 1 ? 'producto' : 'productos'}`
            : 'Todo en orden'
        }
        note={
          lowStock.length
            ? veryLow
              ? `${veryLow} ${veryLow === 1 ? 'está muy bajo' : 'están muy bajos'}`
              : 'Ninguno muy bajo'
            : 'Nada bajo el mínimo'
        }
      />
      <AttentionCard
        color="#bd5754"
        icon={<TimerIcon size={24} />}
        label="Lotes por caducar"
        figure={
          expiring.length
            ? `${expiring.length} ${expiring.length === 1 ? 'lote' : 'lotes'} · ${formatCents(atRiskCents)}`
            : 'Sin lotes por caducar'
        }
        note={
          expired.length
            ? `${expired.length} ya ${expired.length === 1 ? 'caducó' : 'caducaron'}`
            : firstExpiry
              ? `El primero caduca el ${shortDate(firstExpiry)}`
              : `Próximos ${data.stock.expiringDays} días`
        }
      />
      <AttentionCard
        color="#39816e"
        icon={<BanknoteIcon size={24} />}
        label="Caja"
        figure={
          openCut
            ? `Abierta ${timeLabel(openCut.openedAt)}`
            : 'Sin caja abierta'
        }
        note={
          openCut
            ? `Esperado ahora ${formatCents(openCut.expectedCents)}`
            : 'Ningún turno abierto en el periodo'
        }
      />
      <AttentionCard
        color="#557caa"
        icon={<TruckIcon size={24} />}
        label="Pedidos por recibir"
        figure={
          orders.length
            ? `${orders.length} · ${formatCents(ordersCents)}`
            : 'Ninguno'
        }
        note={
          nextArrival
            ? `El próximo llega el ${shortDate(nextArrival)}`
            : orders.length
              ? 'Sin fecha de entrega'
              : 'Nada pendiente con proveedores'
        }
      />
    </div>
  )
}
