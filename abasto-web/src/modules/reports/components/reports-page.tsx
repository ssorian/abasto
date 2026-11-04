import { useState } from 'react'

import { PageHeading } from '#/components/page-heading'
import { PillTabs } from '#/modules/reports/components/pill-tabs'
import { SalesReport } from '#/modules/reports/components/sales-report'
import { StockReport } from '#/modules/reports/components/stock-report'
import { useSalesData } from '#/modules/reports/hooks/use-sales-data'

type ReportTab = 'Ventas' | 'Inventario'

const tabs: Array<{ value: ReportTab; label: string }> = [
  { value: 'Ventas', label: 'Ventas y utilidad' },
  { value: 'Inventario', label: 'Mermas y rotación' },
]

export function ReportsPage() {
  const [tab, setTab] = useState<ReportTab>('Ventas')
  // Held here so both tabs read the same sales and stock.
  const data = useSalesData()

  return (
    <>
      <PageHeading
        eyebrow="ABARROTEROS · ALMACÉN"
        title="Reportes"
        description="Ventas, costos y utilidad con el detalle de cada lote."
      />
      <PillTabs value={tab} options={tabs} onChange={setTab} />
      {tab === 'Ventas' ? (
        <SalesReport data={data} />
      ) : (
        <StockReport positions={data.positions} sales={data.sales} />
      )}
    </>
  )
}
