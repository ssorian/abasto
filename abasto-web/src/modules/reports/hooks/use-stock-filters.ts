import { useMemo, useState } from 'react'

import { businessDate } from '#/lib/utils/format'
import { ALL } from '#/modules/reports/lib/constants'
import { lossMovements } from '#/modules/reports/lib/loss-movements'
import { periodRange } from '#/modules/reports/lib/period'
import { agingRows, lossRows } from '#/modules/reports/lib/stock-reports'

import type {
  LossReason,
  PeriodMode,
  SaleEvent,
  StockPosition,
} from '#/modules/reports/types/reports'

export type StockView = 'Bajas' | 'Inmovilizado'

/** Filters of "Mermas y rotación" with the losses and slow-moving stock they select. */
export function useStockFilters(
  positions: ReadonlyArray<StockPosition>,
  sales: ReadonlyArray<SaleEvent>,
) {
  const [view, setView] = useState<StockView>('Bajas')
  const [warehouse, setWarehouse] = useState(ALL)
  const [product, setProduct] = useState(ALL)
  const [period, setPeriod] = useState<PeriodMode>('monthly')
  const [date, setDate] = useState(() => businessDate())
  const [reason, setReason] = useState<LossReason | typeof ALL>(ALL)
  const [days, setDays] = useState(30)

  const range = useMemo(() => periodRange(period, date), [period, date])
  const losses = useMemo(
    () =>
      lossRows(lossMovements, { ...range, warehouse, product }).filter(
        (row) => reason === ALL || row.reason === reason,
      ),
    [range, warehouse, product, reason],
  )
  const aging = useMemo(
    () =>
      agingRows(positions, sales, { warehouse, product, asOf: businessDate() }),
    [positions, sales, warehouse, product],
  )
  const slow = useMemo(
    () =>
      aging
        .filter((row) => row.days !== null && row.days >= days)
        .sort((a, b) => b.valueCents - a.valueCents),
    [aging, days],
  )

  return {
    view,
    warehouse,
    product,
    period,
    date,
    reason,
    days,
    range,
    losses,
    slow,
    totals: {
      lossCents: losses.reduce((sum, row) => sum + row.costCents, 0),
      movements: new Set(losses.map((row) => row.ref)).size,
      products: new Set(losses.map((row) => row.productId)).size,
      immobileCents: slow.reduce((sum, row) => sum + row.valueCents, 0),
      blockedCents: aging.reduce((sum, row) => sum + row.blockedValueCents, 0),
      expiringCents: aging.reduce(
        (sum, row) => sum + row.expiringValueCents,
        0,
      ),
    },
    setView,
    setWarehouse,
    setProduct,
    setPeriod,
    setDate: (value: string) => value && setDate(value),
    setReason,
    setDays,
  }
}
