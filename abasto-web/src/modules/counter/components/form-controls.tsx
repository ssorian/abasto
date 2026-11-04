import type { ComponentProps, ReactNode } from 'react'

import { cn } from '#/lib/utils/cn'

const fieldControl =
  'min-h-[43px] w-full rounded-lg border border-[#dce4ed] bg-white px-3 py-2.5 text-sm font-normal text-[#223751] focus:outline-2 focus:outline-offset-1 focus:outline-[#b3cef6] disabled:bg-[#f2f5f8] disabled:text-[#7c8999]'

/** The reference hides native number spinners everywhere. */
export const hideSpinners =
  '[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none'

/** Compact controls used inside tables and filter bars. */
export const compactControl =
  'min-w-0 rounded-lg border border-[#dee4dc] bg-white px-3 py-2.5 text-[13px] text-[#37473c]'

type FieldProps = {
  label: string
  hint?: string
  children: ReactNode
}

/** Label above a control, with an optional hint underneath. */
export function Field({ label, hint, children }: FieldProps) {
  return (
    <label className="flex min-w-0 flex-col gap-[7px] text-[13px] font-medium text-[#32455e]">
      <span className="leading-normal">{label}</span>
      {children}
      {hint && (
        <small className="text-[11px] font-normal text-[#8290a2]">{hint}</small>
      )}
    </label>
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

export function CompactSelect({
  className,
  ...props
}: ComponentProps<'select'>) {
  return <select className={cn(compactControl, className)} {...props} />
}

export function CompactInput({ className, ...props }: ComponentProps<'input'>) {
  return <input className={cn(compactControl, className)} {...props} />
}

/** Checkbox with an inline label (accent-colored like the reference). */
export function CheckboxField({
  checked,
  onChange,
  children,
}: {
  checked: boolean
  onChange: (checked: boolean) => void
  children: ReactNode
}) {
  return (
    <label className="flex cursor-pointer items-center gap-[9px] text-[13px] leading-[1.6] text-[#3b4f41]">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="size-[17px] flex-none accent-[#326447]"
      />
      {children}
    </label>
  )
}
