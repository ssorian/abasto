import type { ComponentProps, ReactNode } from 'react'

import { Button } from '#/components/ui/button'
import { cn } from '#/lib/utils/cn'

const control =
  'min-h-[43px] w-full rounded-[8px] border border-[#e8e1e3] bg-white px-3 py-2.5 text-sm font-normal text-[#3b2251] focus:outline-2 focus:outline-offset-1 focus:outline-[#d8c0e9]'

export function Field({
  label,
  children,
}: {
  label: string
  children: ReactNode
}) {
  return (
    <label className="flex min-w-0 flex-col gap-[7px] text-[13px] font-medium text-[#513f45]">
      <span className="leading-normal">{label}</span>
      {children}
    </label>
  )
}

export function FieldSelect({ className, ...props }: ComponentProps<'select'>) {
  return <select className={cn(control, className)} {...props} />
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

type ImportButtonProps = ComponentProps<typeof Button> & {
  tone?: 'primary' | 'secondary'
}

/** Yellow primary or white secondary button of the reference. */
export function ImportButton({
  tone = 'secondary',
  className,
  ...props
}: ImportButtonProps) {
  return (
    <Button
      variant={tone === 'primary' ? 'default' : 'outline'}
      className={cn(
        'h-auto min-h-11 gap-[9px] rounded-[9px] px-[17px] py-2.5 text-sm font-[650] disabled:opacity-50',
        tone === 'primary'
          ? 'bg-primary text-brand-ink shadow-[0_2px_3px_#c81d4e0a] hover:bg-brand-hover'
          : 'border-[#e8e1e3] bg-white text-[#503f45] hover:bg-[#faf6f1]',
        className,
      )}
      {...props}
    />
  )
}

export function Note({
  className,
  children,
}: {
  className?: string
  children: ReactNode
}) {
  return (
    <p
      className={cn(
        'text-sm leading-[1.8] text-[#a49197] max-md:text-xs',
        className,
      )}
    >
      {children}
    </p>
  )
}

export function ErrorNote({ children }: { children: ReactNode }) {
  return (
    <p
      role="alert"
      className="rounded-[8px] border border-[#f0ccc5] bg-[#fff0ed] p-[13px] text-[13px] leading-[1.6] text-[#b26357]"
    >
      {children}
    </p>
  )
}
