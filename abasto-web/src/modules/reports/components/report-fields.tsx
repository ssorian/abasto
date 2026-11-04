import type { ComponentProps, ReactNode } from 'react'

import { cn } from '#/lib/utils/cn'

const control =
  'min-h-[43px] w-full rounded-lg border border-[#dce4ed] bg-white px-3 py-2.5 text-sm font-normal text-[#223751] focus:outline-2 focus:outline-offset-1 focus:outline-[#b3cef6]'

/** Label above a control. */
export function Field({
  label,
  className,
  children,
}: {
  label: string
  className?: string
  children: ReactNode
}) {
  return (
    <label
      className={cn(
        'flex min-w-0 flex-col gap-[7px] text-[13px] font-medium text-[#32455e]',
        className,
      )}
    >
      <span className="leading-normal">{label}</span>
      {children}
    </label>
  )
}

export function FieldSelect({ className, ...props }: ComponentProps<'select'>) {
  return <select className={cn(control, className)} {...props} />
}

export function FieldInput({ className, ...props }: ComponentProps<'input'>) {
  return <input className={cn(control, className)} {...props} />
}

export function FieldTextarea({
  className,
  ...props
}: ComponentProps<'textarea'>) {
  return (
    <textarea
      className={cn(control, 'min-h-[75px] resize-y', className)}
      {...props}
    />
  )
}
