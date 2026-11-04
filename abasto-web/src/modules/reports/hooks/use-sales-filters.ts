import { useMemo, useState } from 'react'

import { businessDate } from '#/lib/utils/format'
import { ALL } from '#/modules/reports/lib/constants'
import { periodRange, shiftReference } from '#/modules/reports/lib/period'
import {
  filterSales,
  groupSales,
  reconcile,
  summarize,
} from '#/modules/reports/lib/sales'

import type {
  GroupMode,
  PeriodMode,
  SaleEvent,
} from '#/modules/reports/types/reports'

/** Period, filters and grouping of "Ventas y utilidad" with the figures derived from them. */
export function useSalesFilters(sales: ReadonlyArray<SaleEvent>) {
  const [period, setPeriod] = useState<PeriodMode>('daily')
  const [reference, setReference] = useState(() => businessDate())
  const [warehouse, setWarehouse] = useState(ALL)
  const [product, setProduct] = useState(ALL)
  const [channel, setChannel] = useState(ALL)
  const [group, setGroup] = useState<GroupMode>('product')

  const range = useMemo(
    () => periodRange(period, reference || businessDate()),
    [period, reference],
  )
  const rows = useMemo(
    () => filterSales(sales, { ...range, warehouse, product, channel }),
    [sales, range, warehouse, product, channel],
  )
  const summary = useMemo(() => summarize(rows), [rows])
  const groups = useMemo(() => groupSales(rows, group), [rows, group])
  const reconciliation = useMemo(
    () => reconcile(rows, summary),
    [rows, summary],
  )

  return {
    period,
    reference,
    warehouse,
    product,
    channel,
    group,
    range,
    rows,
    summary,
    groups,
    reconciliation,
    setPeriod,
    setWarehouse,
    setProduct,
    setChannel,
    setGroup,
    /** Ignores an emptied date input, as the native control reports ''. */
    setReference: (date: string) => date && setReference(date),
    shift: (amount: number) =>
      setReference((current) => shiftReference(period, current, amount)),
    goToToday: () => setReference(businessDate()),
    /** Clears filters and returns to today, so freshly loaded samples are visible. */
    showEverything: () => {
      setWarehouse(ALL)
      setProduct(ALL)
      setChannel(ALL)
      setReference(businessDate())
    },
  }
}
