import { CalendarDaysIcon } from 'lucide-react'

import { cn } from '#/lib/utils/cn'
import {
  Field,
  FieldInput,
  FieldSelect,
} from '#/modules/reports/components/report-fields'
import { SupplierSelect } from '#/modules/reports/components/supplier-select'
import { Chip } from '#/modules/reports/components/manager/manager-card'
import { previousRange } from '#/modules/reports/lib/manager-chart-data'
import type { ManagerReportsSearch } from '#/modules/reports/lib/manager-search'
import { shortDate } from '#/modules/reports/lib/manager-format'
import { defaultPreset } from '#/modules/reports/lib/search'
import { hasWarehouseChoice } from '#/modules/warehouses/lib/warehouse-choice'
import type {
  DateRange,
  PeriodPreset,
  ReportSupplier,
  ReportWarehouse,
} from '#/modules/reports/types/reports'

const presets: Array<{ value: PeriodPreset; label: string }> = [
  { value: 'today', label: 'Hoy' },
  { value: '7', label: '7 días' },
  { value: '30', label: '30 días' },
  { value: 'custom', label: 'Personalizado' },
]

type ManagerFiltersProps = {
  search: ManagerReportsSearch
  warehouses: Array<ReportWarehouse>
  suppliers: Array<ReportSupplier>
  /** Warehouse being shown. */
  current?: ReportWarehouse
  range?: DateRange
  onChange: (patch: Partial<ManagerReportsSearch>) => void
}

/** Period, comparison range, warehouse (selector only with more than one) and supplier. */
export function ManagerFilters({
  search,
  warehouses,
  suppliers,
  current,
  range,
  onChange,
}: ManagerFiltersProps) {
  const preset = search.periodo ?? defaultPreset
  const first = warehouses.at(0)
  const before = range ? previousRange(range) : undefined
  return (
    <div className="mb-5 rounded-[13px] border border-[#f0e9e1] bg-white p-[15px] md:px-[23px] md:py-4">
      <div className="flex flex-col gap-3.5 md:flex-row md:flex-wrap md:items-center md:justify-between">
        <div
          role="group"
          aria-label="Periodo"
          className="flex rounded-lg border border-[#e6dfeb] bg-[#fbf9f6] p-[3px]"
        >
          {presets.map((option) => (
            <button
              key={option.value}
              type="button"
              aria-pressed={preset === option.value}
              onClick={() =>
                onChange({
                  periodo:
                    option.value === defaultPreset ? undefined : option.value,
                })
              }
              className={cn(
                'min-h-9 flex-1 rounded-[5px] p-2 text-[13px] text-[#846d75] hover:bg-[#f7f1ea] md:flex-none md:px-5 md:py-[9px]',
                preset === option.value &&
                  'bg-[#3f1266] text-white hover:bg-[#3f1266]',
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
        {hasWarehouseChoice(warehouses) ? (
          <Field
            label="Almacén"
            className="md:min-w-[220px] md:flex-row md:items-center md:gap-3"
          >
            <FieldSelect
              aria-label="Almacén del reporte"
              value={search.almacen ?? first?.id ?? ''}
              onChange={(event) =>
                onChange({
                  almacen:
                    event.target.value === first?.id
                      ? undefined
                      : event.target.value,
                })
              }
            >
              {warehouses.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </FieldSelect>
          </Field>
        ) : (
          current && <Chip tone="gray">{current.name} · tu almacén</Chip>
        )}
        <SupplierSelect
          suppliers={suppliers}
          value={search.proveedor}
          onChange={(proveedor) => onChange({ proveedor })}
        />
        {range && before && (
          <span className="flex items-center gap-[9px] text-xs text-[#5d387e]">
            <CalendarDaysIcon size={15} aria-hidden="true" />
            <span>
              {shortDate(range.from)} – {shortDate(range.to)} ·{' '}
              <em className="text-muted-foreground not-italic">
                comparado con {shortDate(before.from)} – {shortDate(before.to)}
              </em>{' '}
              · Ciudad de México
            </span>
          </span>
        )}
      </div>
      {preset === 'custom' && (
        <div className="mt-4 grid grid-cols-1 gap-[13px] md:grid-cols-2 md:gap-4">
          <Field label="Desde">
            <FieldInput
              type="date"
              value={search.desde ?? ''}
              onChange={(event) =>
                onChange({ desde: event.target.value || undefined })
              }
            />
          </Field>
          <Field label="Hasta">
            <FieldInput
              type="date"
              value={search.hasta ?? ''}
              onChange={(event) =>
                onChange({ hasta: event.target.value || undefined })
              }
            />
          </Field>
        </div>
      )}
    </div>
  )
}
