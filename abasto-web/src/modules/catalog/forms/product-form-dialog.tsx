import { useState } from 'react'

import { CatalogButton } from '#/modules/catalog/components/catalog-button'
import { CatalogModal } from '#/modules/catalog/components/catalog-modal'
import {
  Field,
  SelectInput,
  TextInput,
} from '#/modules/catalog/forms/form-field'
import { ProductImageField } from '#/modules/catalog/forms/product-image-field'
import { pricingLabel } from '#/modules/catalog/lib/catalog-presentations'
import { baseUnits, categories } from '#/modules/catalog/lib/catalog-types'
import {
  draftFromProduct,
  emptyProductDraft,
} from '#/modules/catalog/lib/product-draft'

import type {
  CatalogProduct,
  ProductDraft,
} from '#/modules/catalog/lib/catalog-types'

type ProductFormDialogProps = {
  /** Product being edited; undefined creates a new one. */
  product?: CatalogProduct
  onSubmit: (draft: ProductDraft) => void
  onClose: () => void
}

const textFields = [
  ['name', 'Nombre'],
  ['brand', 'Marca'],
  ['sku', 'SKU'],
  ['barcode', 'Código de barras'],
] as const

export function ProductFormDialog({
  product,
  onSubmit,
  onClose,
}: ProductFormDialogProps) {
  const [draft, setDraft] = useState(() =>
    product ? draftFromProduct(product) : emptyProductDraft(),
  )
  const [imageError, setImageError] = useState('')
  const patch = (change: Partial<ProductDraft>) =>
    setDraft((current) => ({ ...current, ...change }))
  const priceUnit = product ? pricingLabel(product) : draft.unit

  return (
    <CatalogModal
      size="editor"
      title={product ? 'Editar producto' : 'Nuevo producto'}
      description="La presentación y el precio de venta pertenecen al catálogo. El costo de entrada se registra al recibir mercancía."
      onClose={onClose}
    >
      <ProductImageField
        image={draft.image}
        onChange={(image) => patch({ image })}
        onError={setImageError}
      />
      <div className="grid grid-cols-1 gap-[15px] md:grid-cols-2">
        {textFields.map(([key, label]) => (
          <Field key={key} label={label}>
            <TextInput
              aria-label={label}
              value={draft[key]}
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
        <Field label={`Precio de venta por ${priceUnit} (MXN)`}>
          <TextInput
            aria-label="Precio de venta"
            type="number"
            min="0.01"
            step="0.01"
            value={draft.price}
            onChange={(event) => patch({ price: event.target.value })}
          />
        </Field>
        {!product && (
          <Field label="Stock mínimo inicial por almacén">
            <TextInput
              aria-label="Stock mínimo inicial"
              type="number"
              min="0"
              step="1"
              value={draft.min}
              onChange={(event) => patch({ min: event.target.value })}
            />
          </Field>
        )}
      </div>
      <Field label="Estado comercial">
        <SelectInput
          aria-label="Estado comercial"
          value={draft.published ? 'published' : 'paused'}
          onChange={(event) =>
            patch({ published: event.target.value === 'published' })
          }
        >
          <option value="published">Publicado · Permite nuevos pedidos</option>
          <option value="paused">Pausado · No permite nuevos pedidos</option>
        </SelectInput>
      </Field>
      {imageError && (
        <div
          role="alert"
          className="rounded-lg border border-[#f0ccc5] bg-[#fff0ed] p-[13px] text-[13px] leading-[1.6] text-[#b26357]"
        >
          {imageError}
        </div>
      )}
      <div className="mt-[5px] flex items-center justify-between gap-3 border-t border-[#e8edf4] pt-5">
        <CatalogButton onClick={onClose}>Cancelar</CatalogButton>
        <CatalogButton tone="primary" onClick={() => onSubmit(draft)}>
          Guardar producto
        </CatalogButton>
      </div>
    </CatalogModal>
  )
}
