import { useState } from 'react'

import { cn } from '#/lib/utils/cn'
import { formatBpsPercent } from '#/modules/executive/lib/format'
import type { MarginReport } from '#/modules/executive/types/profitability'
import { formatCents } from '#/modules/pricing/lib/money'
import {
  Panel,
  PlainTable,
  numericCell,
} from '#/modules/reports/components/owner/owner-panel'
import { TextLink } from '#/modules/reports/components/report-buttons'
import { shareBps } from '#/modules/reports/lib/owner-view'

type View = 'warehouse' | 'supplier' | 'product'

const views: Array<{ value: View; label: string; heading: string }> = [
  { value: 'warehouse', label: 'Por almacén', heading: 'Almacén' },
  { value: 'supplier', label: 'Por proveedor', heading: 'Proveedor' },
  {
    value: 'product',
    label: 'Por producto',
    heading: 'Producto, de mayor a menor utilidad',
  },
]

const firstProducts = 8
const plural = (count: number, one: string, many: string) =>
  `${count} ${count === 1 ? one : many}`

type BreakdownRow = {
  key: string
  name: string
  note: string
  revenueCents: number
  marginCents: number
  marginBps: number | null
}

function rowsOf(margin: MarginReport, view: View): Array<BreakdownRow> {
  if (view === 'product') {
    return [...margin.byProduct]
      .sort((a, b) => b.marginCents - a.marginCents)
      .map((row) => ({ ...row, note: `${row.sku} · ${row.units} ${row.unit}` }))
  }
  const rows = view === 'warehouse' ? margin.byWarehouse : margin.bySupplier
  return [...rows]
    .sort((a, b) => b.revenueCents - a.revenueCents)
    .map((row) => ({
      ...row,
      note:
        view === 'warehouse'
          ? plural(row.orders, 'ticket', 'tickets')
          : plural(row.units, 'unidad vendida', 'unidades vendidas'),
    }))
}

/** Where the sales of the period came from, one table at a time. */
export function SalesBreakdown({ margin }: { margin: MarginReport }) {
  const [view, setView] = useState<View>('warehouse')
  const [showAll, setShowAll] = useState(false)
  const all = rowsOf(margin, view)
  const rows =
    view === 'product' && !showAll ? all.slice(0, firstProducts) : all
  const heading = views.find((item) => item.value === view)?.heading
  return (
    <Panel className="px-[22px] py-5">
      <div className="mb-2.5 flex flex-wrap items-center gap-1">
        <h3 className="mr-auto w-full text-[15px] font-[650] text-ink-figure min-[820px]:w-auto">
          Desglose
        </h3>
        <div
          role="group"
          aria-label="Desglose de ventas"
          className="flex flex-wrap gap-1"
        >
          {views.map((item) => (
            <button
              key={item.value}
              type="button"
              aria-pressed={view === item.value}
              onClick={() => setView(item.value)}
              className={cn(
                'min-h-[34px] rounded-[7px] px-3 py-[5px] text-[13px] text-muted-foreground hover:bg-muted',
                view === item.value &&
                  'bg-secondary font-[650] text-secondary-foreground hover:bg-secondary',
              )}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>
      <PlainTable>
        <thead>
          <tr>
            <th>{heading}</th>
            <th className={numericCell}>Ventas</th>
            <th className={numericCell}>Parte de las ventas</th>
            <th className={numericCell}>Utilidad</th>
            <th className={numericCell}>Margen</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const share = shareBps(
              row.revenueCents,
              margin.summary.revenueCents,
            )
            return (
              <tr key={row.key}>
                <td>
                  {row.name}
                  <small className="block text-xs text-muted-foreground">
                    {row.note}
                  </small>
                </td>
                <td className={numericCell}>{formatCents(row.revenueCents)}</td>
                <td>
                  <div className="flex items-center justify-end gap-2">
                    <span
                      aria-hidden="true"
                      className="hidden h-1.5 w-[72px] overflow-hidden rounded-[3px] bg-muted min-[820px]:block"
                    >
                      <i
                        className="block h-full rounded-[3px] bg-secondary-foreground"
                        style={{ width: `${Math.min(share / 100, 100)}%` }}
                      />
                    </span>
                    <span className="min-w-11 text-right tabular-nums">
                      {formatBpsPercent(share)}
                    </span>
                  </div>
                </td>
                <td
                  className={cn(
                    numericCell,
                    row.marginCents < 0 && 'text-destructive',
                  )}
                >
                  {formatCents(row.marginCents)}
                </td>
                <td className={numericCell}>
                  {formatBpsPercent(row.marginBps)}
                </td>
              </tr>
            )
          })}
        </tbody>
      </PlainTable>
      {view === 'product' && all.length > firstProducts && (
        <TextLink className="mt-2.5" onClick={() => setShowAll(!showAll)}>
          {showAll
            ? `Ver solo los primeros ${firstProducts}`
            : `Ver los ${all.length} productos`}
        </TextLink>
      )}
    </Panel>
  )
}
