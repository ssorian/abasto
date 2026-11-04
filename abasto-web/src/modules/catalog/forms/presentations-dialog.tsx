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
  newPresentationId,
  pricingFactor,
  pricingLabel,
} from '#/modules/catalog/lib/catalog-presentations'
import { draftsFromProduct } from '#/modules/catalog/lib/presentation-draft'

import type {
  CatalogProduct,
  PresentationDraft,
} from '#/modules/catalog/lib/catalog-types'

type PresentationsDialogProps = {
  product: CatalogProduct
  onSubmit: (rows: Array<PresentationDraft>, defaultId: string) => void
  onClose: () => void
}

export function PresentationsDialog({
  product,
  onSubmit,
  onClose,
}: PresentationsDialogProps) {
  const [rows, setRows] = useState(() => draftsFromProduct(product))
  const [defaultId, setDefaultId] = useState(product.defaultPresentationId)
  const patch = (id: string, change: Partial<PresentationDraft>) =>
    setRows((current) =>
      current.map((row) => (row.id === id ? { ...row, ...change } : row)),
    )
  const saved = (id: string) =>
    product.presentations.some((presentation) => presentation.id === id)

  return (
    <CatalogModal
      size="wide"
      title={`Presentaciones · ${product.name}`}
      description={`Inventario en ${product.baseUnit}. Cada venta descuenta sus equivalencias del mismo lote.`}
      onClose={onClose}
    >
      <p className="my-[15px] rounded-[9px] border border-[#d9e5f2] bg-[#eaf1fa] p-[13px] text-xs leading-[1.7] text-[#54759a]">
        El precio principal del catálogo y del lote corresponde a{' '}
        {pricingFactor(product)} {product.baseUnit} ({pricingLabel(product)}).
        Las otras presentaciones calculan su precio por equivalencia.
      </p>
      {rows.map((row) => (
        <div
          key={row.id}
          className="rounded-[10px] border border-[#e0e7ef] bg-white p-4 [&+&]:mt-2.5"
        >
          <div className="grid grid-cols-1 gap-4 tablet:grid-cols-3 md:grid-cols-2">
            <Field label="Nombre">
              <TextInput
                value={row.name}
                onChange={(event) =>
                  patch(row.id, { name: event.target.value })
                }
              />
            </Field>
            <Field label={`Equivale a cuántas ${product.baseUnit}`}>
              <TextInput
                type="number"
                min="1"
                step="1"
                disabled={saved(row.id)}
                value={row.factor || ''}
                onChange={(event) =>
                  patch(row.id, { factor: Number(event.target.value) })
                }
              />
            </Field>
            <Field label="Código de barras de esta presentación">
              <TextInput
                value={row.barcode}
                onChange={(event) =>
                  patch(row.id, { barcode: event.target.value.trim() })
                }
              />
            </Field>
            <Field label="Precio fijo opcional (MXN)">
              <TextInput
                type="number"
                min="0.01"
                step="0.01"
                placeholder="Calcular según el lote"
                value={row.price}
                onChange={(event) =>
                  patch(row.id, { price: event.target.value })
                }
              />
            </Field>
            <Field label="Estado">
              <SelectInput
                value={row.active ? 'Activa' : 'Inactiva'}
                onChange={(event) =>
                  patch(row.id, { active: event.target.value === 'Activa' })
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
          setRows((current) => [
            ...current,
            {
              id: newPresentationId(),
              name: '',
              factor: 1,
              barcode: '',
              active: true,
              price: '',
            },
          ])
        }
      >
        <PlusIcon className="size-4" />
        Agregar presentación
      </CatalogButton>
      <Field label="Presentación predeterminada al vender">
        <SelectInput
          value={defaultId}
          onChange={(event) => setDefaultId(event.target.value)}
        >
          {rows
            .filter((row) => row.active)
            .map((row) => (
              <option key={row.id} value={row.id}>
                {row.name || 'Sin nombre'} · {row.factor} {product.baseUnit}
              </option>
            ))}
        </SelectInput>
      </Field>
      <p className="mt-3 mb-5 text-xs leading-[1.8] text-[#8b99aa] md:text-sm">
        Un precio fijo de presentación aplica a todos los lotes. Las
        equivalencias existentes no se cambian: desactiva la presentación y crea
        otra para conservar el historial. Puedes vender empaques y unidades
        sueltas en una misma partida.
      </p>
      <CatalogButton tone="primary" onClick={() => onSubmit(rows, defaultId)}>
        Guardar presentaciones
      </CatalogButton>
    </CatalogModal>
  )
}
