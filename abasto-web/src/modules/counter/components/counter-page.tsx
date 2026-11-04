import { RotateCcwClock } from 'lucide-react'
import { useState } from 'react'

import { PageHeading } from '#/components/page-heading'
import { useCounterState } from '#/modules/counter/hooks/use-counter-state'
import { ActionButton } from '#/modules/counter/components/action-button'
import { AuthorizationDialog } from '#/modules/counter/components/authorization-dialog'
import { CashPanel } from '#/modules/counter/components/cash-panel'
import { CounterDialog } from '#/modules/counter/components/counter-dialog'
import { CounterTabs } from '#/modules/counter/components/counter-tabs'
import { FollowupDialog } from '#/modules/counter/components/followup-dialog'
import { SaleComposer } from '#/modules/counter/components/sale-composer'

import type { CounterTab } from '#/modules/counter/components/counter-tabs'

export function CounterPage() {
  const { state, apply, pending, authorize, dismissPending, revision } =
    useCounterState()
  const [tab, setTab] = useState<CounterTab>('Venta')
  const [showFollowup, setShowFollowup] = useState(false)
  const [newOrder, setNewOrder] = useState(false)

  function approve() {
    if (authorize()) {
      setShowFollowup(false)
      setNewOrder(false)
    }
  }

  return (
    <>
      <PageHeading
        eyebrow="ABARROTEROS · ALMACÉN"
        title="Mostrador"
        description="Escanea, cobra y entrega desde el mismo inventario."
        actions={
          <ActionButton
            className="max-md:flex-1"
            onClick={() => setShowFollowup(true)}
          >
            <RotateCcwClock size={17} />
            Ventas y entregas
          </ActionButton>
        }
      />

      <CounterTabs value={tab} onChange={setTab} />

      {tab === 'Venta' ? (
        <SaleComposer
          state={state}
          apply={apply}
          mode="counter"
          onOpenCash={() => setTab('Caja')}
        />
      ) : (
        <CashPanel key={`cash-${revision}`} state={state} apply={apply} />
      )}

      {showFollowup && (
        <FollowupDialog
          key={`followup-${revision}`}
          state={state}
          apply={apply}
          onClose={() => setShowFollowup(false)}
          onNewOrder={() => {
            setShowFollowup(false)
            setNewOrder(true)
          }}
        />
      )}

      {newOrder && (
        <CounterDialog
          wide
          title="Venta con entrega pendiente"
          description="App, mostrador, teléfono o WhatsApp. Captura el origen y confirma productos, lotes y precios."
          onClose={() => setNewOrder(false)}
        >
          <SaleComposer
            state={state}
            apply={apply}
            mode="pending"
            onDone={() => setNewOrder(false)}
          />
        </CounterDialog>
      )}

      {pending && (
        <AuthorizationDialog
          action={pending.message}
          review={pending.review}
          onClose={dismissPending}
          onApprove={approve}
        />
      )}
    </>
  )
}
