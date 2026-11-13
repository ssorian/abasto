import { useId, useState } from 'react'

import { ChevronDownIcon } from 'lucide-react'

import { cn } from '#/lib/utils/cn'
import { CatalogButton } from '#/modules/catalog/components/catalog-button'
import { CatalogModal } from '#/modules/catalog/components/catalog-modal'
import {
  Field,
  SelectInput,
  TextArea,
  TextInput,
} from '#/modules/catalog/forms/form-field'
import { PresentationRows } from '#/modules/catalog/forms/presentation-rows'
import { categories } from '#/modules/catalog/lib/catalog-types'
import {
  defaultKeyOf,
  draftsFromProduct,
  initialPresentationDrafts,
  presentationPriceErrors,
} from '#/modules/catalog/lib/presentation-draft'
import {
  draftFromProduct,
  emptyProductDraft,
  newProductCostErrors,
  supplierChange,
} from '#/modules/catalog/lib/product-draft'
import { netCostOf } from '#/modules/pricing/lib/product-costs'
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
   * Warehouse selected in Catálogo. When creating, the sale price of each
   * presentation is saved there; without one they are set later in Precios.
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
  /**
   * Archives the product being edited (owner only). Resolves to the refusal
   * message (shown in the dialog) or null once archived, which closes it.
   */
  onArchive?: () => Promise<string | null>
  onClose: () => void
}

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

/** Text button that shows or hides the optional fields rendered after it. */
function Disclosure({
  label,
  open,
  onToggle,
}: {
  label: string
  open: boolean
  onToggle: () => void
}) {
  return (
    <button
      type="button"
      aria-expanded={open}
      className="flex items-center gap-1.5 justify-self-start rounded-md text-[13px] font-medium text-[#4d2b6a] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d8c0e9] md:col-span-2"
      onClick={onToggle}
    >
      <ChevronDownIcon
        className={cn('size-4 transition-transform', open && 'rotate-180')}
      />
      {label}
    </button>
  )
}

const hintClass = 'text-xs leading-[1.6] text-[#9d8c92] md:col-span-2'

export function ProductFormDialog({
  product,
  suppliers,
  warehouseName,
  onSubmit,
  onArchive,
  onClose,
}: ProductFormDialogProps) {
  const [draft, setDraft] = useState(() =>
    product ? draftFromProduct(product) : emptyProductDraft(),
  )
  const [presentations, setPresentations] = useState<PresentationsState>(() =>
    product
      ? { rows: draftsFromProduct(product), defaultKey: defaultKeyOf(product) }
      : initialPresentationDrafts(),
  )
  const [saving, setSaving] = useState(false)
  const [confirmingArchive, setConfirmingArchive] = useState(false)
  const [failure, setFailure] = useState<string | null>(null)
  const [showErrors, setShowErrors] = useState(false)
  const [showDiscounts, setShowDiscounts] = useState(false)
  const [showMore, setShowMore] = useState(() =>
    Boolean(draft.supplierCode || draft.description || draft.imageUrl),
  )
  const patch = (change: Partial<ProductDraft>) =>
    setDraft((current) => ({ ...current, ...change }))
  // An inactive supplier stays selectable only while the product still uses it.
  const choices = suppliers.filter(
    ({ active, id }) => active || id === draft.supplierId,
  )

  const costErrors: Partial<Record<keyof ProductDraft, string>> = product
    ? {}
    : newProductCostErrors(draft)
  const priceErrors = product
    ? {}
    : presentationPriceErrors(
        presentations.rows,
        presentations.defaultKey,
        Boolean(warehouseName),
      )
  const net = draft.listPrice.trim() ? netCostOf(draft, 1) : null
  const errorOf = (key: keyof ProductDraft) =>
    showErrors ? costErrors[key] : undefined

  async function save() {
    setFailure(null)
    setShowErrors(true)
    if (costErrors.fixedDiscount || costErrors.promotion) setShowDiscounts(true)
    if (Object.keys(costErrors).length || Object.keys(priceErrors).length) {
      return
    }
    setSaving(true)
    const message = await onSubmit(draft, presentations)
    setSaving(false)
    if (message === null) onClose()
    else setFailure(message)
  }

  async function archive() {
    if (!onArchive) return
    setFailure(null)
    setSaving(true)
    const message = await onArchive()
    setSaving(false)
    if (message === null) onClose()
    else {
      setConfirmingArchive(false)
      setFailure(message)
    }
  }

  const text = (
    key: keyof ProductDraft,
    label: string,
    className?: string,
    placeholder?: string,
  ) => (
    <Field label={label} className={className}>
      <TextInput
        aria-label={label}
        value={String(draft[key])}
        placeholder={placeholder}
        onChange={(event) => patch({ [key]: event.target.value })}
      />
    </Field>
  )

  const amount = (key: keyof ProductDraft, label: string) => (
    <Field label={label}>
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
  )

  return (
    <CatalogModal
      size="editor"
      title={product ? 'Editar producto' : 'Nuevo producto'}
      description={
        product
          ? 'Los costos y los precios de venta se editan en «Precios».'
          : 'El costo es por pieza; el precio de venta, por presentación.'
      }
      onClose={onClose}
    >
      <div className="grid gap-[18px]">
        <Section title="Producto">
          {text('name', 'Nombre', 'md:col-span-2')}
          {text('sku', 'SKU')}
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
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  ...supplierChange(current, event.target.value, suppliers),
                }))
              }
            >
              <option value="">Sin proveedor</option>
              {choices.map(({ id, name }) => (
                <option key={id} value={id}>
                  {name}
                </option>
              ))}
            </SelectInput>
          </Field>
          {text('brand', 'Marca', undefined, 'Igual que el proveedor')}
          <label className="flex items-center gap-2.5 text-[13px] font-medium text-[#513f45] md:col-span-2">
            <input
              type="checkbox"
              className="size-4 accent-[#3b2251]"
              checked={draft.published}
              onChange={(event) => patch({ published: event.target.checked })}
            />
            Publicado
            <span className="font-normal text-[#9d8c92]">
              {draft.published
                ? 'Permite nuevos pedidos'
                : 'Pausado: no permite nuevos pedidos'}
            </span>
          </label>
        </Section>
        <Section title="Cómo se vende">
          <p className={hintClass}>
            {product
              ? `El inventario se cuenta en ${draft.unit}. Los precios se capturan por almacén en «Precios».`
              : warehouseName
                ? `El inventario se cuenta en piezas. Los precios de venta se guardan en ${warehouseName}; el de la pieza es obligatorio.`
                : 'El inventario se cuenta en piezas. No hay un almacén seleccionado en el catálogo, así que los precios de venta se definen después en «Precios».'}
          </p>
          <div className="min-w-0 md:col-span-2">
            <PresentationRows
              unit={draft.unit}
              state={presentations}
              onChange={setPresentations}
              pricing={
                !product && warehouseName
                  ? {
                      netPerPiece: net?.perPiece ?? null,
                      errors: showErrors ? priceErrors : {},
                    }
                  : undefined
              }
            />
          </div>
          {product && (
            <p className={hintClass}>
              Las equivalencias existentes no se cambian: desactiva la
              presentación y crea otra para conservar el historial. Las
              presentaciones guardadas no se borran.
            </p>
          )}
        </Section>
        {!product && (
          <Section title="Costo del proveedor">
            {amount('listPrice', 'Costo por pieza')}
            <dl className="flex items-baseline justify-between gap-2 self-start rounded-lg bg-[#faf6f1] px-3.5 py-3 text-sm md:mt-[26.5px]">
              <dt className="text-[#89747b]">Costo neto por pieza</dt>
              <dd className="font-bold text-[#4d2b6a]">
                {net ? `$${formatTenThousandths(net.perPiece)}` : '—'}
              </dd>
            </dl>
            <Disclosure
              label="Descuentos del proveedor"
              open={showDiscounts}
              onToggle={() => setShowDiscounts((open) => !open)}
            />
            {showDiscounts && (
              <>
                {amount('fixedDiscount', 'Descuento fijo por pieza')}
                {amount('promotion', 'Promoción por pieza')}
              </>
            )}
          </Section>
        )}
        <Section title="Opcional">
          <Disclosure
            label="Clave del proveedor, descripción e imagen"
            open={showMore}
            onToggle={() => setShowMore((open) => !open)}
          />
          {showMore && (
            <>
              {text('supplierCode', 'Clave del proveedor')}
              <Field label="Descripción" className="md:col-span-2">
                <TextArea
                  aria-label="Descripción"
                  rows={4}
                  value={draft.description}
                  placeholder="Contenido, sabor, empaque y lo que ayude a identificarlo."
                  onChange={(event) =>
                    patch({ description: event.target.value })
                  }
                />
              </Field>
              <Field label="URL de la imagen" className="md:col-span-2">
                <TextInput
                  aria-label="URL de la imagen"
                  type="url"
                  inputMode="url"
                  value={draft.imageUrl}
                  placeholder="https://…"
                  onChange={(event) => patch({ imageUrl: event.target.value })}
                />
              </Field>
            </>
          )}
        </Section>
      </div>
      {failure && (
        <p role="alert" className="mt-[18px] text-sm text-[#b42318]">
          {failure}
        </p>
      )}
      {onArchive && (
        <div className="mt-[18px] rounded-[9px] border border-[#eee7e0] bg-[#faf9f7] p-[13px]">
          {confirmingArchive ? (
            <div className="grid gap-3">
              <p className="text-sm leading-[1.6] text-[#513f45]">
                ¿Archivar este producto? Dejará de verse en el catálogo, los
                pedidos y la tienda, pero conserva todo su historial. Podrás
                restaurarlo cuando quieras desde «Archivados».
              </p>
              <div className="flex flex-wrap gap-2">
                <CatalogButton
                  disabled={saving}
                  onClick={() => setConfirmingArchive(false)}
                >
                  No archivar
                </CatalogButton>
                <CatalogButton
                  tone="primary"
                  disabled={saving}
                  onClick={() => void archive()}
                >
                  {saving ? 'Archivando…' : 'Sí, archivar'}
                </CatalogButton>
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs leading-[1.6] text-[#856972]">
                Si ya no lo vendes, archívalo. Solo se puede sin existencias ni
                pedidos abiertos, y se puede restaurar.
              </p>
              <CatalogButton
                disabled={saving}
                onClick={() => setConfirmingArchive(true)}
              >
                Archivar producto
              </CatalogButton>
            </div>
          )}
        </div>
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
