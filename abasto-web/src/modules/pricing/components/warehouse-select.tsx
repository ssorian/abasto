import { SelectInput } from '#/modules/catalog/forms/form-field'

type WarehouseSelectProps = {
  warehouses: Array<{ id: string; name: string }>
  value: string
  onChange: (id: string) => void
}

/** Picks the warehouse whose prices the catalog shows. */
export function WarehouseSelect({
  warehouses,
  value,
  onChange,
}: WarehouseSelectProps) {
  return (
    <SelectInput
      aria-label="Almacén de los precios"
      className="h-[45px] w-auto min-w-[170px] md:h-11"
      value={value}
      onChange={(event) => onChange(event.target.value)}
    >
      {warehouses.map(({ id, name }) => (
        <option key={id} value={id}>
          {name}
        </option>
      ))}
    </SelectInput>
  )
}
