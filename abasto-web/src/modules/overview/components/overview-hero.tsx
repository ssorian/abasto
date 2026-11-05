import { Link } from '@tanstack/react-router'
import { ArrowRight, House } from 'lucide-react'

import { buttonVariants } from '#/components/ui/button'
import { cn } from '#/lib/utils/cn'

export function OverviewHero({ today }: { today: string }) {
  return (
    <div className="flex items-start justify-between gap-4 overflow-hidden rounded-2xl border border-[#e8dcf0] bg-hero p-[23px] md:items-center md:gap-7 md:px-[34px] md:py-[30px]">
      <div>
        <span className="text-[8px] leading-normal font-bold tracking-[0.8px] text-hero-eyebrow md:text-[10px] md:tracking-[1.6px]">
          OPERACIÓN DEL DÍA · {today}
        </span>
        <h2 className="my-2.5 text-2xl leading-[1.3] font-[650] tracking-[-1px] text-hero-title md:text-[30px]">
          Lo que necesita atención hoy.
        </h2>
        <p className="mb-5 text-[13px] leading-[1.7] text-hero-copy">
          Ventas, dinero e inventario del almacén, con sus pendientes a la
          vista.
        </p>
        <Link
          to="/mostrador"
          className={cn(
            buttonVariants(),
            'h-auto min-h-11 gap-[9px] rounded-[9px] px-[17px] py-2.5 text-sm font-[650] text-brand-ink shadow-[0_2px_3px_#c81d4e1f] hover:bg-brand-hover hover:shadow-[0_3px_9px_#c81d4e33]',
          )}
        >
          Ir a mostrador
          <ArrowRight className="size-[17px]" />
        </Link>
      </div>
      <House size={74} className="shrink-0 text-primary/80" aria-hidden />
    </div>
  )
}
