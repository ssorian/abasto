import { useState } from 'react'

import { CatalogButton } from '#/modules/catalog/components/catalog-button'
import { CatalogModal } from '#/modules/catalog/components/catalog-modal'
import {
  Field,
  SelectInput,
  TextInput,
} from '#/modules/catalog/forms/form-field'
import { baseUnits, categories } from '#/modules/catalog/lib/catalog-types'
import {
  draftFromProduct,
  emptyProductDraft,
} from '#/modules/catalog/lib/product-draft'

import type {
  CatalogProduct,
  CatalogSupplier,
  ProductDraft,
} from '#/modules/catalog/lib/catalog-types'

type ProductFormDialogProps = {
  /** Product being edited; undefined creates a new one. */
  product?: CatalogProduct
  suppliers: ReadonlyArray<CatalogSupplier>
  /** Resolves to whether the save worked; the dialog closes only then. */
  onSubmit: (draft: ProductDraft) => Promise<boolean>
  onClose: () => void
}

export function ProductFormDialog({
  product,
  suppliers,
  onSubmit,
  onClose,
}: ProductFormDialogProps) {
  const [draft, setDraft] = useState(() =>
    product ? draftFromProduct(product) : emptyProductDraft(),
  )
  const [saving, setSaving] = useState(false)
  const patch = (change: Partial<ProductDraft>) =>
    setDraft((current) => ({ ...current, ...change }))
  // An inactive supplier stays selectable only while the product still uses it.
  const choices = suppliers.filter(
    ({ active, id }) => active || id === draft.supplierId,
  )

  async function save() {
    setSaving(true)
    const saved = await onSubmit(draft)
    setSaving(false)
    if (saved) onClose()
  }

  const textFields: Array<readonly [keyof ProductDraft, string]> = [
    ['name', 'Nombre'],
    ['brand', 'Marca'],
    ['sku', 'SKU'],
    ...(product ? [] : ([['barcode', 'Código de barras']] as const)),
  ]

  return (
    <CatalogModal
      size="editor"
      title={product ? 'Editar producto' : 'Nuevo producto'}
      description="Aquí se define qué es el producto. Las presentaciones se editan aparte; los precios y mínimos se capturan por almacén."
      onClose={onClose}
    >
      <div className="grid grid-cols-1 gap-[15px] md:grid-cols-2">
        {textFields.map(([key, label]) => (
          <Field key={key} label={label}>
            <TextInput
              aria-label={label}
              value={String(draft[key])}
              onChange={(event) => patch({ [key]: event.target.value })}
            />
          </Field>
        ))}
      </div>
      <Field label="Descripción y presentación">
        <TextInput
          aria-label="Descripción y presentación"
          value={draft.description}
          placeholder="600 ml · Caja con 24 botellas"
          onChange={(event) => patch({ description: event.target.value })}
        />
      </Field>
      <div className="grid grid-cols-1 gap-[15px] md:grid-cols-2">
        <Field label="Unidad base de inventario">
          <SelectInput
            aria-label="Unidad base de inventario"
            value={draft.unit}
            disabled={!!product}
            onChange={(event) => patch({ unit: event.target.value })}
          >
            {baseUnits.map((unit) => (
              <option key={unit}>{unit}</option>
            ))}
          </SelectInput>
        </Field>
        <Field label="Categoría">
          <SelectInput
            aria-label="Categoría del producto"
            value={draft.category}
            onChange={(event) => patch({ category: event.target.value })}
          >
            {categories.map((category) => (
              <option key={category}>{category}</option>
            ))}
          </SelectInput>
        </Field>
        <Field label="Proveedor">
          <SelectInput
            aria-label="Proveedor"
            value={draft.supplierId}
            onChange={(event) => patch({ supplierId: event.target.value })}
          >
            <option value="">Sin proveedor</option>
            {choices.map(({ id, name }) => (
              <option key={id} value={id}>
                {name}
              </option>
            ))}
          </SelectInput>
        </Field>
        <Field label="Estado comercial">
          <SelectInput
            aria-label="Estado comercial"
            value={draft.published ? 'published' : 'paused'}
            onChange={(event) =>
              patch({ published: event.target.value === 'published' })
            }
          >
            <option value="published">
              Publicado · Permite nuevos pedidos
            </option>
            <option value="paused">Pausado · No permite nuevos pedidos</option>
          </SelectInput>
        </Field>
      </div>
      <div className="mt-[5px] flex items-center justify-between gap-3 border-t border-[#e8edf4] pt-5">
        <CatalogButton onClick={onClose}>Cancelar</CatalogButton>
        <CatalogButton
          tone="primary"
          disabled={saving}
          onClick={() => void save()}
        >
          {saving ? 'Guardando…' : 'Guardar producto'}
        </CatalogButton>
      </div>
    </CatalogModal>
  )
}
