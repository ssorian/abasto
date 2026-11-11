import { useState } from 'react'

import { ActionButton } from '#/modules/counter/components/action-button'
import { FieldInput } from '#/modules/counter/components/form-controls'
import { useOrderActions } from '#/modules/counter/hooks/use-order-actions'
import { toast } from 'sonner'

/** Owner only: how many hours an order keeps its stock reserved (1–720). */
export function ReservationSetting({ hours }: { hours: number }) {
  const actions = useOrderActions()
  const [text, setText] = useState(String(hours))

  async function save() {
    const value = Number(text)
    if (!/^\d+$/.test(text.trim()) || value < 1 || value > 720) {
      toast.error(
        'La duración de la reserva debe ser un número entero de horas entre 1 y 720.',
      )
      return
    }
    await actions.setHours(value)
  }

  return (
    <div className="mb-5 flex flex-wrap items-end gap-3 rounded-xl border border-[#f0eae3] bg-white p-4">
      <label className="flex flex-col gap-[7px] text-[13px] font-medium text-[#513f45]">
        Duración de la reserva (horas)
        <FieldInput
          type="number"
          min="1"
          max="720"
          step="1"
          className="w-full"
          value={text}
          onChange={(event) => setText(event.target.value)}
        />
      </label>
      <ActionButton disabled={actions.pending} onClick={save}>
        Guardar
      </ActionButton>
      <p className="basis-full text-xs text-[#9c898f]">
        Un pedido sin recoger libera su producto al vencer la reserva. Solo el
        dueño puede cambiarla.
      </p>
    </div>
  )
}
