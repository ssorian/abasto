import type { StoreOrderStatus } from '#/modules/store/services/storefront'

const steps = ['Reservado', 'Preparado', 'Recogido'] as const

/**
 * Three positions on one strip. Cancelado and Vencido end the strip: every
 * position is struck out and the closing word is printed beside it.
 */
export function OrderStatusStrip({ status }: { status: StoreOrderStatus }) {
  const position = steps.indexOf(status as (typeof steps)[number])
  const ended = position === -1
  return (
    <div className="grid gap-1.5">
      <ol
        className="st-steps"
        data-ended={ended ? '' : undefined}
        aria-label={`Estado del pedido: ${status}`}
      >
        {steps.map((step, index) => (
          <li
            key={step}
            data-done={!ended && index < position ? '' : undefined}
            data-now={!ended && index === position ? '' : undefined}
            aria-current={!ended && index === position ? 'step' : undefined}
          >
            {step}
          </li>
        ))}
      </ol>
      {ended ? (
        <p className="st-stencil text-[15px] text-st-danger">{status}</p>
      ) : null}
    </div>
  )
}
