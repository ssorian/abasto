import { formatCents } from '#/modules/pricing/lib/money'
import { QuantityStepper } from '#/modules/store/components/quantity-stepper'
import type { PickLine } from '#/modules/store/lib/pick-list'

type PickListPanelProps = {
  warehouseName: string
  lines: Array<PickLine>
  totalCents: number
  onSet: (presentationId: string, quantity: number) => void
  onReview: () => void
}

/** Desktop: the pick list stays beside the catalog, always visible. */
export function PickListPanel({
  warehouseName,
  lines,
  totalCents,
  onSet,
  onReview,
}: PickListPanelProps) {
  return (
    <aside
      aria-label="Hoja de surtido"
      className="rb-panel sticky top-[68px] hidden max-h-[calc(100dvh-84px)] flex-col lg:flex"
    >
      <div className="rb-dark bg-rb-graphite px-4 py-3 text-rb-label">
        <h2 className="rb-stencil text-[20px] leading-none">Hoja de surtido</h2>
        <p className="mt-1 text-[13px] text-rb-label/85">
          Recoges en {warehouseName}
        </p>
      </div>

      {lines.length ? (
        <ul className="min-h-0 flex-1 divide-y divide-rb-rule overflow-y-auto">
          {lines.map((line) => {
            const label = `${line.product.name}, ${line.presentation.name}`
            return (
              <li key={line.presentation.id} className="grid gap-2 px-3 py-2.5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="line-clamp-2 text-[14px] leading-tight font-semibold">
                      {line.product.name}
                    </p>
                    <p className="text-[13px] text-rb-muted">
                      {line.presentation.name} ·{' '}
                      {formatCents(line.presentation.priceCents)}
                    </p>
                  </div>
                  <span className="rb-num shrink-0 text-[17px]">
                    {formatCents(line.presentation.priceCents * line.quantity)}
                  </span>
                </div>
                <QuantityStepper
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
        <div className="m-3 border-2 border-dashed border-rb-rule p-5 text-center">
          <p className="rb-stencil text-[17px]">Hoja vacía</p>
          <p className="mt-1 text-[14px] text-rb-muted">
            Toca + en un producto de {warehouseName} y se suma aquí.
          </p>
        </div>
      )}

      <div className="grid gap-2 border-t-2 border-rb-graphite p-3">
        <div className="flex items-baseline justify-between">
          <span className="rb-label">Total de lista</span>
          <span key={totalCents} className="rb-num rb-tick text-[28px]">
            {formatCents(totalCents)}
          </span>
        </div>
        <p className="text-[13px] leading-snug text-rb-muted">
          Es un apartado: lo recoges y lo pagas en el almacén. Tus precios se
          aplican al revisar.
        </p>
        <button
          type="button"
          className="rb-btn w-full"
          disabled={lines.length === 0}
          onClick={onReview}
        >
          Revisar y apartar
        </button>
      </div>
    </aside>
  )
}
