import {
  CalendarDaysIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from 'lucide-react'

import { cn } from '#/lib/utils/cn'
import {
  IconButton,
  TextLink,
} from '#/modules/reports/components/report-buttons'
import { Field, FieldSelect } from '#/modules/reports/components/report-fields'
import {
  ALL,
  periodOptions,
  salesChannels,
  unregistered,
} from '#/modules/reports/lib/constants'
import { rangeLabel } from '#/modules/reports/lib/period'
import { demoProducts } from '#/shared/demo/products'
import { warehouseNames } from '#/shared/demo/types'

import type { useSalesFilters } from '#/modules/reports/hooks/use-sales-filters'

type PeriodControlsProps = { filters: ReturnType<typeof useSalesFilters> }

/** Card with the period switch, date navigation, filters and the resulting range. */
export function PeriodControls({ filters }: PeriodControlsProps) {
  return (
    <div className="mb-[22px] rounded-[13px] border border-[#e1e8f0] bg-white p-[15px] md:px-[23px] md:py-5">
      <div className="flex flex-col items-stretch gap-3.5 border-b border-[#edf1f6] pb-[18px] md:flex-row md:items-center md:justify-between md:gap-[15px]">
        <div className="flex justify-between rounded-lg border border-[#dbe4ef] bg-[#f6f8fb] p-[3px]">
          {periodOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              aria-pressed={filters.period === option.value}
              onClick={() => filters.setPeriod(option.value)}
              className={cn(
                'flex-1 rounded-[5px] p-2 text-[13px] text-[#65758c] md:flex-none md:px-5 md:py-[9px]',
                filters.period === option.value && 'bg-[#123566] text-white',
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
        <div className="flex items-center justify-center gap-[7px] md:justify-start">
          <IconButton
            aria-label="Periodo anterior"
            onClick={() => filters.shift(-1)}
          >
            <ChevronLeftIcon size={18} />
          </IconButton>
          <input
            type="date"
            aria-label="Fecha del reporte"
            value={filters.reference}
            onChange={(event) => filters.setReference(event.target.value)}
            className="w-[140px] min-w-0 rounded-[7px] border border-[#dce5ee] bg-white px-2.5 py-2 text-xs text-[#314f74] md:w-auto md:text-[13px]"
          />
          <IconButton
            aria-label="Periodo siguiente"
            onClick={() => filters.shift(1)}
          >
            <ChevronRightIcon size={18} />
          </IconButton>
          <TextLink className="ml-1.5 text-xs" onClick={filters.goToToday}>
            Hoy
          </TextLink>
        </div>
      </div>

      <div className="my-[19px] grid grid-cols-1 gap-[13px] md:grid-cols-2 md:gap-4 metrics:grid-cols-4">
        <Field label="Almacén">
          <FieldSelect
            aria-label="Almacén del reporte"
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
            aria-label="Producto del reporte"
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
        <Field label="Canal de venta">
          <FieldSelect
            aria-label="Canal del reporte"
            value={filters.channel}
            onChange={(event) => filters.setChannel(event.target.value)}
          >
            <option>{ALL}</option>
            {salesChannels.map((channel) => (
              <option key={channel}>{channel}</option>
            ))}
            <option>{unregistered}</option>
          </FieldSelect>
        </Field>
      </div>

      <div className="flex flex-wrap items-center gap-[9px] text-xs text-[#38597e]">
        <CalendarDaysIcon size={15} />
        {rangeLabel(filters.range)}
        <span className="ml-auto text-[11px] text-[#8a97a8] max-[1101px]:ml-0 max-[1101px]:basis-full">
          Ciudad de México · Semana de lunes a domingo
        </span>
      </div>
    </div>
  )
}
