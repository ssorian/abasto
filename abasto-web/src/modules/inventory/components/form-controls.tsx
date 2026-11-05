import type { ComponentProps, ReactNode } from 'react'

import { cn } from '#/lib/utils/cn'

export const fieldControl =
  'min-h-[43px] w-full rounded-[8px] border border-[#e8e1e3] bg-white px-3 py-2.5 text-sm font-normal text-[#3b2251] focus:outline-2 focus:outline-offset-1 focus:outline-[#d8c0e9] disabled:bg-[#f8f5f2] disabled:text-[#938288]'

/** The reference hides native number spinners everywhere. */
export const hideSpinners =
  '[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none'

type FieldProps = { label: string; hint?: string; children: ReactNode }

/** Label above a control, with an optional hint underneath. */
export function Field({ label, hint, children }: FieldProps) {
  return (
    <label className="flex min-w-0 flex-col gap-[7px] text-[13px] font-medium text-[#513f45]">
      <span className="leading-normal">{label}</span>
      {children}
      {hint && (
        <small className="text-[11px] font-normal text-[#9c888f]">{hint}</small>
      )}
    </label>
  )
}

/** `div` flavour of `Field` for controls that bring their own label (pickers). */
export function FieldGroup({ label, children }: Omit<FieldProps, 'hint'>) {
  return (
    <div className="flex min-w-0 flex-col gap-2">
      <span className="text-sm font-[550] text-[#866d75]">{label}</span>
      {children}
    </div>
  )
}

export function FieldInput({ className, ...props }: ComponentProps<'input'>) {
  return (
    <input
      className={cn(
        fieldControl,
        props.type === 'number' && hideSpinners,
        className,
      )}
      {...props}
    />
  )
}

export function FieldSelect({ className, ...props }: ComponentProps<'select'>) {
  return <select className={cn(fieldControl, className)} {...props} />
}

export function FieldTextarea({
  className,
  ...props
}: ComponentProps<'textarea'>) {
  return (
    <textarea
      className={cn(fieldControl, 'min-h-[75px] resize-y', className)}
      {...props}
    />
  )
}

/** Grid used by the receipt and import forms (3 columns on desktop). */
export function FormGrid({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div className={cn('grid gap-4 md:grid-cols-3', className)} {...props} />
  )
}
