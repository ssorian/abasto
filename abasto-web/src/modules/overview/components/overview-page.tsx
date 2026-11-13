import { Link } from '@tanstack/react-router'
import {
  ArrowRight,
  Boxes,
  CircleCheck,
  Clock,
  TriangleAlert,
  Truck,
  Wallet,
} from 'lucide-react'
import type { ReactNode } from 'react'

import { buttonVariants } from '#/components/ui/button'
import { cn } from '#/lib/utils/cn'

import { PageHeading } from '#/components/page-heading'
import { StatusBadge } from '#/components/status-badge'
import {
  HomePanel,
  HomeRow,
  HomeRowFigure,
  homeRowAction,
} from '#/modules/overview/components/home-panel'
import { OverviewMetrics } from '#/modules/overview/components/overview-metrics'
import { attentionOf } from '#/modules/overview/lib/attention'
import { longDate } from '#/modules/overview/lib/long-date'
import { metricsOf } from '#/modules/overview/lib/overview-metrics'
import type { Overview } from '#/modules/overview/types/overview'
import { formatCents } from '#/modules/pricing/lib/money'

const rowStatus = 'text-[10px] max-md:max-w-[110px] max-md:whitespace-normal'

const daysText = (days: number) =>
  days === 0 ? 'Hoy' : days === 1 ? 'Mañana' : `En ${days} días`

const expiredText = (days: number) =>
  days === -1 ? 'Venció ayer' : `Venció hace ${-days} días`

const plural = (count: number, one: string, many: string) =>
  `${count} ${count === 1 ? one : many}`

function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <h2 className="mt-7 mb-3 text-xs font-bold tracking-[1.2px] text-ink-eyebrow uppercase">
      {children}
    </h2>
  )
}

export function OverviewPage({ overview }: { overview: Overview }) {
  const { warehouses } = overview
  const managesMoney = overview.totals.salesCents !== undefined
  const attention = attentionOf(overview)
  // With one warehouse its name on every row is noise.
  const where = (name: string) => (warehouses.length > 1 ? `${name} · ` : '')
  // Money fields come only for warehouses the actor manages; only those get actions.
  const manages = (warehouseId: string) =>
    warehouses.some(
      (item) => item.id === warehouseId && item.salesCents !== undefined,
    )
  const removeLot = (lot: Overview['expired'][number]) =>
    manages(lot.warehouseId) ? (
      <Link
        to="/inventario"
        search={{
          almacen: lot.warehouseId,
          accion: 'quitar',
          producto: lot.productId,
          lote: lot.lotId,
        }}
        className={homeRowAction}
      >
        Quitar
      </Link>
    ) : undefined

  return (
    <>
      <PageHeading
        title="Inicio"
        description={`Lo que necesita atención hoy, ${longDate(overview.today)}.`}
        actions={
          <Link
            to="/mostrador"
            className={cn(
              buttonVariants(),
              'h-auto min-h-11 gap-[9px] rounded-[9px] px-[17px] py-2.5 text-sm font-[650] text-brand-ink hover:bg-brand-hover',
            )}
          >
            Ir a mostrador
            <ArrowRight className="size-[17px]" />
          </Link>
        }
      />

      {warehouses.length === 0 ? (
        <p className="text-sm text-ink-muted">
          Aún no tienes almacenes asignados.
        </p>
      ) : (
        <>
          <SectionTitle>Requiere atención</SectionTitle>
          {attention.isEmpty ? (
            <p className="flex items-center gap-2 rounded-[14px] border border-panel-border bg-white p-[17px] text-sm text-ink-muted md:p-[22px]">
              <CircleCheck size={18} className="text-green-700" />
              Todo en orden: cajas abiertas, sin lotes vencidos ni productos
              bajo el mínimo.
            </p>
          ) : (
            <div className="grid grid-cols-1 items-start gap-5 panels:grid-cols-2">
              {overview.expired.length > 0 && (
                <HomePanel
                  title="Lotes vencidos en existencia"
                  icon={TriangleAlert}
                  tone="danger"
                  actionLabel="Ver inventario"
                  to="/inventario"
                  emptyMessage=""
                >
                  {overview.expired.map((lot) => (
                    <HomeRow
                      key={lot.lotId}
                      title={lot.name}
                      action={removeLot(lot)}
                      detail={`${where(lot.warehouseName)}${lot.onHand} ${lot.unit} · no se pueden vender, registra la pérdida`}
                      aside={
                        <StatusBadge tone="red" className={rowStatus}>
                          {expiredText(lot.daysLeft)}
                        </StatusBadge>
                      }
                    />
                  ))}
                </HomePanel>
              )}

              {attention.closedDrawers.length > 0 && (
                <HomePanel
                  title="Cajas cerradas"
                  icon={Wallet}
                  actionLabel="Abrir caja"
                  to="/mostrador"
                  emptyMessage=""
                >
                  {attention.closedDrawers.map((item) => (
                    <HomeRow
                      key={item.id}
                      title={item.name}
                      detail="Sin caja abierta no se puede cobrar ni liquidar repartos"
                      aside={
                        <StatusBadge tone="gray" className={rowStatus}>
                          Cerrada
                        </StatusBadge>
                      }
                    />
                  ))}
                </HomePanel>
              )}

              {attention.ordersExpiringToday.length > 0 && (
                <HomePanel
                  title="Pedidos que vencen hoy"
                  icon={Clock}
                  actionLabel="Ver pedidos"
                  to="/mostrador"
                  emptyMessage=""
                >
                  {attention.ordersExpiringToday.map((item) => (
                    <HomeRow
                      key={item.id}
                      title={item.name}
                      detail="Si no se entregan hoy, se libera lo reservado"
                      aside={
                        <HomeRowFigure>
                          {plural(
                            item.expiringTodayOrders,
                            'pedido',
                            'pedidos',
                          )}
                        </HomeRowFigure>
                      }
                    />
                  ))}
                </HomePanel>
              )}

              {overview.expiring.length > 0 && (
                <HomePanel
                  title="Por caducar (7 días)"
                  icon={TriangleAlert}
                  actionLabel="Ver inventario"
                  to="/inventario"
                  emptyMessage=""
                >
                  {overview.expiring.map((lot) => (
                    <HomeRow
                      key={lot.lotId}
                      title={lot.name}
                      action={removeLot(lot)}
                      detail={`${where(lot.warehouseName)}${lot.onHand} ${lot.unit}`}
                      aside={
                        <StatusBadge
                          tone={lot.daysLeft <= 1 ? 'red' : 'amber'}
                          className={rowStatus}
                        >
                          {daysText(lot.daysLeft)}
                        </StatusBadge>
                      }
                    />
                  ))}
                </HomePanel>
              )}

              {overview.lowStock.length > 0 && (
                <HomePanel
                  title="Bajo el mínimo"
                  icon={Boxes}
                  actionLabel="Ver existencias"
                  to="/inventario"
                  emptyMessage=""
                >
                  {overview.lowStock.map((item) => (
                    <HomeRow
                      key={`${item.warehouseId}-${item.productId}`}
                      title={item.name}
                      detail={`${where(item.warehouseName)}Mínimo ${item.minimum} ${item.unit}`}
                      action={
                        manages(item.warehouseId) ? (
                          <Link
                            to="/inventario"
                            search={{
                              almacen: item.warehouseId,
                              accion: 'pedido',
                              producto: item.productId,
                            }}
                            className={homeRowAction}
                          >
                            Pedir
                          </Link>
                        ) : undefined
                      }
                      aside={
                        <HomeRowFigure>
                          {item.available} {item.unit}
                        </HomeRowFigure>
                      }
                    />
                  ))}
                </HomePanel>
              )}
            </div>
          )}

          <SectionTitle>Hoy</SectionTitle>
          <OverviewMetrics metrics={metricsOf(overview)} />

          {warehouses.length > 1 && attention.activeWarehouses.length > 0 && (
            <div className="grid grid-cols-1 items-start gap-5 panels:grid-cols-2">
              <HomePanel
                title="Por almacén"
                icon={Truck}
                actionLabel={managesMoney ? 'Ver reportes' : 'Ver pedidos'}
                to={managesMoney ? '/reportes' : '/mostrador'}
                emptyMessage=""
              >
                {attention.activeWarehouses.map((item) => (
                  <HomeRow
                    key={item.id}
                    title={item.name}
                    detail={`${plural(item.openOrders, 'abierto', 'abiertos')} · ${plural(item.pickedUpToday, 'entregado', 'entregados')}${item.marginCents !== undefined ? ` · utilidad ${formatCents(item.marginCents)}` : ''}`}
                    aside={
                      item.salesCents !== undefined ? (
                        <HomeRowFigure>
                          {formatCents(item.salesCents)}
                        </HomeRowFigure>
                      ) : null
                    }
                  />
                ))}
              </HomePanel>
            </div>
          )}

          {managesMoney && (
            <p className="mt-4 text-[11px] text-ink-footnote">
              Las ventas cuentan los pedidos entregados hoy.
            </p>
          )}
        </>
      )}
    </>
  )
}
