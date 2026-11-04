import { useState } from 'react'

import { businessDate } from '#/lib/utils/format'
import { buildSampleScenario } from '#/modules/reports/lib/sample-sales'
import {
  demoPositions,
  withPosition,
} from '#/modules/reports/lib/stock-positions'

import type {
  SaleEvent,
  SampleScenario,
  StockPosition,
} from '#/modules/reports/types/reports'

const newId = (prefix: string) =>
  `${prefix}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`

/**
 * Local data shared by both report tabs: delivered sales (none at first) and warehouse
 * stock. Loading the samples is a two-step action: stage it, then confirm with a reason.
 */
export function useSalesData() {
  const [sales, setSales] = useState<Array<SaleEvent>>([])
  const [positions, setPositions] = useState<Array<StockPosition>>(() =>
    demoPositions(businessDate()),
  )
  const [staged, setStaged] = useState<SampleScenario | null>(null)

  return {
    sales,
    positions,
    staged,
    stageSamples: () => setStaged(buildSampleScenario(new Date(), newId)),
    cancelSamples: () => setStaged(null),
    /** Registers the staged samples; returns false when nothing was staged. */
    confirmSamples: () => {
      if (!staged) return false
      setSales((current) => [...staged.sales, ...current])
      setPositions((current) => withPosition(current, staged.position))
      setStaged(null)
      return true
    },
  }
}
