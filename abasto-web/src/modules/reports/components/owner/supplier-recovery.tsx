import { formatCents } from '#/modules/pricing/lib/money'
import { ReportCard } from '#/modules/reports/components/owner/chart-kit'
import { supplierWarehouseNote } from '#/modules/reports/lib/report-filters'
import type { SupplierRecovery as SupplierRecoveryData } from '#/modules/reports/types/supplier-recovery'

type Figure = {
  title: string
  cents: number
  hint: string
  parts: Array<{ label: string; cents: number }>
}

const figures = (data: SupplierRecoveryData): Array<Figure> => [
  {
    title: 'Recuperado',
    cents: data.recoveredCents,
    hint: 'Lo que los proveedores devolvieron en el periodo.',
    parts: [
      { label: 'Descontado en pedidos', cents: data.discountedCents },
      { label: 'Repuesto en mercadería', cents: data.replacedCents },
    ],
  },
  {
    title: 'Pendiente',
    cents: data.pendingCents,
    hint: 'Lo que los proveedores aún deben, a hoy.',
    parts: [],
  },
  {
    title: 'Perdido',
    cents: data.lostCents,
    hint: 'Dinero que no se recuperará.',
    parts: [
      { label: 'Merma de proveedor', cents: data.scrappedCents },
      {
        label: 'No reconocido en devoluciones',
        cents: data.unrecognizedCents,
      },
      { label: 'Pérdidas de inventario', cents: data.inventoryLossCents },
    ],
  },
]

/** What suppliers gave back, still owe and what was lost, with each figure's parts. */
export function SupplierRecovery({
  data,
  warehouseFiltered = false,
}: {
  data: SupplierRecoveryData
  /** A warehouse is selected: say that supplier balances ignore it. */
  warehouseFiltered?: boolean
}) {
  return (
    <ReportCard
      title="Dinero con proveedores"
      description={`Faltantes, mercadería dañada y devoluciones con proveedores.${warehouseFiltered ? ` ${supplierWarehouseNote}` : ''}`}
    >
      <dl className="grid gap-[18px] min-[900px]:grid-cols-3">
        {figures(data).map((figure) => (
          <div key={figure.title} className="min-w-0">
            <dt className="text-[13px] font-semibold text-ink-row">
              {figure.title}
            </dt>
            <dd className="mt-1 text-[26px] font-[650] tracking-[-0.6px] text-ink-figure tabular-nums">
              {formatCents(figure.cents)}
            </dd>
            <dd className="mt-0.5 text-xs text-ink-muted">{figure.hint}</dd>
            {figure.parts.length > 0 && (
              <dd>
                <ul className="mt-2.5 grid gap-1 border-t border-[#f0e9e1] pt-2.5 text-[13px]">
                  {figure.parts.map((part) => (
                    <li
                      key={part.label}
                      className="flex justify-between gap-3 text-ink-row"
                    >
                      <span>{part.label}</span>
                      <span className="font-semibold tabular-nums">
                        {formatCents(part.cents)}
                      </span>
                    </li>
                  ))}
                </ul>
              </dd>
            )}
          </div>
        ))}
      </dl>
    </ReportCard>
  )
}
