import { useState } from 'react'

import { cn } from '#/lib/utils/cn'
import { ActionButton } from '#/modules/counter/components/action-button'
import { CashCloseDialog } from '#/modules/cash/components/cash-close-dialog'
import { CashHistoryDialog } from '#/modules/cash/components/cash-history-dialog'
import { CashMovementDialog } from '#/modules/cash/components/cash-movement-dialog'
import { CashOpenDialog } from '#/modules/cash/components/cash-open-dialog'
import { summarizeSession } from '#/modules/cash/lib/cash-summary'
import { formatCents } from '#/modules/pricing/lib/money'
import type { CashSessionDetail } from '#/modules/cash/services/cash-sessions'

type CashPanelProps = {
  warehouseId: string
  warehouseName: string
  cash: CashSessionDetail | null
  canViewHistory: boolean
}

type Dialog = 'open' | 'entry' | 'withdrawal' | 'close' | 'history'

function Figure({
  label,
  value,
  strong = false,
}: {
  label: string
  value: string
  strong?: boolean
}) {
  return (
    <div className="min-w-[120px]">
      <span className="block text-[11px] font-semibold tracking-[0.35px] text-[#78879b]">
        {label}
      </span>
      <strong
        className={cn(
          'text-base font-[650] text-[#223751]',
          strong && 'text-xl',
        )}
      >
        {value}
      </strong>
    </div>
  )
}

/** "Caja" of the selected warehouse: open it, see the shift so far, move cash, close it. */
export function CashPanel({
  warehouseId,
  warehouseName,
  cash,
  canViewHistory,
}: CashPanelProps) {
  const [dialog, setDialog] = useState<Dialog>()
  const close = () => setDialog(undefined)
  const summary =
    cash && summarizeSession(cash.session.openingCents, cash.movements)

  return (
    <section
      aria-label="Caja"
      className="mb-5 rounded-xl border border-[#e3e9f0] bg-white p-4 md:p-5"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-[17px] font-[650]">
            Caja · {cash ? 'abierta' : 'cerrada'}
          </h2>
          <p className="mt-1 text-xs text-[#8390a2]">
            {cash
              ? 'Todo el efectivo de los pedidos y abonos entra a esta caja.'
              : 'Ábrela para poder cobrar pedidos de contado y recibir abonos.'}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {cash ? (
            <>
              <ActionButton onClick={() => setDialog('entry')}>
                Entrada
              </ActionButton>
              <ActionButton onClick={() => setDialog('withdrawal')}>
                Retiro
              </ActionButton>
              <ActionButton tone="primary" onClick={() => setDialog('close')}>
                Cerrar caja
              </ActionButton>
            </>
          ) : (
            <ActionButton tone="primary" onClick={() => setDialog('open')}>
              Abrir caja
            </ActionButton>
          )}
          {canViewHistory && (
            <ActionButton onClick={() => setDialog('history')}>
              Historial
            </ActionButton>
          )}
        </div>
      </div>
      {summary && (
        <div className="mt-4 flex flex-wrap gap-x-8 gap-y-3">
          <Figure
            strong
            label="EFECTIVO ESPERADO"
            value={formatCents(summary.expectedCents)}
          />
          <Figure label="APERTURA" value={formatCents(summary.openingCents)} />
          <Figure label="VENTAS" value={formatCents(summary.salesCents)} />
          <Figure label="ABONOS" value={formatCents(summary.abonosCents)} />
          <Figure label="ENTRADAS" value={formatCents(summary.entriesCents)} />
          <Figure
            label="RETIROS"
            value={formatCents(summary.withdrawalsCents)}
          />
        </div>
      )}
      {dialog === 'open' && (
        <CashOpenDialog
          warehouseId={warehouseId}
          warehouseName={warehouseName}
          onClose={close}
        />
      )}
      {(dialog === 'entry' || dialog === 'withdrawal') && (
        <CashMovementDialog
          kind={dialog}
          warehouseId={warehouseId}
          onClose={close}
        />
      )}
      {dialog === 'close' && cash && (
        <CashCloseDialog
          warehouseId={warehouseId}
          expectedCents={cash.expectedCents}
          onClose={close}
        />
      )}
      {dialog === 'history' && (
        <CashHistoryDialog warehouseId={warehouseId} onClose={close} />
      )}
    </section>
  )
}
