import { PlusIcon, Trash2Icon } from 'lucide-react'
import { CatalogButton } from '#/modules/catalog/components/catalog-button'
import { SelectInput, TextInput } from '#/modules/catalog/forms/form-field'
import {
  newPresentationDraft,
  removeDraft,
} from '#/modules/catalog/lib/presentation-draft'
import { cn } from '#/lib/utils/cn'
import { formatBps, formatCents, parsePesos } from '#/modules/pricing/lib/money'
import { saleCheck } from '#/modules/pricing/lib/product-costs'

import type { PresentationDraft } from '#/modules/catalog/lib/catalog-types'
import type { ReactNode } from 'react'

export type PresentationsState = {
  rows: Array<PresentationDraft>
  defaultKey: string
}

/** Sale price column of a product being created. */
export type PresentationPricing = {
  /** Net supplier cost per piece (ten-thousandths); null while unknown. */
  netPerPiece: number | null
  /** Price error by row key; shown as is. */
  errors: Readonly<Record<string, string>>
}

type PresentationRowsProps = {
  unit: string
  state: PresentationsState
  onChange: (state: PresentationsState) => void
  /** Adds the sale price column; omitted when prices are set elsewhere. */
  pricing?: PresentationPricing
}

/** Column widths shared by the header and every row from `sm` up. */
const columns = {
  pick: 'sm:w-6 sm:flex-none',
  name: 'sm:min-w-0 sm:flex-1',
  factor: 'sm:w-[4.5rem] sm:flex-none',
  barcode: 'sm:min-w-0 sm:flex-[1.2]',
  price: 'sm:w-[6.75rem] sm:flex-none',
  status: 'sm:w-[6.75rem] sm:flex-none',
  remove: 'sm:w-9 sm:flex-none',
}

/** A labelled cell: the label shows on phones, the header row replaces it from `sm` up. */
function Cell({
  label,
  className,
  children,
}: {
  label: string
  className?: string
  children: ReactNode
}) {
  return (
    <label className={cn('grid min-w-0 content-start gap-1', className)}>
      <span className="text-xs font-medium text-[#513f45] sm:sr-only">
        {label}
      </span>
      {children}
    </label>
  )
}

/** Margin of a typed price against the net cost of its presentation, or its error. */
function PriceHint({
  row,
  pricing,
}: {
  row: PresentationDraft
  pricing: PresentationPricing
}) {
  const error = pricing.errors[row.key]
  if (error) return <span className="text-[11px] text-[#b42318]">{error}</span>
  const typed = parsePesos(row.price)
  const check =
    typed.ok && pricing.netPerPiece !== null
      ? saleCheck(row.factor, typed.value, pricing.netPerPiece)
      : null
  if (!check) return null
  return check.belowCost ? (
    <span className="text-[11px] text-[#a08442]">
      Bajo el costo ({formatCents(check.costCents)})
    </span>
  ) : (
    <span className="text-[11px] text-[#89747b]">
      Margen {formatBps(check.marginBps)}%
    </span>
  )
}

/**
 * Controlled list of presentations, one compact row each: sale default, name,
 * factor, barcode and either the sale price (creating) or the status (stored
 * rows). Rows not saved yet can be removed; stored ones only deactivated. In a
 * product without stored rows the first row is the piece: it keeps factor 1
 * and is the sale default, so the default picker only shows when editing.
 */
export function PresentationRows({
  unit,
  state,
  onChange,
  pricing,
}: PresentationRowsProps) {
  const { rows, defaultKey } = state
  const creating = rows.every((row) => !row.id)
  const showStatus = !creating
  const showDefault = !creating
  const factorLabel = `Equivale a (${unit})`
  const patch = (key: string, change: Partial<PresentationDraft>) =>
    onChange({
      ...state,
      rows: rows.map((row) => (row.key === key ? { ...row, ...change } : row)),
    })

  return (
    <div className="grid gap-3">
      <div
        aria-hidden
        className="hidden gap-2 text-xs font-medium text-[#513f45] sm:flex"
      >
        {showDefault && <span className={columns.pick} />}
        <span className={columns.name}>Presentación</span>
        <span className={columns.factor}>
          {unit.charAt(0).toUpperCase() + unit.slice(1)}
        </span>
        <span className={columns.barcode}>Código de barras</span>
        {pricing && <span className={columns.price}>Precio de venta</span>}
        {showStatus && <span className={columns.status}>Estado</span>}
        <span className={columns.remove} />
      </div>
      {rows.map((row, index) => {
        const isBase = creating && index === 0
        const removable = !row.id && !isBase && rows.length > 1
        const label = row.name || 'sin nombre'
        return (
          <div
            key={row.key}
            className="grid grid-cols-2 gap-2 border-t border-[#f4eee8] pt-3 first:border-t-0 first:pt-0 sm:flex sm:items-start sm:border-t-0 sm:pt-0"
          >
            {showDefault && (
              <label
                className={cn(
                  'col-span-2 flex items-center gap-2 text-xs text-[#513f45] sm:h-[43px] sm:justify-center',
                  columns.pick,
                )}
              >
                <input
                  type="radio"
                  name="default-presentation"
                  className="size-4 accent-[#3b2251]"
                  aria-label={`Predeterminada al vender: ${label}`}
                  checked={row.key === defaultKey}
                  disabled={!row.active}
                  onChange={() => onChange({ ...state, defaultKey: row.key })}
                />
                <span className="sm:hidden">Predeterminada al vender</span>
              </label>
            )}
            <Cell label="Presentación" className={columns.name}>
              <TextInput
                value={row.name}
                placeholder={isBase ? 'Pieza' : 'Caja'}
                onChange={(event) =>
                  patch(row.key, { name: event.target.value })
                }
              />
            </Cell>
            <Cell label={factorLabel} className={columns.factor}>
              <TextInput
                type="number"
                min="1"
                step="1"
                aria-label={`${factorLabel}: ${label}`}
                disabled={!!row.id || isBase}
                value={row.factor || ''}
                onChange={(event) =>
                  patch(row.key, { factor: Number(event.target.value) })
                }
              />
            </Cell>
            <Cell
              label="Código de barras"
              className={cn(
                !pricing && !showStatus && 'col-span-2',
                columns.barcode,
              )}
            >
              <TextInput
                value={row.barcode}
                placeholder="Opcional"
                onChange={(event) =>
                  patch(row.key, { barcode: event.target.value })
                }
              />
            </Cell>
            {pricing && (
              <Cell label="Precio de venta" className={columns.price}>
                <TextInput
                  inputMode="decimal"
                  placeholder="0.00"
                  aria-label={`Precio de venta: ${label}`}
                  aria-invalid={Boolean(pricing.errors[row.key])}
                  value={row.price}
                  onChange={(event) =>
                    patch(row.key, { price: event.target.value })
                  }
                />
                <PriceHint row={row} pricing={pricing} />
              </Cell>
            )}
            {showStatus && (
              <Cell label="Estado" className={columns.status}>
                {row.id ? (
                  <SelectInput
                    value={row.active ? 'Activa' : 'Inactiva'}
                    onChange={(event) =>
                      patch(row.key, {
                        active: event.target.value === 'Activa',
                      })
                    }
                  >
                    <option>Activa</option>
                    <option>Inactiva</option>
                  </SelectInput>
                ) : (
                  <span className="flex min-h-[43px] items-center text-sm text-[#927981]">
                    Nueva
                  </span>
                )}
              </Cell>
            )}
            <div
              className={cn(
                'col-span-2 flex justify-end sm:justify-center',
                columns.remove,
              )}
            >
              {removable && (
                <button
                  type="button"
                  aria-label={`Quitar presentación ${label}`}
                  className="flex size-9 items-center justify-center rounded-lg text-[#927981] hover:bg-[#f8f2ec] hover:text-[#b42318] focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#d8c0e9] sm:mt-[3.5px]"
                  onClick={() =>
                    onChange(removeDraft(rows, defaultKey, row.key))
                  }
                >
                  <Trash2Icon className="size-4" />
                </button>
              )}
            </div>
          </div>
        )
      })}
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <CatalogButton
          onClick={() =>
            onChange({ ...state, rows: [...rows, newPresentationDraft()] })
          }
        >
          <PlusIcon className="size-4" />
          Agregar presentación
        </CatalogButton>
        {showDefault && (
          <p className="text-xs text-[#9d8c92]">
            El círculo marca la presentación que se ofrece primero al vender.
          </p>
        )}
      </div>
    </div>
  )
}
