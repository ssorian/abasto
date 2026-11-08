import { Field, FieldSelect } from '#/modules/reports/components/report-fields'
import type { ReportSupplier } from '#/modules/reports/types/reports'

/** "Todos los proveedores" plus one option per supplier; `value` is the id from the URL. */
export function SupplierSelect({
  suppliers,
  value,
  onChange,
}: {
  suppliers: Array<ReportSupplier>
  value?: string
  /** `undefined` means all suppliers. */
  onChange: (supplierId: string | undefined) => void
}) {
  return (
    <Field
      label="Proveedor"
      className="md:min-w-[220px] md:flex-row md:items-center md:gap-3"
    >
      <FieldSelect
        aria-label="Proveedor del reporte"
        value={value ?? ''}
        onChange={(event) => onChange(event.target.value || undefined)}
      >
        <option value="">Todos los proveedores</option>
        {suppliers.map((item) => (
          <option key={item.id} value={item.id}>
            {item.active ? item.name : `${item.name} (inactivo)`}
          </option>
        ))}
      </FieldSelect>
    </Field>
  )
}
