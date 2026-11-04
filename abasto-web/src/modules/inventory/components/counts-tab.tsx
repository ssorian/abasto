import {
  ArrowRightIcon,
  ChevronRightIcon,
  ClipboardCheckIcon,
  PlusIcon,
} from 'lucide-react'

import { ActionButton } from '#/modules/inventory/components/action-button'
import { SectionRow } from '#/modules/inventory/components/section-row'
import { dateLabel } from '#/modules/inventory/lib/format'

import type { Count, WarehouseScope } from '#/modules/inventory/types/inventory'

type CountsTabProps = {
  counts: ReadonlyArray<Count>
  warehouse: WarehouseScope
  onOpen: (count: Count | null) => void
}

const steps = ['Cuenta', 'Compara', 'Confirma']

export function CountsTab({ counts, warehouse, onOpen }: CountsTabProps) {
  const rows = counts.filter(
    (count) => warehouse === 'Todos' || count.warehouse === warehouse,
  )

  return (
    <>
      <SectionRow
        title="Del estante al sistema"
        description="Cuenta primero. Revisa las diferencias antes de ajustar."
        action={
          <ActionButton
            onClick={() => onOpen(null)}
            className="max-md:min-h-[38px] max-md:px-2.5 max-md:py-2 max-md:text-xs"
          >
            <PlusIcon size={17} />
            Nuevo conteo
          </ActionButton>
        }
      />
      {rows.length ? (
        <div className="grid gap-[13px]">
          {rows.map((count) => (
            <button
              key={count.id}
              type="button"
              onClick={() => onOpen(count)}
              className="flex items-center gap-[18px] rounded-[11px] border border-[#e0e6ee] bg-white px-[13px] py-[18px] text-left max-md:flex-wrap max-md:gap-[13px] md:px-[23px] md:py-5"
            >
              <div className="flex size-[42px] shrink-0 items-center justify-center rounded-[10px] bg-[#edf2f9] text-[#57799d]">
                <ClipboardCheckIcon />
              </div>
              <div>
                <strong className="text-sm">{count.id}</strong>
                <p className="mt-[5px] text-xs text-[#8a97a8]">
                  Almacén {count.warehouse} · {dateLabel(count.date)}
                </p>
              </div>
              <div className="md:ml-auto max-md:ml-[54px]">
                <strong className="text-sm">
                  {count.rows.length} productos
                </strong>
                <p className="mt-[5px] text-xs text-[#8a97a8]">
                  {
                    count.rows.filter(
                      (row) => row.system !== row.count && !row.applied,
                    ).length
                  }{' '}
                  diferencias pendientes
                </p>
              </div>
              <ChevronRightIcon size={19} className="max-md:ml-auto" />
            </button>
          ))}
        </div>
      ) : (
        <div className="rounded-[13px] border border-[#e0e6ee] bg-white px-[30px] py-[50px] text-center">
          <div className="mx-auto grid size-[76px] place-items-center rounded-[20px] bg-[#eff3fa] text-[#476d9a]">
            <ClipboardCheckIcon size={37} />
          </div>
          <h3 className="mt-[22px] text-[22px] font-[650] tracking-[-0.6px]">
            La tranquilidad de tener todo en orden.
          </h3>
          <p className="mt-3.5 text-sm leading-[1.8] text-[#8591a1]">
            Haz un conteo físico sin ver las cantidades del sistema.
            <br />
            Al terminar, podrás revisar y confirmar cada diferencia.
          </p>
          <div className="mt-7 flex items-center justify-center gap-5 text-[#93a1b3]">
            {steps.map((step, index) => (
              <div key={step} className="flex items-center gap-5">
                <span className="flex items-center gap-2 text-[13px] text-[#55708e]">
                  <b className="grid size-6 place-items-center rounded-full border border-[#c9d6e5] text-xs font-bold">
                    {index + 1}
                  </b>
                  {step}
                </span>
                {index < steps.length - 1 && <ChevronRightIcon size={16} />}
              </div>
            ))}
          </div>
          <ActionButton
            tone="primary"
            className="mt-7"
            onClick={() => onOpen(null)}
          >
            Comenzar un conteo <ArrowRightIcon size={17} />
          </ActionButton>
        </div>
      )}
    </>
  )
}
