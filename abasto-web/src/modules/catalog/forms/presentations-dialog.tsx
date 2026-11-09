import { PlusIcon } from 'lucide-react'
import { useState } from 'react'

import { CatalogButton } from '#/modules/catalog/components/catalog-button'
import { CatalogModal } from '#/modules/catalog/components/catalog-modal'
import {
  Field,
  SelectInput,
  TextInput,
} from '#/modules/catalog/forms/form-field'
import {
  defaultKeyOf,
  draftsFromProduct,
  newPresentationDraft,
} from '#/modules/catalog/lib/presentation-draft'

import type {
  CatalogProduct,
  PresentationDraft,
} from '#/modules/catalog/lib/catalog-types'

export type SavePresentations = (
  rows: Array<PresentationDraft>,
  defaultKey: string,
) => Promise<boolean>

type PresentationsEditorProps = {
  product: CatalogProduct
  /** Resolves to whether the save worked; `onSaved` runs only then. */
  onSubmit: SavePresentations
  onSaved: () => void
  /** Columns of each row: the wide dialog fits four, the edit tab two. */
  compact?: boolean
}

/** Presentations and barcodes of an existing product, with its own save. */
export function PresentationsEditor({
  product,
  onSubmit,
  onSaved,
  compact = false,
}: PresentationsEditorProps) {
  const [rows, setRows] = useState(() => draftsFromProduct(product))
  const [defaultKey, setDefaultKey] = useState(() => defaultKeyOf(product))
  const [saving, setSaving] = useState(false)
  const patch = (key: string, change: Partial<PresentationDraft>) =>
    setRows((current) =>
      current.map((row) => (row.key === key ? { ...row, ...change } : row)),
    )

  async function save() {
    setSaving(true)
    const saved = await onSubmit(rows, defaultKey)
    setSaving(false)
    if (saved) onSaved()
  }

  return (
    <div className="grid gap-[15px]">
      <p className="rounded-[9px] border border-[#e7deed] bg-[#f8f2ec] p-[13px] text-xs leading-[1.7] text-[#856972]">
        Inventario en {product.unit}. Cada venta descuenta sus equivalencias del
        mismo lote. Aquí sólo se definen nombre, equivalencia y código de cada
        presentación; los precios se capturan por almacén en «Precios».
      </p>
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
            <Field label={`Equivale a cuántas ${product.unit}`}>
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
        </div>
      ))}
      <div>
        <CatalogButton
          onClick={() =>
            setRows((current) => [...current, newPresentationDraft()])
          }
        >
          <PlusIcon className="size-4" />
          Agregar presentación
        </CatalogButton>
      </div>
      <Field label="Presentación predeterminada al vender">
        <SelectInput
          value={defaultKey}
          onChange={(event) => setDefaultKey(event.target.value)}
        >
          {rows
            .filter((row) => row.active)
            .map((row) => (
              <option key={row.key} value={row.key}>
                {row.name || 'Sin nombre'} · {row.factor} {product.unit}
              </option>
            ))}
        </SelectInput>
      </Field>
      <p className="text-xs leading-[1.8] text-[#a49197] md:text-sm">
        Las equivalencias existentes no se cambian: desactiva la presentación y
        crea otra para conservar el historial. Las presentaciones no se borran.
      </p>
      <div>
        <CatalogButton
          tone="primary"
          disabled={saving}
          onClick={() => void save()}
        >
          {saving ? 'Guardando…' : 'Guardar presentaciones'}
        </CatalogButton>
      </div>
    </div>
  )
}

type PresentationsDialogProps = {
  product: CatalogProduct
  onSubmit: SavePresentations
  onClose: () => void
}

/** Standalone presentations dialog; the edit dialog embeds the editor instead. */
export function PresentationsDialog({
  product,
  onSubmit,
  onClose,
}: PresentationsDialogProps) {
  return (
    <CatalogModal
      size="wide"
      title={`Presentaciones · ${product.name}`}
      description={`Inventario en ${product.unit}. Cada venta descuenta sus equivalencias del mismo lote.`}
      onClose={onClose}
    >
      <PresentationsEditor
        product={product}
        onSubmit={onSubmit}
        onSaved={onClose}
      />
    </CatalogModal>
  )
}
