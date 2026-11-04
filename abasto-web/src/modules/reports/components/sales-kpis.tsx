import { cn } from '#/lib/utils/cn'
import { formatMoney } from '#/modules/reports/lib/money'

import type {
  Reconciliation,
  SalesSummary,
} from '#/modules/reports/types/reports'

type KpiProps = {
  label: string
  value: string | number
  note: string
  dark?: boolean
}

function Kpi({ label, value, note, dark = false }: KpiProps) {
  return (
    <div
      className={cn(
        'flex flex-col gap-[11px] rounded-xl border border-[#e1e8f0] bg-white px-5 py-[23px] max-md:gap-[9px] max-md:px-[13px] max-md:py-[18px]',
        dark && 'border-[#153966] bg-[#153966]',
      )}
    >
      <span
        className={cn(
          'text-xs text-[#6c8199] max-md:text-[11px]',
          dark && 'text-[#cbdaf0]',
        )}
      >
        {label}
      </span>
      <strong
        className={cn(
          'text-[clamp(21px,2.1vw,30px)] font-[650] tracking-[-0.8px] text-ink-figure tabular-nums max-[1101px]:text-[29px] max-md:text-[23px]',
          dark && 'text-[#ffda58]',
        )}
      >
        {value}
      </strong>
      <small
        className={cn(
          'text-[11px] leading-normal text-[#8a99aa] max-md:text-[10px]',
          dark && 'text-[#a8c0dd]',
        )}
      >
        {note}
      </small>
    </div>
  )
}

/** The four headline figures of the period. */
export function SalesKpis({ summary }: { summary: SalesSummary }) {
  return (
    <div className="mt-[22px] mb-[17px] grid grid-cols-4 gap-[15px] max-[1101px]:grid-cols-2 max-md:gap-2.5">
      <Kpi
        label="Ventas netas"
        value={formatMoney(summary.net)}
        note="Después de descuentos y devoluciones"
      />
      <Kpi
        label="Costo de lo vendido"
        value={formatMoney(summary.cost)}
        note="Costo histórico neto de devoluciones"
      />
      <Kpi
        dark
        label="Utilidad bruta"
        value={formatMoney(summary.profit)}
        note={
          summary.margin === null
            ? 'Margen no calculable con ventas netas ≤ 0'
            : `${summary.margin.toFixed(1)}% de margen sobre ventas netas`
        }
      />
      <Kpi
        label="Pedidos con entregas"
        value={summary.orders}
        note={`${formatMoney(summary.refund)} en devoluciones del periodo`}
      />
    </div>
  )
}

/** Gross sales, discounts and refunds that explain the net figure. */
export function SalesReconciliation({ figures }: { figures: Reconciliation }) {
  const items = [
    ['Ventas antes de descuentos', figures.beforeDiscounts],
    ['Descuentos de ventas', figures.discounts],
    ['Devoluciones al precio neto original', figures.refunds],
  ] as const

  return (
    <div className="flex flex-wrap justify-between gap-[15px] px-[3px] py-[13px] text-[11px] text-[#8592a4] md:gap-[22px]">
      {items.map(([label, cents]) => (
        <span key={label} className="max-md:min-w-[130px] max-md:flex-1">
          {label}{' '}
          <b className="mt-[5px] block text-[13px] font-medium text-[#415f80]">
            {formatMoney(cents)}
          </b>
        </span>
      ))}
    </div>
  )
}
