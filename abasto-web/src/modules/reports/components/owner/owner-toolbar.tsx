import type { ReactNode } from 'react'

import { cn } from '#/lib/utils/cn'
import { defaultExecutivePreset } from '#/modules/executive/lib/search'
import type { ExecutiveSearch } from '#/modules/executive/lib/search'
import type {
  PeriodPreset,
  ReportSupplier,
  ReportWarehouse,
} from '#/modules/reports/types/reports'

const presets: Array<{ value: PeriodPreset; label: string }> = [
  { value: 'today', label: 'Hoy' },
  { value: 'week', label: 'Semana' },
  { value: 'month', label: 'Mes' },
  { value: 'custom', label: 'Personalizado' },
]

const control =
  'min-h-[42px] rounded-[9px] border border-input bg-white px-3 py-1.5 text-[13px] text-ink-row'

type OwnerToolbarProps = {
  preset: PeriodPreset
  search: ExecutiveSearch
  warehouses: Array<ReportWarehouse>
  suppliers: Array<ReportSupplier>
  onChange: (patch: Partial<ExecutiveSearch>) => void
  /** Download menu, at the end of the row. */
  actions?: ReactNode
}

/** Title and every control of the page in one row: period, filters, download. */
export function OwnerToolbar({
  preset,
  search,
  warehouses,
  suppliers,
  onChange,
  actions,
}: OwnerToolbarProps) {
  return (
    <div className="mb-[22px] grid gap-3.5">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-3.5">
        <h1 className="mr-auto w-full text-[30px] leading-[1.2] font-bold tracking-[-1px] min-[820px]:w-auto">
          Reportes
        </h1>
        <div
          role="group"
          aria-label="Periodo"
          className="inline-flex max-w-full overflow-x-auto rounded-[9px] border border-[#e6dfeb] bg-white p-[3px]"
        >
          {presets.map((option) => (
            <button
              key={option.value}
              type="button"
              aria-pressed={preset === option.value}
              onClick={() =>
                onChange({
                  periodo:
                    option.value === defaultExecutivePreset
                      ? undefined
                      : option.value,
                })
              }
              className={cn(
                'min-h-9 rounded-md px-4 py-1.5 text-[13px] whitespace-nowrap text-muted-foreground',
                preset === option.value
                  ? 'bg-[#3f1266] font-[650] text-white'
                  : 'hover:bg-muted',
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
        <select
          aria-label="Almacén del reporte"
          value={search.almacen ?? ''}
          onChange={(event) =>
            onChange({ almacen: event.target.value || undefined })
          }
          className={control}
        >
          <option value="">Todos los almacenes</option>
          {warehouses.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>
        <select
          aria-label="Proveedor del reporte"
          value={search.proveedor ?? ''}
          onChange={(event) =>
            onChange({ proveedor: event.target.value || undefined })
          }
          className={control}
        >
          <option value="">Todos los proveedores</option>
          {suppliers.map((item) => (
            <option key={item.id} value={item.id}>
              {item.active ? item.name : `${item.name} (inactivo)`}
            </option>
          ))}
        </select>
        {actions}
      </div>
      {preset === 'custom' && (
        <div className="flex flex-wrap items-center gap-3 text-[13px] text-ink-row">
          <label className="flex items-center gap-2">
            Desde
            <input
              type="date"
              value={search.desde ?? ''}
              onChange={(event) =>
                onChange({ desde: event.target.value || undefined })
              }
              className={control}
            />
          </label>
          <label className="flex items-center gap-2">
            Hasta
            <input
              type="date"
              value={search.hasta ?? ''}
              onChange={(event) =>
                onChange({ hasta: event.target.value || undefined })
              }
              className={control}
            />
          </label>
        </div>
      )}
    </div>
  )
}
