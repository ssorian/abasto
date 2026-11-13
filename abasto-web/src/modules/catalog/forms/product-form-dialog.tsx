import { useId, useState } from 'react'

import { Tabs, TabsContent, TabsList, TabsTrigger } from '#/components/ui/tabs'
import { CatalogButton } from '#/modules/catalog/components/catalog-button'
import { CatalogModal } from '#/modules/catalog/components/catalog-modal'
import {
  Field,
  SelectInput,
  TextInput,
} from '#/modules/catalog/forms/form-field'
import { PresentationRows } from '#/modules/catalog/forms/presentation-rows'
import { baseUnits, categories } from '#/modules/catalog/lib/catalog-types'
import {
  defaultKeyOf,
  draftsFromProduct,
  initialPresentationDrafts,
  renameBaseRows,
} from '#/modules/catalog/lib/presentation-draft'
import {
  draftFromProduct,
  emptyProductDraft,
  newProductCostErrors,
} from '#/modules/catalog/lib/product-draft'
import { formatBps, formatCents, parsePesos } from '#/modules/pricing/lib/money'
import { netCostOf, saleCheck } from '#/modules/pricing/lib/product-costs'
import { formatTenThousandths } from '#/lib/utils/supplier-cost'

import type { PresentationsState } from '#/modules/catalog/forms/presentation-rows'
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
  /**
   * Warehouse selected in Catálogo. When creating, the sale price of the
   * default presentation is saved there; without one it is set later in Precios.
   */
  warehouseName?: string
  /**
   * The only save of the dialog: product fields and presentations together.
   * Resolves to the server message when it failed (shown in the dialog, which
   * stays open) or null when saved, which closes the dialog.
   */
  onSubmit: (
    draft: ProductDraft,
    presentations: PresentationsState,
  ) => Promise<string | null>
  onClose: () => void
}

/** The line variant relies on `data-active`, which Radix does not set. */
const tabClass =
  'flex-none rounded-none border-0 border-b-2 border-transparent px-3 pb-2 data-[state=active]:border-b-[#3b2251] data-[state=active]:text-[#3b2251]'

function Section({ title, children }: { title: string; children: ReactNode }) {
  const id = useId()
  return (
    <section
      aria-labelledby={id}
      className="min-w-0 border-t border-[#f4eee8] pt-4 first:border-t-0 first:pt-0"
    >
      <h3
        id={id}
        className="mb-[13px] w-full text-[11px] font-semibold tracking-[0.06em] text-[#927981] uppercase"
      >
        {title}
      </h3>
      <div className="grid grid-cols-1 gap-[15px] md:grid-cols-2">
        {children}
      </div>
    </section>
  )
}

export function ProductFormDialog({
  product,
  suppliers,
  warehouseName,
  onSubmit,
  onClose,
}: ProductFormDialogProps) {
  const [draft, setDraft] = useState(() =>
    product ? draftFromProduct(product) : emptyProductDraft(),
  )
  const [presentations, setPresentations] = useState<PresentationsState>(() =>
    product
      ? { rows: draftsFromProduct(product), defaultKey: defaultKeyOf(product) }
      : initialPresentationDrafts(draft.unit),
  )
  const [saving, setSaving] = useState(false)
  const [failure, setFailure] = useState<string | null>(null)
  const [tab, setTab] = useState('details')
  const [showCostErrors, setShowCostErrors] = useState(false)
  const patch = (change: Partial<ProductDraft>) =>
    setDraft((current) => ({ ...current, ...change }))
  const changeUnit = (unit: string) => {
    setPresentations((current) => ({
      ...current,
      rows: renameBaseRows(current.rows, draft.unit, unit),
    }))
    patch({ unit })
  }
  // An inactive supplier stays selectable only while the product still uses it.
  const choices = suppliers.filter(
    ({ active, id }) => active || id === draft.supplierId,
  )

  const costErrors = product
    ? {}
    : newProductCostErrors(draft, Boolean(warehouseName))
  const defaultRow = presentations.rows.find(
    (row) => row.key === presentations.defaultKey,
  )
  const defaultFactor = defaultRow?.factor ?? 1
  const net = draft.listPrice.trim() ? netCostOf(draft, defaultFactor) : null
  const typedPrice = parsePesos(draft.salePrice)
  const check =
    net && typedPrice.ok
      ? saleCheck(defaultFactor, typedPrice.value, net.perPiece)
      : null

  async function save() {
    setFailure(null)
    setShowCostErrors(true)
    if (Object.keys(costErrors).length) {
      setTab('details')
      return
    }
    setSaving(true)
    const message = await onSubmit(draft, presentations)
    setSaving(false)
    if (message === null) onClose()
    else setFailure(message)
  }

  const identityFields: Array<readonly [keyof ProductDraft, string]> = [
    ['name', 'Nombre'],
    ['brand', 'Marca'],
    ['sku', 'SKU'],
  ]

  const costFields: Array<readonly [keyof ProductDraft, string]> = [
    ['listPrice', 'Costo por pieza'],
    ['fixedDiscount', 'Descuento fijo'],
    ['promotion', 'Promoción'],
  ]
  const errorOf = (key: string) =>
    showCostErrors ? (costErrors as Record<string, string>)[key] : undefined

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
            onChange={(event) => changeUnit(event.target.value)}
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
      {!product && (
        <Section title="Costo y precio">
          {costFields.map(([key, label]) => (
            <Field key={key} label={label}>
              <TextInput
                inputMode="decimal"
                placeholder="0.0000"
                aria-label={label}
                aria-invalid={Boolean(errorOf(key))}
                value={String(draft[key])}
                onChange={(event) => patch({ [key]: event.target.value })}
              />
              {errorOf(key) && (
                <span className="text-xs text-[#b42318]">{errorOf(key)}</span>
              )}
            </Field>
          ))}
          <p className="text-xs text-[#9d8c92] md:self-end md:pb-3">
            Costo del proveedor por pieza, para todos los almacenes. Hasta 4
            decimales.
          </p>
          {warehouseName ? (
            <Field
              label={`Precio de venta · ${defaultRow?.name ?? 'presentación principal'} · ${warehouseName}`}
              className="md:col-span-2"
            >
              <TextInput
                inputMode="decimal"
                placeholder="0.00"
                aria-label="Precio de venta"
                aria-invalid={Boolean(errorOf('salePrice'))}
                value={draft.salePrice}
                onChange={(event) => patch({ salePrice: event.target.value })}
              />
              {errorOf('salePrice') && (
                <span className="text-xs text-[#b42318]">
                  {errorOf('salePrice')}
                </span>
              )}
            </Field>
          ) : (
            <p className="rounded-[9px] border border-[#e7deed] bg-[#f8f2ec] p-[13px] text-xs leading-[1.7] text-[#856972] md:col-span-2">
              No hay un almacén seleccionado en el catálogo, así que el precio
              de venta se define después en «Precios».
            </p>
          )}
          <dl className="grid gap-x-4 gap-y-1 rounded-xl bg-[#faf6f1] px-3.5 py-3 text-sm md:col-span-2 md:grid-cols-2">
            <div className="flex items-baseline justify-between gap-2">
              <dt className="text-[#89747b]">Costo neto por pieza</dt>
              <dd className="font-bold text-[#4d2b6a]">
                {net ? `$${formatTenThousandths(net.perPiece)}` : '—'}
              </dd>
            </div>
            <div className="flex items-baseline justify-between gap-2">
              <dt className="text-[#89747b]">Margen del precio</dt>
              <dd className="font-bold text-[#4d2b6a]">
                {check ? `${formatBps(check.marginBps)}%` : '—'}
              </dd>
            </div>
          </dl>
          {check?.belowCost && (
            <p className="text-xs text-[#a08442] md:col-span-2">
              El precio está por debajo del costo neto (
              {formatCents(check.costCents)}). Puedes guardarlo.
            </p>
          )}
        </Section>
      )}
    </div>
  )

  return (
    <CatalogModal
      size="editor"
      title={product ? 'Editar producto' : 'Nuevo producto'}
      description={
        product
          ? 'Aquí se define qué es el producto, su proveedor y sus presentaciones. Los costos y precios de venta se editan en «Precios».'
          : 'Aquí se define qué es el producto, su proveedor y sus presentaciones. También capturas su costo y su precio de venta, y todo se guarda junto.'
      }
      onClose={onClose}
    >
      <Tabs value={tab} onValueChange={setTab} className="flex-col gap-[18px]">
        <TabsList variant="line" className="h-auto w-full justify-start">
          <TabsTrigger value="details" className={tabClass}>
            Datos del producto
          </TabsTrigger>
          <TabsTrigger value="presentations" className={tabClass}>
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
          <div className="grid gap-[15px]">
            <p className="rounded-[9px] border border-[#e7deed] bg-[#f8f2ec] p-[13px] text-xs leading-[1.7] text-[#856972]">
              Inventario en {draft.unit}. Define cómo se vende el producto:
              nombre, equivalencia y código de barras de cada presentación. Se
              guardan junto con el producto con «Guardar producto»
              {product
                ? '; los precios se capturan por almacén en «Precios»'
                : ''}
              .
            </p>
            <PresentationRows
              compact
              unit={draft.unit}
              state={presentations}
              onChange={setPresentations}
            />
            {product && (
              <p className="text-xs leading-[1.8] text-[#a49197] md:text-sm">
                Las equivalencias existentes no se cambian: desactiva la
                presentación y crea otra para conservar el historial. Las
                presentaciones guardadas no se borran.
              </p>
            )}
          </div>
        </TabsContent>
      </Tabs>
      {failure && (
        <p role="alert" className="mt-[18px] text-sm text-[#b42318]">
          {failure}
        </p>
      )}
      <div className="mt-[18px] flex items-center justify-between gap-3 border-t border-[#f4eee8] pt-5">
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
