import { FieldInput } from '#/modules/inventory/components/form-controls'

type ExpiryFieldProps = {
  /** Who the field is about, for the accessible names. */
  label: string
  expiresOn: string
  noExpiry: boolean
  invalid?: boolean
  className?: string
  onChange: (value: { expiresOn: string; noExpiry: boolean }) => void
}

/**
 * Expiry date of stock that enters, or an explicit "no expiry" mark for
 * products that do not expire. Marking it clears and disables the date.
 */
export function ExpiryField({
  label,
  expiresOn,
  noExpiry,
  invalid,
  className,
  onChange,
}: ExpiryFieldProps) {
  return (
    <div className="grid gap-1.5">
      <FieldInput
        type="date"
        aria-label={`Caducidad de ${label}`}
        aria-invalid={invalid ? true : undefined}
        className={className}
        value={noExpiry ? '' : expiresOn}
        disabled={noExpiry}
        onChange={(event) =>
          onChange({ expiresOn: event.target.value, noExpiry: false })
        }
      />
      <label className="flex items-center gap-1.5 text-xs text-[#6f5c63]">
        <input
          type="checkbox"
          aria-label={`${label} sin caducidad`}
          checked={noExpiry}
          onChange={(event) =>
            onChange({ expiresOn: '', noExpiry: event.target.checked })
          }
        />
        Sin caducidad
      </label>
    </div>
  )
}
