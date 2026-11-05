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

type PresentationsDialogProps = {
  product: CatalogProduct
  /** Resolves to whether the save worked; the dialog closes only then. */
  onSubmit: (
    rows: Array<PresentationDraft>,
    defaultKey: string,
  ) => Promise<boolean>
  onClose: () => void
}

export function PresentationsDialog({
  product,
  onSubmit,
  onClose,
}: PresentationsDialogProps) {
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
    if (saved) onClose()
  }

  return (
    <CatalogModal
      size="wide"
      title={`Presentaciones · ${product.name}`}
      description={`Inventario en ${product.unit}. Cada venta descuenta sus equivalencias del mismo lote.`}
      onClose={onClose}
    >
      <p className="my-[15px] rounded-[9px] border border-[#d9e5f2] bg-[#eaf1fa] p-[13px] text-xs leading-[1.7] text-[#54759a]">
        Los precios se capturan por almacén; aquí sólo se definen nombre,
        equivalencia y código de cada presentación.
      </p>
      {rows.map((row) => (
        <div
          key={row.key}
          className="rounded-[10px] border border-[#e0e7ef] bg-white p-4 [&+&]:mt-2.5"
        >
          <div className="grid grid-cols-1 gap-4 tablet:grid-cols-4 md:grid-cols-2">
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
      <CatalogButton
        onClick={() =>
          setRows((current) => [...current, newPresentationDraft()])
        }
      >
        <PlusIcon className="size-4" />
        Agregar presentación
      </CatalogButton>
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
      <p className="mt-3 mb-5 text-xs leading-[1.8] text-[#8b99aa] md:text-sm">
        Las equivalencias existentes no se cambian: desactiva la presentación y
        crea otra para conservar el historial. Las presentaciones no se borran.
      </p>
      <CatalogButton
        tone="primary"
        disabled={saving}
        onClick={() => void save()}
      >
        {saving ? 'Guardando…' : 'Guardar presentaciones'}
      </CatalogButton>
    </CatalogModal>
  )
}
