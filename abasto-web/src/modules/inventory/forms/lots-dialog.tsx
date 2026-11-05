import { useState } from 'react'

import { StatusBadge } from '#/components/status-badge'
import type { StatusTone } from '#/components/status-badge'
import { ActionButton } from '#/modules/inventory/components/action-button'
import {
  ListBody,
  ListCell,
  ListHead,
  ListPanel,
  ListRow,
  ListTable,
} from '#/modules/inventory/components/list-panel'
import { InventoryDialog } from '#/modules/inventory/components/inventory-dialog'
import { LotOperationDialog } from '#/modules/inventory/forms/lot-operation-dialog'
import type { LotOperation } from '#/modules/inventory/forms/lot-operation-dialog'
import { dateLabel } from '#/modules/inventory/lib/format'
import { formatQuantity } from '#/modules/inventory/lib/quantity'
import type { PackInfo } from '#/modules/inventory/lib/quantity'
import { expiryState } from '#/modules/inventory/lib/stock-metrics'
import type { ExpiryState } from '#/modules/inventory/lib/stock-metrics'
import type { ProductStock } from '#/modules/inventory/services/stock-reads'

const expiryBadge: Record<
  Exclude<ExpiryState, 'none' | 'ok'>,
  { tone: StatusTone; label: string }
> = {
  expired: { tone: 'red', label: 'Vencido' },
  soon: { tone: 'amber', label: 'Por vencer' },
}

type LotsDialogProps = {
  stock: ProductStock
  pack: PackInfo
  presentations: ReadonlyArray<{ id: string; name: string; factor: number }>
  today: string
  canManage: boolean
  onClose: () => void
}

/** Lots of one product in the warehouse, with adjust and loss actions for managers. */
export function LotsDialog({
  stock,
  pack,
  presentations,
  today,
  canManage,
  onClose,
}: LotsDialogProps) {
  const [operation, setOperation] = useState<LotOperation | null>(null)
  const open = (kind: 'adjust' | 'loss', lot: ProductStock['lots'][number]) =>
    setOperation({
      kind,
      lot,
      productName: stock.name,
      pack,
      presentations,
      presentationId: presentations.at(0)?.id ?? '',
    })

  return (
    <>
      <InventoryDialog
        title={stock.name}
        eyebrow="LOTES EN EL ALMACÉN"
        description={`${formatQuantity(stock.onHand, pack)} en total. El lote que vence primero va arriba.`}
        size="wide"
        onClose={onClose}
      >
        {stock.lots.length ? (
          <ListPanel>
            <ListTable>
              <ListHead>
                {[
                  'Lote',
                  'Caducidad',
                  'Existencias',
                  'Recibido',
                  ...(canManage ? [''] : []),
                ]}
              </ListHead>
              <ListBody>
                {stock.lots.map((lot) => {
                  const state = expiryState(lot.expiresOn, today)
                  const badge =
                    state === 'expired' || state === 'soon'
                      ? expiryBadge[state]
                      : null
                  return (
                    <ListRow key={lot.id}>
                      <ListCell>{lot.code || 'Sin código'}</ListCell>
                      <ListCell>
                        {lot.expiresOn ? dateLabel(lot.expiresOn) : '—'}
                        {badge && (
                          <StatusBadge tone={badge.tone} className="ml-2">
                            {badge.label}
                          </StatusBadge>
                        )}
                      </ListCell>
                      <ListCell>
                        <strong>{formatQuantity(lot.onHand, pack)}</strong>
                      </ListCell>
                      <ListCell>
                        {dateLabel(new Date(lot.receivedAt).toISOString())}
                      </ListCell>
                      {canManage && (
                        <ListCell className="flex justify-end gap-2">
                          <ActionButton
                            className="min-h-9 px-3"
                            onClick={() => open('adjust', lot)}
                          >
                            Ajustar
                          </ActionButton>
                          <ActionButton
                            className="min-h-9 px-3"
                            onClick={() => open('loss', lot)}
                          >
                            Pérdida
                          </ActionButton>
                        </ListCell>
                      )}
                    </ListRow>
                  )
                })}
              </ListBody>
            </ListTable>
          </ListPanel>
        ) : (
          <p className="text-sm text-[#9c898f]">
            Este producto no tiene lotes con existencias en este almacén.
          </p>
        )}
      </InventoryDialog>
      {operation && (
        <LotOperationDialog
          operation={operation}
          onClose={() => setOperation(null)}
        />
      )}
    </>
  )
}
