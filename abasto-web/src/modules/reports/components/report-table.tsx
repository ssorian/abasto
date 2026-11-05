import type { ComponentProps } from 'react'

import { cn } from '#/lib/utils/cn'

/** Scrollable table shell; `bordered` adds the card frame used by the breakdowns. */
export function TableWrap({
  bordered = false,
  className,
  ...props
}: ComponentProps<'div'> & { bordered?: boolean }) {
  return (
    <div
      className={cn(
        'w-full overflow-x-auto',
        bordered && 'rounded-xl border border-[#f0eae3] bg-white',
        className,
      )}
      {...props}
    />
  )
}

export function DataTable({ className, ...props }: ComponentProps<'table'>) {
  return (
    <table
      className={cn('w-full border-collapse text-left text-[13px]', className)}
      {...props}
    />
  )
}

export function Th({ className, ...props }: ComponentProps<'th'>) {
  return (
    <th
      className={cn(
        'bg-[#fcfaf8] px-[11px] py-[13px] text-[11px] font-semibold tracking-[0.35px] whitespace-nowrap text-[#947f86] md:px-[14px] md:py-[15px]',
        className,
      )}
      {...props}
    />
  )
}

export function Td({ className, ...props }: ComponentProps<'td'>) {
  return (
    <td
      className={cn(
        'border-t border-[#f5f1ed] px-[11px] py-[13px] whitespace-nowrap first:min-w-[170px] first:whitespace-normal md:px-[14px] md:py-4',
        className,
      )}
      {...props}
    />
  )
}

/** Secondary line under a cell value. */
export function CellNote({ className, ...props }: ComponentProps<'small'>) {
  return (
    <small
      className={cn('mt-1 block text-[11px] text-[#958389]', className)}
      {...props}
    />
  )
}

/** Row that highlights on hover. */
export function Row({ className, ...props }: ComponentProps<'tr'>) {
  return <tr className={cn('hover:bg-[#fefdfb]', className)} {...props} />
}
