import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import { Textarea } from '#/components/ui/textarea'
import { cn } from '#/lib/utils/cn'

import type { ComponentProps, ReactNode } from 'react'

const control =
  'min-h-[43px] rounded-lg font-normal border-[#dce4ed] bg-white px-3 py-2.5 text-sm text-[#223751] focus-visible:border-[#dce4ed] focus-visible:ring-0 focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-offset-1 focus-visible:outline-[#b3cef6] disabled:bg-[#f4f6f9] disabled:text-[#71839a] disabled:opacity-100 md:text-sm'

export function Field({
  label,
  children,
  className,
}: {
  label: string
  children: ReactNode
  className?: string
}) {
  return (
    <Label
      className={cn(
        'min-w-0 flex-col items-stretch gap-[7px] text-[13px] leading-normal font-medium text-[#32455e]',
        className,
      )}
    >
      <span>{label}</span>
      {children}
    </Label>
  )
}

export function TextInput({
  className,
  ...props
}: ComponentProps<typeof Input>) {
  return <Input className={cn('h-auto', control, className)} {...props} />
}

export function TextArea({
  className,
  ...props
}: ComponentProps<typeof Textarea>) {
  return (
    <Textarea
      className={cn(
        'min-h-[75px] resize-y field-sizing-fixed',
        control,
        'text-[#28352c]',
        className,
      )}
      {...props}
    />
  )
}

/** Native select: the reference dialogs use one, and it matches its geometry. */
export function SelectInput({ className, ...props }: ComponentProps<'select'>) {
  return (
    <select
      className={cn(
        'h-auto w-full min-w-0 rounded-lg border border-[#dce4ed] bg-white px-3 py-2.5 text-sm font-normal text-[#223751] outline-none focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-offset-1 focus-visible:outline-[#b3cef6] disabled:bg-[#f4f6f9] disabled:text-[#71839a]',
        'min-h-[43px]',
        className,
      )}
      {...props}
    />
  )
}
