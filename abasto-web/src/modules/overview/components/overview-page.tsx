import { Link } from '@tanstack/react-router'
import { ArrowRight, Boxes, TriangleAlert, Truck, Wallet } from 'lucide-react'

import { buttonVariants } from '#/components/ui/button'
import { cn } from '#/lib/utils/cn'

import { PageHeading } from '#/components/page-heading'
import { StatusBadge } from '#/components/status-badge'
import {
  HomePanel,
  HomeRow,
  HomeRowFigure,
} from '#/modules/overview/components/home-panel'
import { OverviewMetrics } from '#/modules/overview/components/overview-metrics'
import { metricsOf } from '#/modules/overview/lib/overview-metrics'
import type { Overview } from '#/modules/overview/types/overview'
import { formatCents } from '#/modules/pricing/lib/money'

const rowStatus = 'text-[10px] max-md:max-w-[110px] max-md:whitespace-normal'

const daysText = (days: number) =>
  days === 0 ? 'Hoy' : days === 1 ? 'Mañana' : `En ${days} días`

export function OverviewPage({ overview }: { overview: Overview }) {
  const { warehouses, totals } = overview
  const managesMoney = totals.salesCents !== undefined

  return (
    <>
      <PageHeading
        title="Inicio"
        description={`Lo que necesita atención hoy, ${overview.today}.`}
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

      <OverviewMetrics metrics={metricsOf(overview)} />

      {warehouses.length === 0 ? (
        <p className="text-sm text-ink-muted">
          Aún no tienes almacenes asignados.
        </p>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-5 panels:grid-cols-2">
          <HomePanel
            title="Cajas"
            icon={Wallet}
            actionLabel="Ver caja"
            to="/mostrador"
            emptyMessage="No hay almacenes."
          >
            {warehouses.map((item) => (
              <HomeRow
                key={item.id}
                title={item.name}
                detail={
                  item.drawerOpen
                    ? 'Turno abierto'
                    : 'Abre la caja para cobrar en mostrador'
                }
                aside={
                  <StatusBadge
                    tone={item.drawerOpen ? 'green' : 'gray'}
                    className={rowStatus}
                  >
                    {item.drawerOpen ? 'Abierta' : 'Cerrada'}
                  </StatusBadge>
                }
              />
            ))}
          </HomePanel>

          <HomePanel
            title="Pedidos y entregas"
            icon={Truck}
            actionLabel="Ir a mostrador"
            to="/mostrador"
            emptyMessage="No hay pedidos abiertos."
          >
            {warehouses.map((item) => (
              <HomeRow
                key={item.id}
                title={item.name}
                detail={`${item.expiringTodayOrders} vencen hoy · ${item.pickedUpToday} entregados hoy`}
                aside={
                  <HomeRowFigure>
                    {item.openOrders}{' '}
                    {item.openOrders === 1 ? 'abierto' : 'abiertos'}
                  </HomeRowFigure>
                }
              />
            ))}
          </HomePanel>

          <HomePanel
            title="Caducidades próximas"
            icon={TriangleAlert}
            actionLabel="Ver inventario"
            to="/inventario"
            emptyMessage="No hay lotes que caduquen en los próximos 7 días."
          >
            {overview.expiring.map((lot) => (
              <HomeRow
                key={`${lot.warehouseName}-${lot.name}-${lot.lotCode}-${lot.expiresOn}`}
                title={lot.name}
                detail={`${lot.warehouseName} · ${lot.lotCode || 'sin lote'} · ${lot.expiresOn} · ${lot.onHand} ${lot.unit}`}
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

          <HomePanel
            title="Reposición de inventario"
            icon={Boxes}
            actionLabel="Ver existencias"
            to="/inventario"
            emptyMessage="Los productos con mínimo están cubiertos."
          >
            {overview.lowStock.map((item) => (
              <HomeRow
                key={`${item.warehouseName}-${item.name}`}
                title={item.name}
                detail={`${item.warehouseName} · Mínimo ${item.minimum} ${item.unit}`}
                aside={
                  <HomeRowFigure>
                    {item.available} {item.unit}
                  </HomeRowFigure>
                }
              />
            ))}
          </HomePanel>

          {managesMoney && (
            <HomePanel
              title="Ventas de hoy"
              icon={Wallet}
              actionLabel="Ver reportes"
              to="/reportes"
              emptyMessage="Aún no hay ventas hoy."
            >
              {warehouses
                .filter((item) => item.salesCents !== undefined)
                .map((item) => (
                  <HomeRow
                    key={item.id}
                    title={item.name}
                    detail={`Utilidad bruta ${formatCents(item.marginCents ?? 0)}`}
                    aside={
                      <HomeRowFigure>
                        {formatCents(item.salesCents ?? 0)}
                      </HomeRowFigure>
                    }
                  />
                ))}
            </HomePanel>
          )}
        </div>
      )}

      <p className="mt-[25px] max-w-[950px] text-[11px] leading-[1.8] text-ink-footnote">
        Hoy se calcula con la fecha de Ciudad de México. Las ventas cuentan los
        pedidos entregados hoy.
      </p>
    </>
  )
}
