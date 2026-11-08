import { CalendarDaysIcon } from 'lucide-react'

import { cn } from '#/lib/utils/cn'
import type { ExecutiveSearch } from '#/modules/executive/lib/search'
import { Field, FieldInput } from '#/modules/reports/components/report-fields'
import { rangeLabel } from '#/modules/reports/lib/period'
import { defaultPreset } from '#/modules/reports/lib/search'
import type { DateRange, PeriodPreset } from '#/modules/reports/types/reports'

const presets: Array<{ value: PeriodPreset; label: string }> = [
  { value: 'today', label: 'Hoy' },
  { value: '7', label: '7 días' },
  { value: '30', label: '30 días' },
  { value: 'custom', label: 'Personalizado' },
]

type PeriodFiltersProps = {
  search: ExecutiveSearch
  range?: DateRange
  /** Period of equal length right before `range`, the comparison base. */
  previousRange?: DateRange
  onChange: (patch: Partial<ExecutiveSearch>) => void
}

/** Period presets and custom dates, kept in the URL like the reports page. */
export function OwnerPeriodFilters({
  search,
  range,
  previousRange,
  onChange,
}: PeriodFiltersProps) {
  const preset = search.periodo ?? defaultPreset
  return (
    <div className="mb-[22px] rounded-[13px] border border-[#f0e9e1] bg-white p-[15px] md:px-[23px] md:py-5">
      <div className="flex flex-col gap-3.5 md:flex-row md:items-center md:justify-between">
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
            {rangeLabel(range)}
            {previousRange && (
              <em className="not-italic text-muted-foreground">
                {' '}
                · comparado con {rangeLabel(previousRange)}
              </em>
            )}{' '}
            · Ciudad de México
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
