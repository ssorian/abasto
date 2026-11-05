import { useState } from 'react'

import { CatalogButton } from '#/modules/catalog/components/catalog-button'
import { TextInput } from '#/modules/catalog/forms/form-field'
import { formatBps, parseBps } from '#/modules/pricing/lib/money'

type MarginCellProps = {
  marginBps: number
  onSave: (marginBps: number) => Promise<boolean>
}

/** Owner-only target margin of a product, typed in percent. */
export function MarginCell({ marginBps, onSave }: MarginCellProps) {
  const stored = marginBps ? formatBps(marginBps) : ''
  const [text, setText] = useState<string>()
  const [error, setError] = useState<string>()
  const value = text ?? stored

  async function save() {
    const parsed = value.trim()
      ? parseBps(value)
      : { ok: true as const, value: 0 }
    if (!parsed.ok) return setError(parsed.message)
    if (parsed.value < 0) return setError('El margen debe ser cero o mayor.')
    setError(undefined)
    if (await onSave(parsed.value)) setText(undefined)
  }

  return (
    <div className="flex items-center justify-end gap-1.5">
      <TextInput
        aria-label="Margen objetivo en porcentaje"
        inputMode="decimal"
        placeholder="0"
        className="w-[72px] min-h-[36px] py-1.5 text-right"
        value={value}
        onChange={(event) => setText(event.target.value)}
        aria-invalid={Boolean(error)}
        title={error}
      />
      <span className="text-sm text-[#89747b]">%</span>
      {text !== undefined && text !== stored && (
        <CatalogButton
          className="min-h-[36px] px-3"
          onClick={() => void save()}
        >
          Guardar
        </CatalogButton>
      )}
      {error && <span className="text-xs text-[#b42318]">{error}</span>}
    </div>
  )
}
