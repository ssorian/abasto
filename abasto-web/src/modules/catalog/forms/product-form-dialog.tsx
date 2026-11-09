import { useState } from 'react'

import { Tabs, TabsContent, TabsList, TabsTrigger } from '#/components/ui/tabs'
import { CatalogButton } from '#/modules/catalog/components/catalog-button'
import { CatalogModal } from '#/modules/catalog/components/catalog-modal'
import {
  Field,
  SelectInput,
  TextInput,
} from '#/modules/catalog/forms/form-field'
import { PresentationsEditor } from '#/modules/catalog/forms/presentations-dialog'
import { baseUnits, categories } from '#/modules/catalog/lib/catalog-types'
import {
  draftFromProduct,
  emptyProductDraft,
} from '#/modules/catalog/lib/product-draft'

import type { SavePresentations } from '#/modules/catalog/forms/presentations-dialog'
import type {
  CatalogProduct,
  CatalogSupplier,
  ProductDraft,
} from '#/modules/catalog/lib/catalog-types'
import type { ReactNode } from 'react'

type ProductFormDialogProps = {
  /** Product being edited; undefined creates a new one. */
  product?: CatalogProduct
  suppliers: ReadonlyArray<CatalogSupplier>
  /** Resolves to whether the save worked; the dialog closes only then. */
  onSubmit: (draft: ProductDraft) => Promise<boolean>
  /**
   * Saves the presentations of an existing product (own save, own validation).
   * Without it, or when creating, the presentations tab is not shown.
   */
  onSubmitPresentations?: SavePresentations
  onClose: () => void
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <fieldset className="grid min-w-0 grid-cols-1 gap-[15px] border-t border-[#f4eee8] pt-4 first:border-t-0 first:pt-0 md:grid-cols-2">
      <legend className="float-left mb-[2px] w-full text-[11px] font-semibold tracking-[0.06em] text-[#927981] uppercase">
        {title}
      </legend>
      {children}
    </fieldset>
  )
}

export function ProductFormDialog({
  product,
  suppliers,
  onSubmit,
  onSubmitPresentations,
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

  const identityFields: Array<readonly [keyof ProductDraft, string]> = [
    ['name', 'Nombre'],
    ['brand', 'Marca'],
    ['sku', 'SKU'],
    ...(product ? [] : ([['barcode', 'Código de barras']] as const)),
  ]

  const details = (
    <div className="grid gap-[18px]">
      <Section title="Identidad">
        {identityFields.map(([key, label]) => (
          <Field key={key} label={label}>
            <TextInput
              aria-label={label}
              value={String(draft[key])}
              onChange={(event) => patch({ [key]: event.target.value })}
            />
          </Field>
        ))}
        <Field label="Descripción y presentación" className="md:col-span-2">
          <TextInput
            aria-label="Descripción y presentación"
            value={draft.description}
            placeholder="600 ml · Caja con 24 botellas"
            onChange={(event) => patch({ description: event.target.value })}
          />
        </Field>
        <Field label="URL de la imagen" className="md:col-span-2">
          <TextInput
            aria-label="URL de la imagen"
            type="url"
            inputMode="url"
            value={draft.imageUrl}
            placeholder="https://… (opcional)"
            onChange={(event) => patch({ imageUrl: event.target.value })}
          />
        </Field>
      </Section>
      <Section title="Clasificación y estado">
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
        <Field label="Estado comercial" className="md:col-span-2">
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
      </Section>
      <Section title="Proveedor">
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
        <Field label="Clave del proveedor">
          <TextInput
            aria-label="Clave del proveedor"
            value={draft.supplierCode}
            onChange={(event) => patch({ supplierCode: event.target.value })}
          />
        </Field>
      </Section>
      <div className="flex items-center justify-between gap-3 border-t border-[#f4eee8] pt-5">
        <CatalogButton onClick={onClose}>Cancelar</CatalogButton>
        <CatalogButton
          tone="primary"
          disabled={saving}
          onClick={() => void save()}
        >
          {saving ? 'Guardando…' : 'Guardar producto'}
        </CatalogButton>
      </div>
    </div>
  )

  return (
    <CatalogModal
      size="editor"
      title={product ? 'Editar producto' : 'Nuevo producto'}
      description="Aquí se define qué es el producto, su proveedor y sus presentaciones. Los costos y precios de venta se capturan en «Precios»."
      onClose={onClose}
    >
      {product && onSubmitPresentations ? (
        <Tabs defaultValue="details" className="gap-[18px]">
          <TabsList variant="line" className="w-full justify-start">
            <TabsTrigger value="details" className="flex-none px-3">
              Datos del producto
            </TabsTrigger>
            <TabsTrigger value="presentations" className="flex-none px-3">
              Presentaciones y códigos
            </TabsTrigger>
          </TabsList>
          {/* Both panels stay mounted so typed edits survive switching tabs. */}
          <TabsContent
            value="details"
            forceMount
            className="data-[state=inactive]:hidden"
          >
            {details}
          </TabsContent>
          <TabsContent
            value="presentations"
            forceMount
            className="data-[state=inactive]:hidden"
          >
            <PresentationsEditor
              compact
              product={product}
              onSubmit={onSubmitPresentations}
              onSaved={onClose}
            />
          </TabsContent>
        </Tabs>
      ) : (
        details
      )}
    </CatalogModal>
  )
}
