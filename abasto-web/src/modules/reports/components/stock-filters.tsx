import {
  Field,
  FieldInput,
  FieldSelect,
} from '#/modules/reports/components/report-fields'
import {
  agingThresholds,
  ALL,
  lossReasonFilters,
  periodOptions,
} from '#/modules/reports/lib/constants'
import { demoProducts } from '#/shared/demo/products'
import { warehouseNames } from '#/shared/demo/types'

import type { useStockFilters } from '#/modules/reports/hooks/use-stock-filters'
import type { LossReason, PeriodMode } from '#/modules/reports/types/reports'

/** Filters of the stock reports; the last fields change with the selected view. */
export function StockFilters({
  filters,
}: {
  filters: ReturnType<typeof useStockFilters>
}) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 metrics:grid-cols-3">
      <Field label="Almacén">
        <FieldSelect
          value={filters.warehouse}
          onChange={(event) => filters.setWarehouse(event.target.value)}
        >
          <option>{ALL}</option>
          {warehouseNames.map((name) => (
            <option key={name}>{name}</option>
          ))}
        </FieldSelect>
      </Field>
      <Field label="Producto">
        <FieldSelect
          value={filters.product}
          onChange={(event) => filters.setProduct(event.target.value)}
        >
          <option value={ALL}>Todos los productos</option>
          {demoProducts.map((product) => (
            <option key={product.id} value={product.id}>
              {product.name}
            </option>
          ))}
        </FieldSelect>
      </Field>
      {filters.view === 'Bajas' ? (
        <>
          <Field label="Periodo">
            <FieldSelect
              value={filters.period}
              onChange={(event) =>
                filters.setPeriod(event.target.value as PeriodMode)
              }
            >
              {periodOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </FieldSelect>
          </Field>
          <Field label="Fecha de referencia">
            <FieldInput
              type="date"
              value={filters.date}
              onChange={(event) => filters.setDate(event.target.value)}
            />
          </Field>
          <Field label="Motivo">
            <FieldSelect
              value={filters.reason}
              onChange={(event) =>
                filters.setReason(event.target.value as LossReason | typeof ALL)
              }
            >
              {lossReasonFilters.map((reason) => (
                <option key={reason}>{reason}</option>
              ))}
            </FieldSelect>
          </Field>
        </>
      ) : (
        <Field label="Sin venta desde hace al menos">
          <FieldSelect
            value={filters.days}
            onChange={(event) => filters.setDays(Number(event.target.value))}
          >
            {agingThresholds.map((days) => (
              <option key={days} value={days}>
                {days ? `${days} días` : 'Mostrar todo el inventario'}
              </option>
            ))}
          </FieldSelect>
        </Field>
      )}
    </div>
  )
}
