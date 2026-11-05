import { CalendarDaysIcon } from 'lucide-react'

import { cn } from '#/lib/utils/cn'
import {
  Field,
  FieldInput,
  FieldSelect,
} from '#/modules/reports/components/report-fields'
import { rangeLabel } from '#/modules/reports/lib/period'
import {
  defaultExpiringDays,
  defaultPreset,
} from '#/modules/reports/lib/search'
import type { ReportSearch } from '#/modules/reports/lib/search'
import type {
  DateRange,
  PeriodPreset,
  ReportTab,
  ReportWarehouse,
} from '#/modules/reports/types/reports'

const presets: Array<{ value: PeriodPreset; label: string }> = [
  { value: 'today', label: 'Hoy' },
  { value: '7', label: '7 días' },
  { value: '30', label: '30 días' },
  { value: 'custom', label: 'Personalizado' },
]

const expiringOptions = [7, 15, 30, 60]

type ReportFiltersProps = {
  tab: ReportTab
  search: ReportSearch
  warehouses: Array<ReportWarehouse>
  range?: DateRange
  onChange: (patch: Partial<ReportSearch>) => void
}

/** Period presets, custom dates and the warehouse filter, all kept in the URL. */
export function ReportFilters({
  tab,
  search,
  warehouses,
  range,
  onChange,
}: ReportFiltersProps) {
  const preset = search.periodo ?? defaultPreset
  const usesPeriod = tab === 'ventas' || tab === 'cajas'
  const usesWarehouse = tab !== 'cartera'

  return (
    <div className="mb-[22px] rounded-[13px] border border-[#f0e9e1] bg-white p-[15px] md:px-[23px] md:py-5">
      {tab === 'cartera' && (
        <p className="text-xs leading-[1.7] text-[#948087]">
          La cartera es de toda la empresa: un cliente tiene un solo saldo en
          todos los almacenes.
        </p>
      )}
      {usesPeriod && (
        <div className="flex flex-col gap-3.5 md:flex-row md:items-center md:justify-between">
          <div
            role="group"
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
                  'flex-1 rounded-[5px] p-2 text-[13px] text-[#846d75] md:flex-none md:px-5 md:py-[9px]',
                  preset === option.value && 'bg-[#3f1266] text-white',
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
          {range && (
            <span className="flex items-center gap-[9px] text-xs text-[#5d387e]">
              <CalendarDaysIcon size={15} />
              {rangeLabel(range)} · Ciudad de México
            </span>
          )}
        </div>
      )}
      {usesPeriod && preset === 'custom' && (
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
      {usesWarehouse && (
        <div
          className={cn(
            'grid grid-cols-1 gap-[13px] md:grid-cols-2 md:gap-4',
            usesPeriod && 'mt-4',
          )}
        >
          <Field label="Almacén">
            <FieldSelect
              aria-label="Almacén del reporte"
              value={search.almacen ?? ''}
              onChange={(event) =>
                onChange({ almacen: event.target.value || undefined })
              }
            >
              <option value="">Todos mis almacenes</option>
              {warehouses.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </FieldSelect>
          </Field>
          {tab === 'inventario' && (
            <Field label="Por vencer en los próximos">
              <FieldSelect
                aria-label="Días por vencer"
                value={search.dias ?? defaultExpiringDays}
                onChange={(event) =>
                  onChange({ dias: Number(event.target.value) })
                }
              >
                {expiringOptions.map((days) => (
                  <option key={days} value={days}>
                    {days} días
                  </option>
                ))}
              </FieldSelect>
            </Field>
          )}
        </div>
      )}
    </div>
  )
}
