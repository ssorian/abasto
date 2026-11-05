import { useState } from 'react'

import { ActionButton } from '#/modules/inventory/components/action-button'
import { FieldInput } from '#/modules/inventory/components/form-controls'
import {
  FormError,
  SuccessNote,
} from '#/modules/inventory/components/info-blocks'
import {
  DialogActions,
  InventoryDialog,
} from '#/modules/inventory/components/inventory-dialog'
import {
  ListBody,
  ListCell,
  ListHead,
  ListPanel,
  ListRow,
  ListTable,
} from '#/modules/inventory/components/list-panel'
import { useInventoryActions } from '#/modules/inventory/hooks/use-inventory-actions'
import { formatCents } from '#/modules/inventory/lib/cents'
import {
  initialPriceTexts,
  pricesFromSelection,
  uniqueByPresentation,
} from '#/modules/inventory/lib/price-suggestions'
import { formatQuantity } from '#/modules/inventory/lib/quantity'
import type { PackInfo } from '#/modules/inventory/lib/quantity'
import type { PriceSuggestion } from '#/modules/pricing/services/price-suggestions'

export type PurchaseResult = {
  purchaseId: string
  /** Lots the purchase created, with the product name and how it is counted. */
  lots: Array<{ name: string; code: string; quantity: number; pack: PackInfo }>
  suggestions: Array<PriceSuggestion>
  /** Whether the actor may apply prices in the receiving warehouse. */
  canApply: boolean
}

/** Shows the lots a purchase created and, when there are any, its price suggestions. */
export function PurchaseResultDialog({
  result,
  onClose,
}: {
  result: PurchaseResult
  onClose: () => void
}) {
  const actions = useInventoryActions()
  const suggestions = uniqueByPresentation(result.suggestions)
  const [texts, setTexts] = useState(() => initialPriceTexts(suggestions))
  const [selected, setSelected] = useState<ReadonlySet<string>>(
    () => new Set(suggestions.map((item) => item.presentationId)),
  )
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  const toggle = (presentationId: string) =>
    setSelected((current) => {
      const next = new Set(current)
      if (!next.delete(presentationId)) next.add(presentationId)
      return next
    })

  async function apply() {
    const prices = pricesFromSelection(suggestions, texts, selected)
    if (!prices.ok) return setError(prices.message)
    setError(null)
    setPending(true)
    const applied = await actions.applyPrices(result.purchaseId, prices.value)
    setPending(false)
    if (applied) onClose()
  }

  const showSuggestions = suggestions.length > 0 && result.canApply

  return (
    <InventoryDialog
      title="Compra registrada"
      description="Las existencias ya están actualizadas."
      size={showSuggestions ? 'wide' : 'standard'}
      onClose={onClose}
    >
      <SuccessNote>
        {result.lots
          .map(
            (lot) =>
              `${lot.name}${lot.code ? ` (lote ${lot.code})` : ''}: +${formatQuantity(lot.quantity, lot.pack)}`,
          )
          .join(' · ')}
      </SuccessNote>
      {showSuggestions && (
        <>
          <div>
            <h3 className="text-base font-[650]">Precios sugeridos</h3>
            <p className="mt-1 text-xs leading-[1.7] text-[#9c898f]">
              Con el costo de esta compra y el margen del producto. Los precios
              no cambian hasta que los apliques; puedes corregir cualquier
              monto.
            </p>
          </div>
          <ListPanel>
            <ListTable>
              <ListHead>
                {['', 'Producto', 'Precio actual', 'Precio nuevo ($)']}
              </ListHead>
              <ListBody>
                {suggestions.map((item) => (
                  <ListRow key={item.presentationId}>
                    <ListCell>
                      <input
                        type="checkbox"
                        aria-label={`Aplicar precio de ${item.productName}`}
                        checked={selected.has(item.presentationId)}
                        onChange={() => toggle(item.presentationId)}
                      />
                    </ListCell>
                    <ListCell>
                      <strong>{item.productName}</strong>
                      <small className="block text-[#907e84]">
                        por {item.presentationName} · margen{' '}
                        {item.marginBps / 100}%
                      </small>
                    </ListCell>
                    <ListCell>
                      {item.currentPriceCents === null
                        ? 'Sin precio'
                        : formatCents(item.currentPriceCents)}
                    </ListCell>
                    <ListCell>
                      <FieldInput
                        inputMode="decimal"
                        aria-label={`Precio nuevo de ${item.productName}`}
                        className="max-w-[130px]"
                        value={texts[item.presentationId] ?? ''}
                        onChange={(event) =>
                          setTexts({
                            ...texts,
                            [item.presentationId]: event.target.value,
                          })
                        }
                      />
                    </ListCell>
                  </ListRow>
                ))}
              </ListBody>
            </ListTable>
          </ListPanel>
        </>
      )}
      {error && <FormError>{error}</FormError>}
      <DialogActions>
        <ActionButton type="button" onClick={onClose}>
          {showSuggestions ? 'Ahora no' : 'Listo'}
        </ActionButton>
        {showSuggestions && (
          <ActionButton
            tone="primary"
            type="button"
            disabled={pending}
            onClick={() => void apply()}
          >
            {pending ? 'Aplicando…' : 'Aplicar precios'}
          </ActionButton>
        )}
      </DialogActions>
    </InventoryDialog>
  )
}
