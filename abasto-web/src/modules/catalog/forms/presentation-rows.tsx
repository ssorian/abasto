import { PlusIcon, Trash2Icon } from 'lucide-react'
import { CatalogButton } from '#/modules/catalog/components/catalog-button'
import {
  Field,
  SelectInput,
  TextInput,
} from '#/modules/catalog/forms/form-field'
import {
  newPresentationDraft,
  removeDraft,
} from '#/modules/catalog/lib/presentation-draft'

import type { PresentationDraft } from '#/modules/catalog/lib/catalog-types'

export type PresentationsState = {
  rows: Array<PresentationDraft>
  defaultKey: string
}

type PresentationRowsProps = {
  unit: string
  state: PresentationsState
  onChange: (state: PresentationsState) => void
  /** Columns of each row: the wide dialog fits four, the edit tab two. */
  compact?: boolean
}

/**
 * Controlled rows of presentations (name, factor, barcode, status) plus the
 * sale default. Rows not saved yet can be removed; stored ones only deactivated.
 */
export function PresentationRows({
  unit,
  state,
  onChange,
  compact = false,
}: PresentationRowsProps) {
  const { rows, defaultKey } = state
  const patch = (key: string, change: Partial<PresentationDraft>) =>
    onChange({
      ...state,
      rows: rows.map((row) => (row.key === key ? { ...row, ...change } : row)),
    })

  return (
    <>
      {rows.map((row) => (
        <div
          key={row.key}
          className="rounded-[10px] border border-[#efe8e0] bg-white p-4"
        >
          <div
            className={
              compact
                ? 'grid grid-cols-1 gap-4 sm:grid-cols-2'
                : 'grid grid-cols-1 gap-4 tablet:grid-cols-4 md:grid-cols-2'
            }
          >
            <Field label="Nombre">
              <TextInput
                value={row.name}
                onChange={(event) =>
                  patch(row.key, { name: event.target.value })
                }
              />
            </Field>
            <Field label={`Equivale a cuántas ${unit}`}>
              <TextInput
                type="number"
                min="1"
                step="1"
                disabled={!!row.id}
                value={row.factor || ''}
                onChange={(event) =>
                  patch(row.key, { factor: Number(event.target.value) })
                }
              />
            </Field>
            <Field label="Código de barras de esta presentación">
              <TextInput
                value={row.barcode}
                onChange={(event) =>
                  patch(row.key, { barcode: event.target.value })
                }
              />
            </Field>
            <Field label="Estado">
              <SelectInput
                value={row.active ? 'Activa' : 'Inactiva'}
                onChange={(event) =>
                  patch(row.key, { active: event.target.value === 'Activa' })
                }
              >
                <option>Activa</option>
                <option>Inactiva</option>
              </SelectInput>
            </Field>
          </div>
          {!row.id && rows.length > 1 && (
            <div className="mt-3 flex justify-end">
              <CatalogButton
                aria-label={`Quitar presentación ${row.name || 'sin nombre'}`}
                onClick={() => onChange(removeDraft(rows, defaultKey, row.key))}
              >
                <Trash2Icon className="size-4" />
                Quitar
              </CatalogButton>
            </div>
          )}
        </div>
      ))}
      <div>
        <CatalogButton
          onClick={() =>
            onChange({ ...state, rows: [...rows, newPresentationDraft()] })
          }
        >
          <PlusIcon className="size-4" />
          Agregar presentación
        </CatalogButton>
      </div>
      <Field label="Presentación predeterminada al vender">
        <SelectInput
          value={defaultKey}
          onChange={(event) =>
            onChange({ ...state, defaultKey: event.target.value })
          }
        >
          {rows
            .filter((row) => row.active)
            .map((row) => (
              <option key={row.key} value={row.key}>
                {row.name || 'Sin nombre'} · {row.factor} {unit}
              </option>
            ))}
        </SelectInput>
      </Field>
    </>
  )
}
