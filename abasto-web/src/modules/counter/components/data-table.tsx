import type { ComponentProps } from 'react'

import { cn } from '#/lib/utils/cn'

/** Scrollable table shell used by the cart, shift movements and price breakdowns. */
export function TableWrap({ className, ...props }: ComponentProps<'div'>) {
  return <div className={cn('w-full overflow-x-auto', className)} {...props} />
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
