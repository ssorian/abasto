import { cva } from 'class-variance-authority'
import type { VariantProps } from 'class-variance-authority'
import type { ReactNode } from 'react'

import { cn } from '#/lib/utils/cn'

const statusBadgeVariants = cva(
  'inline-flex items-center gap-[5px] whitespace-nowrap rounded-[5px] px-[7px] py-1 text-xs leading-[1.3] font-semibold',
  {
    variants: {
      tone: {
        green: 'bg-status-green-bg text-status-green',
        amber: 'bg-status-amber-bg text-status-amber',
        red: 'bg-status-red-bg text-status-red',
        blue: 'bg-status-blue-bg text-status-blue',
        gray: 'bg-status-gray-bg text-status-gray',
      },
    },
    defaultVariants: { tone: 'gray' },
  },
)

export type StatusTone = NonNullable<
  VariantProps<typeof statusBadgeVariants>['tone']
>

type StatusBadgeProps = {
  tone?: StatusTone
  className?: string
  children: ReactNode
}

export function StatusBadge({ tone, className, children }: StatusBadgeProps) {
  return (
    <span className={cn(statusBadgeVariants({ tone }), className)}>
      {children}
    </span>
  )
}
