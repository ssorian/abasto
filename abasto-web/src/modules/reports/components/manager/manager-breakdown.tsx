import { useState } from 'react'

import { cn } from '#/lib/utils/cn'
import { formatBpsPercent } from '#/modules/executive/lib/format'
import { metricsOf } from '#/modules/executive/lib/profitability'
import { formatCents } from '#/modules/pricing/lib/money'
import {
  Panel,
  PlainTable,
  ShareCell,
  numericCell,
} from '#/modules/reports/components/owner/owner-panel'
import { TextLink } from '#/modules/reports/components/report-buttons'
import { shareBps } from '#/modules/reports/lib/owner-view'
import type { SalesReport } from '#/modules/reports/types/reports'

type View = 'product' | 'channel'

const views: Array<{ value: View; label: string }> = [
  { value: 'product', label: 'Por producto' },
  { value: 'channel', label: 'Por canal' },
]

const firstProducts = 8
const plural = (count: number, one: string, many: string) =>
  `${count} ${count === 1 ? one : many}`
const byRevenue = <T extends { revenueCents: number }>(
  rows: ReadonlyArray<T>,
) => [...rows].sort((a, b) => b.revenueCents - a.revenueCents)

/** Where the sales of one warehouse came from: by product or by channel. */
export function ManagerBreakdown({ sales }: { sales: SalesReport }) {
  const [view, setView] = useState<View>('product')
  const [showAll, setShowAll] = useState(false)
  const total = sales.summary.revenueCents
  const products = byRevenue(sales.byProduct)
  const shown = showAll ? products : products.slice(0, firstProducts)
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
      {view === 'product' ? (
        <>
          <PlainTable>
            <thead>
              <tr>
                <th>Producto, de mayor a menor venta</th>
                <th className={numericCell}>Unidades</th>
                <th className={numericCell}>Ventas</th>
                <th className={numericCell}>Parte de las ventas</th>
                <th className={numericCell}>Utilidad</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((row) => (
                <tr key={row.key}>
                  <td>
                    {row.name}
                    <small className="block text-xs text-muted-foreground">
                      {row.sku}
                    </small>
                  </td>
                  <td className={numericCell}>
                    {row.units} {row.unit}
                  </td>
                  <td className={numericCell}>
                    {formatCents(row.revenueCents)}
                  </td>
                  <ShareCell shareBps={shareBps(row.revenueCents, total)} />
                  <td
                    className={cn(
                      numericCell,
                      row.marginCents < 0 && 'text-destructive',
                    )}
                  >
                    {formatCents(row.marginCents)}
                  </td>
                </tr>
              ))}
            </tbody>
          </PlainTable>
          {products.length > firstProducts && (
            <TextLink className="mt-2.5" onClick={() => setShowAll(!showAll)}>
              {showAll
                ? `Ver solo los primeros ${firstProducts}`
                : `Ver los ${products.length} productos`}
            </TextLink>
          )}
        </>
      ) : (
        <PlainTable>
          <thead>
            <tr>
              <th>Canal</th>
              <th className={numericCell}>Ventas</th>
              <th className={numericCell}>Parte de las ventas</th>
              <th className={numericCell}>Utilidad</th>
              <th className={numericCell}>Margen</th>
            </tr>
          </thead>
          <tbody>
            {byRevenue(sales.byChannel).map((row) => (
              <tr key={row.key}>
                <td>
                  {row.name}
                  <small className="block text-xs text-muted-foreground">
                    {plural(row.orders, 'ticket', 'tickets')}
                  </small>
                </td>
                <td className={numericCell}>{formatCents(row.revenueCents)}</td>
                <ShareCell shareBps={shareBps(row.revenueCents, total)} />
                <td
                  className={cn(
                    numericCell,
                    row.marginCents < 0 && 'text-destructive',
                  )}
                >
                  {formatCents(row.marginCents)}
                </td>
                <td className={numericCell}>
                  {formatBpsPercent(
                    metricsOf(row.revenueCents, row.costCents, row.orders)
                      .marginBps,
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </PlainTable>
      )}
    </Panel>
  )
}
