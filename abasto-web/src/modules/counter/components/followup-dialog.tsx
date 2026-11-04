import { Plus } from 'lucide-react'

import { ActionButton } from '#/modules/counter/components/action-button'
import { CounterDialog } from '#/modules/counter/components/counter-dialog'
import { OperationsOrders } from '#/modules/counter/components/operations-orders'

import type { ApplyOperation } from '#/modules/counter/hooks/use-counter-state'
import type { CounterState } from '#/modules/counter/types/counter'

/** "Ventas y entregas": follow-up of every sale, reservation and delivery. */
export function FollowupDialog({
  state,
  apply,
  onClose,
  onNewOrder,
}: {
  state: CounterState
  apply: ApplyOperation
  onClose: () => void
  onNewOrder: () => void
}) {
  return (
    <CounterDialog
      wide
      title="Ventas y entregas"
      description="Consulta ventas, reservas, surtido, entregas y devoluciones de todos los canales."
      onClose={onClose}
    >
      <div className="my-[14px] flex flex-wrap gap-[9px]">
        <ActionButton tone="primary" onClick={onNewOrder}>
          <Plus size={16} />
          Registrar venta con entrega pendiente
        </ActionButton>
      </div>
      <OperationsOrders state={state} apply={apply} />
    </CounterDialog>
  )
}
