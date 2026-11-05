import {
  ArrowDownLeftIcon,
  ArrowUpRightIcon,
  PackageCheckIcon,
  PlusIcon,
  TruckIcon,
  XIcon,
} from 'lucide-react'

import { ActionButton } from '#/modules/inventory/components/action-button'
import { EmptyPanel } from '#/modules/inventory/components/empty-panel'
import {
  ListBody,
  ListCell,
  ListHead,
  ListPanel,
  ListRow,
  ListTable,
} from '#/modules/inventory/components/list-panel'
import { SectionRow } from '#/modules/inventory/components/section-row'
import { StockBadge } from '#/modules/inventory/components/stock-badge'
import { dateLabel, timeLabel } from '#/modules/inventory/lib/format'
import { transferActions } from '#/modules/transfers/lib/transfer-drafts'
import type { TransferListItem } from '#/modules/transfers/services/transfer-reads'

type TransfersTabProps = {
  transfers: ReadonlyArray<TransferListItem>
  /** Ids of the warehouses the actor manages. */
  manages: ReadonlySet<string>
  /** The selected warehouse can send (the actor manages it and there are destinations). */
  canSend: boolean
  onNew: () => void
  onReceive: (transfer: TransferListItem) => void
  onCancel: (transfer: TransferListItem) => void
}

/** Transfers leaving or arriving at the selected warehouse. */
export function TransfersTab({
  transfers,
  manages,
  canSend,
  onNew,
  onReceive,
  onCancel,
}: TransfersTabProps) {
  return (
    <>
      <SectionRow
        title="Traslados entre almacenes"
        description="Lo que sale hacia otro almacén y lo que está por llegar. Lo que no llega queda registrado como diferencia."
        action={
          canSend ? (
            <ActionButton tone="primary" onClick={onNew}>
              <PlusIcon size={19} />
              Nuevo traslado
            </ActionButton>
          ) : undefined
        }
      />
      {transfers.length ? (
        <ListPanel>
          <ListTable>
            <ListHead>
              {['Traslado', 'Productos', 'Estado', 'Fecha', '']}
            </ListHead>
            <ListBody>
              {transfers.map((transfer) => (
                <TransferRow
                  key={transfer.id}
                  transfer={transfer}
                  manages={manages}
                  onReceive={onReceive}
                  onCancel={onCancel}
                />
              ))}
            </ListBody>
          </ListTable>
        </ListPanel>
      ) : (
        <EmptyPanel
          icon={TruckIcon}
          title="Aún no hay traslados"
          description={
            canSend
              ? 'Envía mercancía a otro almacén y aparecerá aquí.'
              : 'Los traslados de este almacén aparecerán aquí.'
          }
        />
      )}
    </>
  )
}

function TransferRow({
  transfer,
  manages,
  onReceive,
  onCancel,
}: {
  transfer: TransferListItem
  manages: ReadonlySet<string>
  onReceive: (transfer: TransferListItem) => void
  onCancel: (transfer: TransferListItem) => void
}) {
  const outgoing = transfer.direction === 'out'
  const Icon = outgoing ? ArrowUpRightIcon : ArrowDownLeftIcon
  const { canReceive, canCancel } = transferActions(transfer, manages)
  const created = new Date(transfer.createdAt).toISOString()
  return (
    <ListRow>
      <ListCell>
        <span className="flex items-center gap-[11px]">
          <span
            className={
              outgoing
                ? 'flex size-[34px] shrink-0 items-center justify-center rounded-[9px] bg-[#fbf0eb] text-[#c08169]'
                : 'flex size-[34px] shrink-0 items-center justify-center rounded-[9px] bg-[#edf7f2] text-[#408d76]'
            }
          >
            <Icon size={18} />
          </span>
          <span>
            <strong className="text-[#5f4a51]">
              {outgoing
                ? `Hacia ${transfer.toWarehouseName}`
                : `Desde ${transfer.fromWarehouseName}`}
            </strong>
            <small className="block text-[#907e84]">
              {outgoing ? 'Salida' : 'Entrada'} · {transfer.createdByName}
            </small>
          </span>
        </span>
      </ListCell>
      <ListCell>
        {transfer.lines.map((line) => (
          <span key={line.id} className="block">
            <strong>{line.productName}</strong>{' '}
            {line.receivedQuantity !== null &&
            line.receivedQuantity !== line.quantity
              ? `${line.receivedQuantity} de ${line.quantity}`
              : line.quantity}{' '}
            {line.unit}
            {line.lotCode ? (
              <small className="ml-1 text-[#907e84]">lote {line.lotCode}</small>
            ) : null}
          </span>
        ))}
        {transfer.notes && (
          <small className="block text-[#907e84]">{transfer.notes}</small>
        )}
      </ListCell>
      <ListCell>
        <StockBadge value={transfer.status} />
        {transfer.shortage > 0 && (
          <small className="block text-[#a08442]">
            Faltaron {transfer.shortage} de {transfer.sentTotal} unidades
          </small>
        )}
      </ListCell>
      <ListCell>
        {dateLabel(created)}
        <small className="block text-[#907e84]">{timeLabel(created)}</small>
      </ListCell>
      <ListCell>
        <span className="flex flex-wrap justify-end gap-2">
          {canReceive && (
            <ActionButton
              tone="primary"
              className="min-h-9 px-3"
              onClick={() => onReceive(transfer)}
            >
              <PackageCheckIcon size={17} />
              Recibir
            </ActionButton>
          )}
          {canCancel && (
            <ActionButton
              className="min-h-9 px-3"
              onClick={() => onCancel(transfer)}
            >
              <XIcon size={17} />
              Cancelar
            </ActionButton>
          )}
        </span>
      </ListCell>
    </ListRow>
  )
}
