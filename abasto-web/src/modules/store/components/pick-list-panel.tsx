import { formatCents } from '#/modules/pricing/lib/money'
import { QuantityStepper } from '#/modules/store/components/quantity-stepper'
import type { PickLine, PricedTotal } from '#/modules/store/lib/pick-list'

type PickListPanelProps = {
  warehouseName: string
  lines: Array<PickLine>
  total: PricedTotal
  signedIn: boolean
  /** Unit price shown for a line (the customer's when signed in). */
  priceOf: (line: PickLine) => number
  onSet: (presentationId: string, quantity: number) => void
  onReview: () => void
}

/** Desktop: the pick list stays beside the catalog, always visible. */
export function PickListPanel({
  warehouseName,
  lines,
  total,
  signedIn,
  priceOf,
  onSet,
  onReview,
}: PickListPanelProps) {
  return (
    <aside
      aria-label="Hoja de surtido"
      className="st-panel sticky top-[76px] hidden max-h-[calc(100dvh-92px)] flex-col self-start lg:flex"
    >
      <div className="bg-st-plum-tint px-4 py-3.5">
        <h2 className="text-[18px] leading-none font-bold text-st-plum-ink">
          Hoja de surtido
        </h2>
        <p className="mt-1.5 text-[13px] text-st-muted">
          Recoges en {warehouseName}
        </p>
      </div>

      {lines.length ? (
        <ul className="min-h-0 flex-1 divide-y divide-st-line overflow-y-auto">
          {lines.map((line) => {
            const label = `${line.product.name}, ${line.presentation.name}`
            return (
              <li
                key={line.presentation.id}
                className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1.5 px-3 py-2.5"
              >
                <p className="line-clamp-2 text-[14px] leading-tight font-semibold">
                  {line.product.name}
                </p>
                <span className="st-num text-right text-[16px]">
                  {total.pending
                    ? '…'
                    : formatCents(priceOf(line) * line.quantity)}
                </span>
                <p className="text-[13px] text-st-muted">
                  {line.presentation.name} ·{' '}
                  {total.pending ? '…' : formatCents(priceOf(line))}
                </p>
                <QuantityStepper
                  compact
                  value={line.quantity}
                  min={0}
                  label={label}
                  onChange={(next) => onSet(line.presentation.id, next)}
                />
              </li>
            )
          })}
        </ul>
      ) : (
        <div className="m-3 rounded-xl border border-dashed border-st-line p-5 text-center">
          <p className="st-stencil text-[16px]">Hoja vacía</p>
          <p className="mt-1 text-[14px] text-st-muted">
            Toca + en un producto de {warehouseName} y se suma aquí.
          </p>
        </div>
      )}

      <div className="grid gap-2 border-t border-st-line p-3">
        <div className="flex items-baseline justify-between">
          <span className="st-card">
            {signedIn ? 'Total con tus precios' : 'Total de lista'}
          </span>
          <span key={total.cents} className="st-num st-tick text-[26px]">
            {total.pending ? '…' : formatCents(total.cents)}
          </span>
        </div>
        <p className="text-[13px] leading-snug text-st-muted">
          Es un apartado: lo recoges y lo pagas en el almacén.
          {signedIn ? '' : ' Inicia sesión para ver tus precios.'}
        </p>
        <button
          type="button"
          className="st-btn w-full"
          disabled={lines.length === 0}
          onClick={onReview}
        >
          Revisar y apartar
        </button>
      </div>
    </aside>
  )
}
