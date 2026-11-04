import {
  Boxes,
  RotateCcwClock,
  TriangleAlert,
  Truck,
  Wallet,
} from 'lucide-react'

import { PageHeading } from '#/components/page-heading'
import { StatusBadge } from '#/components/status-badge'
import {
  HomePanel,
  HomeRow,
  HomeRowFigure,
} from '#/modules/overview/components/home-panel'
import { OverviewHero } from '#/modules/overview/components/overview-hero'
import { OverviewMetrics } from '#/modules/overview/components/overview-metrics'
import {
  expiringLots,
  openCashRegisters,
  overdueCollections,
  overviewMetrics,
  pendingOrders,
  recentActivity,
  restockItems,
} from '#/modules/overview/lib/overview-fixtures'

const rowStatus = 'text-[10px] max-md:max-w-[110px] max-md:whitespace-normal'

export function OverviewPage() {
  return (
    <>
      <PageHeading
        eyebrow="ABARROTEROS · ALMACÉN"
        title="Inicio"
        description="Una vista del día para decidir qué atender primero."
      />

      <OverviewHero />
      <OverviewMetrics metrics={overviewMetrics} />

      <div className="mt-6 grid grid-cols-1 gap-5 panels:grid-cols-2">
        <HomePanel
          title="Cajas abiertas"
          icon={Wallet}
          actionLabel="Ver caja"
          emptyMessage="No hay turnos abiertos. Abre caja para comenzar la venta en mostrador."
        >
          {openCashRegisters.map((register) => (
            <HomeRow
              key={register.name}
              title={register.name}
              detail={register.detail}
              aside={<HomeRowFigure>{register.amount}</HomeRowFigure>}
            />
          ))}
        </HomePanel>

        <HomePanel
          title="Ventas y entregas"
          icon={Truck}
          actionLabel="Dar seguimiento"
          emptyMessage="No hay operaciones pendientes."
        >
          {pendingOrders.map((order) => (
            <HomeRow
              key={order.folio}
              title={order.customer}
              detail={`${order.folio} · ${order.warehouse}`}
              aside={
                <StatusBadge tone={order.tone} className={rowStatus}>
                  {order.status}
                </StatusBadge>
              }
            />
          ))}
        </HomePanel>

        <HomePanel
          title="Caducidades próximas"
          icon={TriangleAlert}
          actionLabel="Ver inventario"
          emptyMessage="No hay lotes que venzan en los próximos 30 días."
        >
          {expiringLots.map((lot) => (
            <HomeRow
              key={`${lot.warehouse}-${lot.lot}`}
              title={lot.product}
              detail={`${lot.warehouse} · ${lot.lot} · ${lot.expiresOn}`}
              aside={
                <StatusBadge tone={lot.tone} className={rowStatus}>
                  {lot.status}
                </StatusBadge>
              }
            />
          ))}
        </HomePanel>

        <HomePanel
          title="Reposición de inventario"
          icon={Boxes}
          actionLabel="Ver existencias"
          emptyMessage="Los productos con existencias están sobre su mínimo."
        >
          {restockItems.map((item) => (
            <HomeRow
              key={`${item.warehouse}-${item.product}`}
              title={item.product}
              detail={`${item.warehouse} · Mínimo ${item.minimum} ${item.unit}`}
              aside={
                <HomeRowFigure>
                  {item.stock} {item.unit}
                </HomeRowFigure>
              }
            />
          ))}
        </HomePanel>

        <HomePanel
          title="Cobros vencidos"
          icon={Wallet}
          actionLabel="Ver cartera"
          emptyMessage="No hay crédito vencido registrado."
        >
          {overdueCollections.map((collection) => (
            <HomeRow
              key={collection.customer}
              title={collection.customer}
              detail={collection.detail}
              aside={<HomeRowFigure>{collection.amount}</HomeRowFigure>}
            />
          ))}
        </HomePanel>

        <HomePanel
          title="Actividad reciente"
          icon={RotateCcwClock}
          actionLabel="Ver bitácora"
          emptyMessage="Las nuevas operaciones aparecerán aquí con su responsable."
        >
          {recentActivity.map((activity) => (
            <HomeRow
              key={activity.title}
              title={activity.title}
              detail={activity.detail}
              aside={null}
            />
          ))}
        </HomePanel>
      </div>

      <p className="mt-[25px] max-w-[950px] text-[11px] leading-[1.8] text-ink-footnote">
        Hoy se calcula con la fecha de Ciudad de México. Venta entregada y
        dinero cobrado son indicadores diferentes; una venta a crédito puede
        tener cobros en fechas posteriores.
      </p>
    </>
  )
}
