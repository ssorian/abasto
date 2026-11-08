import { formatCents } from '#/modules/pricing/lib/money'

type PickListBarProps = {
  units: number
  totalCents: number
  onReview: () => void
}

/** Phone only: the pick list pinned to the bottom edge while you browse. */
export function PickListBar({ units, totalCents, onReview }: PickListBarProps) {
  const empty = units === 0
  return (
    <div className="rb-dark rb-pinned fixed inset-x-0 bottom-0 z-40 border-t-2 border-rb-signal bg-rb-graphite text-rb-label lg:hidden">
      <div className="mx-auto flex max-w-2xl items-center gap-3 px-4 py-2.5">
        <div className="min-w-0 flex-1">
          <p className="rb-stencil text-[13px] text-rb-signal">
            Hoja de surtido
          </p>
          {empty ? (
            <p className="text-[14px] text-rb-label/85">
              Vacía: toca + en un producto
            </p>
          ) : (
            <p className="flex items-baseline gap-2">
              <span key={totalCents} className="rb-num rb-tick text-[24px]">
                {formatCents(totalCents)}
              </span>
              <span className="text-[13px] text-rb-label/85">
                {units === 1 ? '1 unidad' : `${units} unidades`}
              </span>
            </p>
          )}
        </div>
        <button
          type="button"
          className="rb-btn shrink-0"
          disabled={empty}
          onClick={onReview}
        >
          Ver hoja
        </button>
      </div>
    </div>
  )
}
