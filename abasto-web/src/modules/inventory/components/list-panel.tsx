import type { ComponentProps } from 'react'

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '#/components/ui/table'
import { cn } from '#/lib/utils/cn'

/** White bordered card hosting a list table (`.list-panel`). */
export function ListPanel({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      className={cn(
        'overflow-hidden rounded-[12px] border border-[#e0e6ee] bg-white',
        className,
      )}
      {...props}
    />
  )
}

export function ListHead({ children }: { children: Array<string> }) {
  return (
    <TableHeader>
      <TableRow>
        {children.map((label, index) => (
          <TableHead
            key={`${label}-${index}`}
            className="h-auto bg-[#f7f9fc] p-[15px] text-xs font-[550] text-[#77879b] md:px-5 md:py-[14px]"
          >
            {label}
          </TableHead>
        ))}
      </TableRow>
    </TableHeader>
  )
}

export function ListCell({
  className,
  ...props
}: ComponentProps<typeof TableCell>) {
  return (
    <TableCell
      className={cn(
        'p-[15px] text-sm leading-5 text-[#526984] md:px-5 md:py-[18px] [&_small]:mt-[5px] [&_small]:text-xs [&_small]:leading-[1.4] [&_button]:leading-5 [&_strong]:font-semibold',
        className,
      )}
      {...props}
    />
  )
}

export { Table as ListTable, TableBody as ListBody, TableRow as ListRow }
