import { SelectInput } from '#/modules/catalog/forms/form-field'

type SupplierSelectProps = {
  suppliers: ReadonlyArray<{ id: string; name: string; active: boolean }>
  /** Selected supplier id; empty means all suppliers. */
  value: string
  onChange: (id: string) => void
}

/** Supplier filter for list toolbars; "" is "Todos los proveedores". */
export function SupplierSelect({
  suppliers,
  value,
  onChange,
}: SupplierSelectProps) {
  return (
    <SelectInput
      aria-label="Proveedor"
      className="h-[45px] w-auto min-w-[170px] md:h-11"
      value={value}
      onChange={(event) => onChange(event.target.value)}
    >
      <option value="">Todos los proveedores</option>
      {suppliers.map(({ id, name, active }) => (
        <option key={id} value={id}>
          {active ? name : `${name} (inactivo)`}
        </option>
      ))}
    </SelectInput>
  )
}
