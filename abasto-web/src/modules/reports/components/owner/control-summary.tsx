import { useState } from 'react'

import { cn } from '#/lib/utils/cn'
import { formatDeltaCents } from '#/modules/executive/lib/format'
import { formatCents } from '#/modules/pricing/lib/money'
import {
  Panel,
  PlainTable,
  numericCell,
} from '#/modules/reports/components/owner/owner-panel'
import {
  cashDifferenceSummary,
  closedCashCuts,
} from '#/modules/reports/lib/owner-series'
import { weekdayLabel } from '#/modules/reports/lib/owner-view'
import {
  cashSupplierNote,
  supplierWarehouseNote,
} from '#/modules/reports/lib/report-filters'
import type { CashCuts } from '#/modules/reports/types/reports'
import type { SupplierRecovery } from '#/modules/reports/types/supplier-recovery'

type Detail = 'cash' | 'riders' | 'suppliers'

type ControlSummaryProps = {
  cashCuts: CashCuts
  /** Absent for a warehouse manager: then only cash cuts and deliveries. */
  supplierRecovery?: SupplierRecovery
  /** One warehouse: the detail tables drop the warehouse column. */
  oneWarehouse?: boolean
  /** A supplier is selected: say that cash does not follow it. */
  supplierFiltered?: boolean
  /** A warehouse is selected: say that supplier balances ignore it. */
  warehouseFiltered?: boolean
  /** Detail shown on arrival; closed unless told otherwise. */
  defaultOpen?: Detail
}

const plural = (count: number, one: string, many: string) =>
  `${count} ${count === 1 ? one : many}`

/**
 * Money that went missing or is at risk in the period: cash cuts, deliveries
 * and suppliers. Three figures; the detail of one opens below on request.
 */
export function ControlSummary({
  cashCuts,
  supplierRecovery,
  supplierFiltered = false,
  warehouseFiltered = false,
  oneWarehouse = false,
  defaultOpen,
}: ControlSummaryProps) {
  const [open, setOpen] = useState<Detail | null>(defaultOpen ?? null)
  const cash = cashDifferenceSummary(cashCuts.rows)
  const riders = cashCuts.riderShortfalls
  const ridersNet = riders.reduce((sum, row) => sum + row.netCents, 0)
  const toggle = (detail: Detail) => setOpen(open === detail ? null : detail)
  return (
    <Panel>
      <div className="flex flex-wrap items-baseline gap-x-2.5 px-[22px] pt-[18px] pb-3">
        <h3 className="text-[15px] font-[650] text-ink-figure">Control</h3>
        <span className="text-xs text-muted-foreground">
          {supplierRecovery
            ? 'Dinero que faltó o está en riesgo en el periodo.'
            : 'Dinero que faltó en el periodo, en caja y en repartos.'}
        </span>
      </div>
      <div
        className={cn(
          'grid border-t border-border',
          supplierRecovery
            ? 'min-[820px]:grid-cols-3'
            : 'min-[820px]:grid-cols-2',
        )}
      >
        <Cell
          detail="cash"
          open={open}
          onToggle={toggle}
          label={supplierRecovery ? 'Caja' : 'Cortes de caja'}
          value={formatDeltaCents(cash.totalCents)}
          tone={toneOf(cash.totalCents)}
          note={
            cash.closed === 0
              ? 'Sin cortes cerrados'
              : cash.withDifference === 0
                ? `${plural(cash.closed, 'corte', 'cortes')} sin diferencia`
                : `${plural(cash.withDifference, 'corte', 'cortes')} con diferencia`
          }
        />
        <Cell
          detail="riders"
          open={open}
          onToggle={toggle}
          label="Repartos"
          value={formatDeltaCents(ridersNet)}
          tone={toneOf(ridersNet)}
          note={
            riders.length === 0
              ? 'Sin faltantes ni sobrantes'
              : `${plural(riders.length, 'repartidor', 'repartidores')} con diferencia`
          }
        />
        {supplierRecovery && (
          <Cell
            detail="suppliers"
            open={open}
            onToggle={toggle}
            label="Proveedores, por recuperar"
            value={formatCents(supplierRecovery.pendingCents)}
            tone={supplierRecovery.pendingCents === 0 ? 'quiet' : undefined}
            note={
              supplierRecovery.lostCents > 0 ? (
                <>
                  <span className="text-destructive">
                    {formatCents(supplierRecovery.lostCents)}
                  </span>{' '}
                  ya perdido
                </>
              ) : (
                'Nada perdido en el periodo'
              )
            }
          />
        )}
      </div>
      {(supplierFiltered || warehouseFiltered) && (
        // The figures above ignore one of the filters: say so next to them.
        <p className="border-t border-border px-[22px] py-2.5 text-xs text-muted-foreground">
          {[
            supplierFiltered && cashSupplierNote,
            warehouseFiltered && supplierWarehouseNote,
          ]
            .filter(Boolean)
            .join(' ')}
        </p>
      )}
      {open === 'cash' && (
        <Drawer id="control-cash">
          <CashDetail cashCuts={cashCuts} oneWarehouse={oneWarehouse} />
        </Drawer>
      )}
      {open === 'riders' && (
        <Drawer id="control-riders">
          <RidersDetail rows={riders} oneWarehouse={oneWarehouse} />
        </Drawer>
      )}
      {open === 'suppliers' && supplierRecovery && (
        <Drawer id="control-suppliers">
          <SuppliersDetail data={supplierRecovery} />
        </Drawer>
      )}
    </Panel>
  )
}

const toneOf = (cents: number) =>
  cents < 0
    ? ('negative' as const)
    : cents === 0
      ? ('quiet' as const)
      : undefined

function Cell({
  detail,
  open,
  onToggle,
  label,
  value,
  tone,
  note,
}: {
  detail: Detail
  open: Detail | null
  onToggle: (detail: Detail) => void
  label: string
  value: string
  tone?: 'negative' | 'quiet'
  note: React.ReactNode
}) {
  const expanded = open === detail
  return (
    <button
      type="button"
      aria-expanded={expanded}
      aria-controls={`control-${detail}`}
      onClick={() => onToggle(detail)}
      className={cn(
        'grid gap-0.5 border-b border-border px-[22px] pt-3.5 pb-4 text-left last:border-b-0 hover:bg-[#fdf9f4] min-[820px]:border-r min-[820px]:border-b-0 min-[820px]:last:border-r-0',
        expanded && 'bg-secondary hover:bg-secondary',
      )}
    >
      <span className="text-[13px] text-muted-foreground">{label}</span>
      <span
        className={cn(
          'text-[22px] leading-[1.15] font-bold tracking-[-0.8px] text-ink-figure tabular-nums',
          tone === 'negative' && 'text-destructive',
          tone === 'quiet' && 'text-muted-foreground',
        )}
      >
        {value}
      </span>
      <span className="text-xs text-muted-foreground">{note}</span>
      <span className="mt-1 text-xs font-semibold text-ink-link">
        {expanded ? 'Ocultar detalle' : 'Ver detalle'}
      </span>
    </button>
  )
}

function Drawer({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <div id={id} className="border-t border-border px-[22px] pt-3.5 pb-4">
      {children}
    </div>
  )
}

const Quiet = ({ children }: { children: React.ReactNode }) => (
  <p className="text-[13px] text-muted-foreground">{children}</p>
)

function DifferenceBadge({ cents }: { cents: number }) {
  if (cents === 0) return null
  return (
    <span
      className={cn(
        'inline-block rounded-full px-[9px] py-0.5 text-xs font-[650]',
        cents < 0
          ? 'bg-[#fbeae7] text-destructive'
          : 'bg-[#e6f3ec] text-[#1d7a4b]',
      )}
    >
      {cents < 0 ? 'Faltante' : 'Sobrante'}
    </span>
  )
}

function CashDetail({
  cashCuts,
  oneWarehouse,
}: {
  cashCuts: CashCuts
  oneWarehouse: boolean
}) {
  const cuts = closedCashCuts(cashCuts.rows)
  if (cuts.length === 0) {
    return <Quiet>No hay cortes cerrados en este periodo.</Quiet>
  }
  return (
    <PlainTable>
      <thead>
        <tr>
          <th>Día</th>
          {!oneWarehouse && <th>Almacén</th>}
          <th>Cerró</th>
          <th className={numericCell}>Esperado</th>
          <th className={numericCell}>Contado</th>
          <th className={numericCell}>Diferencia</th>
          <th>
            <span className="sr-only">Resultado</span>
          </th>
        </tr>
      </thead>
      <tbody>
        {cuts.map((cut) => (
          <tr key={cut.sessionId}>
            <td>{weekdayLabel(cut.day)}</td>
            {!oneWarehouse && <td>{cut.warehouseName}</td>}
            <td>{cut.closedByName ?? '—'}</td>
            <td className={numericCell}>{formatCents(cut.expectedCents)}</td>
            <td className={numericCell}>
              {formatCents(cut.countedCents ?? 0)}
            </td>
            <td
              className={cn(
                numericCell,
                cut.differenceCents < 0 && 'text-destructive',
              )}
            >
              {formatDeltaCents(cut.differenceCents)}
            </td>
            <td className="text-right">
              <DifferenceBadge cents={cut.differenceCents} />
            </td>
          </tr>
        ))}
      </tbody>
    </PlainTable>
  )
}

function RidersDetail({
  rows,
  oneWarehouse,
}: {
  rows: CashCuts['riderShortfalls']
  oneWarehouse: boolean
}) {
  if (rows.length === 0) {
    return (
      <Quiet>
        Ningún reparto liquidado tuvo faltante ni sobrante en el periodo.
      </Quiet>
    )
  }
  return (
    <PlainTable>
      <thead>
        <tr>
          <th>Repartidor</th>
          {!oneWarehouse && <th>Almacén</th>}
          <th className={numericCell}>Entregas</th>
          <th className={numericCell}>Faltante</th>
          <th className={numericCell}>Sobrante</th>
          <th className={numericCell}>Neto</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={`${row.riderId}-${row.warehouseId}`}>
            <td>{row.riderName}</td>
            {!oneWarehouse && <td>{row.warehouseName}</td>}
            <td className={numericCell}>{row.deliveries}</td>
            <td className={numericCell}>{formatCents(row.shortfallCents)}</td>
            <td className={numericCell}>{formatCents(row.surplusCents)}</td>
            <td
              className={cn(
                numericCell,
                row.netCents < 0 && 'text-destructive',
              )}
            >
              {formatDeltaCents(row.netCents)}
            </td>
          </tr>
        ))}
      </tbody>
    </PlainTable>
  )
}

function SuppliersDetail({ data }: { data: SupplierRecovery }) {
  const groups = [
    {
      title: 'Recuperado',
      totalCents: data.recoveredCents,
      lines: [
        ['Descontado en pedidos', data.discountedCents],
        ['Repuesto en mercadería', data.replacedCents],
      ] as const,
    },
    {
      title: 'Pendiente, a hoy',
      totalCents: data.pendingCents,
      text: 'Lo que los proveedores aún deben.',
      lines: [] as ReadonlyArray<readonly [string, number]>,
    },
    {
      title: 'Perdido',
      totalCents: data.lostCents,
      negative: data.lostCents > 0,
      lines: [
        ['Merma de proveedor', data.scrappedCents],
        ['No reconocido en devoluciones', data.unrecognizedCents],
        ['Pérdidas de inventario', data.inventoryLossCents],
      ] as const,
    },
  ]
  return (
    <div className="grid gap-5 min-[820px]:grid-cols-3">
      {groups.map((group) => (
        <dl key={group.title} className="text-[13px] text-ink-row">
          <div className="mb-1 flex items-baseline justify-between gap-2 border-b border-border pb-1.5">
            <dt className="text-xs text-muted-foreground">{group.title}</dt>
            <dd
              className={cn(
                'text-[15px] font-bold text-ink-figure tabular-nums',
                group.negative && 'text-destructive',
              )}
            >
              {formatCents(group.totalCents)}
            </dd>
          </div>
          {group.text && <p className="py-[3px]">{group.text}</p>}
          {group.lines.map(([label, cents]) => (
            <div key={label} className="flex justify-between gap-2 py-[3px]">
              <dt>{label}</dt>
              <dd className="tabular-nums">{formatCents(cents)}</dd>
            </div>
          ))}
        </dl>
      ))}
    </div>
  )
}
