import {
  FieldInput,
  FieldSelect,
} from '#/modules/inventory/components/form-controls'
import { toBaseUnits } from '#/modules/inventory/lib/quantity'

type QuantityFieldsProps = {
  /** Presentations the quantity can be typed in. */
  presentations: ReadonlyArray<{ id: string; name: string; factor: number }>
  /** Base unit label, e.g. "piezas". */
  unit: string
  presentationId: string
  packs: string
  loose: string
  onChange: (
    patch: Partial<{ presentationId: string; packs: string; loose: string }>,
  ) => void
  label?: string
}

/** Quantity typed as packs of a presentation plus loose base units. */
export function QuantityFields({
  presentations,
  unit,
  presentationId,
  packs,
  loose,
  onChange,
  label = 'Cantidad',
}: QuantityFieldsProps) {
  const presentation = presentations.find(({ id }) => id === presentationId)
  const total = presentation
    ? toBaseUnits(
        { packs, loose, factor: presentation.factor },
        { allowZero: true },
      )
    : null
  return (
    <div className="grid gap-1.5">
      <span className="text-[13px] font-medium text-[#32455e]">{label}</span>
      <div className="grid grid-cols-[1fr_1.2fr_1fr] gap-2">
        <FieldInput
          inputMode="numeric"
          aria-label={`${label} en presentación`}
          placeholder="0"
          value={packs}
          onChange={(event) => onChange({ packs: event.target.value })}
        />
        <FieldSelect
          aria-label="Presentación"
          value={presentationId}
          onChange={(event) => onChange({ presentationId: event.target.value })}
        >
          {presentations.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
              {item.factor > 1 ? ` (${item.factor} ${unit})` : ''}
            </option>
          ))}
        </FieldSelect>
        <FieldInput
          inputMode="numeric"
          aria-label={`${unit} sueltas`}
          placeholder={`${unit} sueltas`}
          value={loose}
          onChange={(event) => onChange({ loose: event.target.value })}
        />
      </div>
      {total?.ok && total.value > 0 && (
        <small className="text-[11px] text-[#8290a2]">
          Total: {total.value} {unit}
        </small>
      )}
    </div>
  )
}
