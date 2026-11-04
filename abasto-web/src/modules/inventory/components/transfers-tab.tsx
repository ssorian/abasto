import { PlusIcon, TruckIcon } from 'lucide-react'

import { ActionButton } from '#/modules/inventory/components/action-button'
import { EmptyPanel } from '#/modules/inventory/components/empty-panel'
import { StockBadge } from '#/modules/inventory/components/stock-badge'
import { SectionRow } from '#/modules/inventory/components/section-row'
import { WarningInline } from '#/modules/inventory/components/info-blocks'
import { requireProduct } from '#/modules/inventory/lib/catalog'
import { dateLabel } from '#/modules/inventory/lib/format'

import type {
  Transfer,
  WarehouseScope,
} from '#/modules/inventory/types/inventory'

type TransfersTabProps = {
  transfers: ReadonlyArray<Transfer>
  warehouse: WarehouseScope
  onNew: () => void
  onReceive: (transfer: Transfer) => void
}

export function TransfersTab({
  transfers,
  warehouse,
  onNew,
  onReceive,
}: TransfersTabProps) {
  const rows = transfers.filter(
    (item) =>
      warehouse === 'Todos' || item.from === warehouse || item.to === warehouse,
  )

  return (
    <>
      <SectionRow
        title="Mercancía en movimiento"
        description="El destino tendrá existencias al confirmar lo que recibió."
        action={
          <ActionButton
            onClick={onNew}
            className="max-md:min-h-[38px] max-md:px-2.5 max-md:py-2 max-md:text-xs"
          >
            <PlusIcon size={16} />
            Nuevo traslado
          </ActionButton>
        }
      />
      <div className="grid gap-5 tablet:grid-cols-2">
        {rows.map((transfer) => {
          const product = requireProduct(transfer.productId)
          return (
            <article
              key={transfer.id}
              className="rounded-[12px] border border-[#dfe5ed] bg-white p-5 md:p-6"
            >
              <div className="flex items-center justify-between gap-3">
                <strong className="text-xs text-[#657b96]">
                  {transfer.id}
                </strong>
                <StockBadge
                  value={transfer.status}
                  className="max-w-[155px] text-center whitespace-normal"
                />
              </div>
              <h3 className="mt-5 text-xl font-[650] tracking-[-0.4px]">
                {transfer.from} <span className="text-[#788596]">→</span>{' '}
                {transfer.to}
              </h3>
              <p className="mt-1.5 text-xs">{product.name}</p>
              <div className="flex gap-[30px] py-5 md:gap-[25px]">
                <span className="text-xs text-[#7c899a]">
                  Enviadas
                  <b className="mt-1.5 block text-[17px] text-[#15375e]">
                    {transfer.qty} {product.unit}
                  </b>
                </span>
                <span className="text-xs text-[#7c899a]">
                  Recibidas
                  <b className="mt-1.5 block text-[17px] text-[#15375e]">
                    {transfer.received ?? 'Pendiente'}
                  </b>
                </span>
              </div>
              {!!transfer.missing && (
                <WarningInline>
                  {transfer.missing} faltantes registrados. {transfer.note}
                </WarningInline>
              )}
              {transfer.status === 'En tránsito' ? (
                <ActionButton
                  tone="primary"
                  full
                  className="mt-3"
                  onClick={() => onReceive(transfer)}
                >
                  <TruckIcon size={16} />
                  Recibir traslado
                </ActionButton>
              ) : (
                <p className="my-3 text-xs text-[#8b99aa]">
                  Recepción cerrada ·{' '}
                  {transfer.receivedAt ? dateLabel(transfer.receivedAt) : ''}
                </p>
              )}
            </article>
          )
        })}
      </div>
      {!rows.length && (
        <EmptyPanel
          icon={TruckIcon}
          title="Aún no hay traslados"
          description="Envía mercancía entre almacenes y confirma su recepción."
        />
      )}
    </>
  )
}
