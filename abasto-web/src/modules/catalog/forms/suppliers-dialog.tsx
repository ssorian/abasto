import { PlusIcon } from 'lucide-react'
import { useState } from 'react'

import { CatalogButton } from '#/modules/catalog/components/catalog-button'
import { CatalogModal } from '#/modules/catalog/components/catalog-modal'
import {
  Field,
  SelectInput,
  TextArea,
  TextInput,
} from '#/modules/catalog/forms/form-field'
import {
  draftFromSupplier,
  emptySupplierDraft,
} from '#/modules/catalog/lib/supplier-draft'

import type {
  CatalogSupplier,
  SupplierDraft,
} from '#/modules/catalog/lib/catalog-types'

type SuppliersDialogProps = {
  suppliers: ReadonlyArray<CatalogSupplier>
  /** Resolves to whether the save worked. */
  onSubmit: (
    supplierId: string | undefined,
    draft: SupplierDraft,
  ) => Promise<boolean>
  onClose: () => void
}

/** Editor target: `{}` creates a supplier, `{ id }` edits one. */
type Editor = { id?: string } | undefined

export function SuppliersDialog({
  suppliers,
  onSubmit,
  onClose,
}: SuppliersDialogProps) {
  const [editor, setEditor] = useState<Editor>()
  const [draft, setDraft] = useState(emptySupplierDraft)
  const [saving, setSaving] = useState(false)
  const patch = (change: Partial<SupplierDraft>) =>
    setDraft((current) => ({ ...current, ...change }))

  function open(supplier?: CatalogSupplier) {
    setDraft(supplier ? draftFromSupplier(supplier) : emptySupplierDraft())
    setEditor({ id: supplier?.id })
  }

  async function save() {
    if (!editor) return
    setSaving(true)
    const saved = await onSubmit(editor.id, draft)
    setSaving(false)
    if (saved) setEditor(undefined)
  }

  return (
    <CatalogModal
      title={
        editor
          ? editor.id
            ? 'Editar proveedor'
            : 'Nuevo proveedor'
          : 'Proveedores'
      }
      description="Las marcas a las que les compras. Un proveedor inactivo deja de ofrecerse en productos nuevos."
      onClose={onClose}
    >
      {editor ? (
        <>
          <Field label="Nombre">
            <TextInput
              aria-label="Nombre del proveedor"
              value={draft.name}
              onChange={(event) => patch({ name: event.target.value })}
            />
          </Field>
          <div className="grid grid-cols-1 gap-[15px] md:grid-cols-2">
            <Field label="Contacto">
              <TextInput
                aria-label="Contacto"
                value={draft.contact}
                onChange={(event) => patch({ contact: event.target.value })}
              />
            </Field>
            <Field label="Teléfono">
              <TextInput
                aria-label="Teléfono"
                value={draft.phone}
                onChange={(event) => patch({ phone: event.target.value })}
              />
            </Field>
          </div>
          <Field label="Notas">
            <TextArea
              aria-label="Notas"
              value={draft.notes}
              onChange={(event) => patch({ notes: event.target.value })}
            />
          </Field>
          <Field label="Estado">
            <SelectInput
              aria-label="Estado del proveedor"
              value={draft.active ? 'Activo' : 'Inactivo'}
              onChange={(event) =>
                patch({ active: event.target.value === 'Activo' })
              }
            >
              <option>Activo</option>
              <option>Inactivo</option>
            </SelectInput>
          </Field>
          <div className="flex items-center justify-between gap-3 border-t border-[#f4eee8] pt-5">
            <CatalogButton onClick={() => setEditor(undefined)}>
              Volver
            </CatalogButton>
            <CatalogButton
              tone="primary"
              disabled={saving}
              onClick={() => void save()}
            >
              {saving ? 'Guardando…' : 'Guardar proveedor'}
            </CatalogButton>
          </div>
        </>
      ) : (
        <>
          {suppliers.length === 0 ? (
            <p className="text-sm text-[#91757e]">
              Aún no hay proveedores. Crea el primero.
            </p>
          ) : (
            <ul className="grid gap-2.5">
              {suppliers.map((supplier) => (
                <li
                  key={supplier.id}
                  className="flex items-center justify-between gap-3 rounded-[10px] border border-[#efe8e0] p-3.5"
                >
                  <div className="min-w-0">
                    <strong className="block truncate text-sm">
                      {supplier.name}
                    </strong>
                    <span className="block truncate text-xs text-[#9f8f94]">
                      {[supplier.contact, supplier.phone]
                        .filter(Boolean)
                        .join(' · ') || 'Sin contacto'}
                      {supplier.active ? '' : ' · Inactivo'}
                    </span>
                  </div>
                  <CatalogButton
                    className="min-h-9 px-3 text-xs"
                    onClick={() => open(supplier)}
                  >
                    Editar
                  </CatalogButton>
                </li>
              ))}
            </ul>
          )}
          <CatalogButton onClick={() => open()}>
            <PlusIcon className="size-4" />
            Nuevo proveedor
          </CatalogButton>
        </>
      )}
    </CatalogModal>
  )
}
