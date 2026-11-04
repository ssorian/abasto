import type { ComponentProps } from 'react'

import { Button } from '#/components/ui/button'
import { cn } from '#/lib/utils/cn'

type ActionButtonProps = ComponentProps<typeof Button> & {
  tone?: 'primary' | 'secondary'
  full?: boolean
}

const base =
  'h-auto min-h-11 gap-[9px] rounded-[9px] px-[17px] py-2.5 text-sm font-[650] disabled:opacity-50'

const tones = {
  primary:
    'bg-primary text-brand-ink shadow-[0_2px_3px_#8e67120a] hover:bg-brand-hover hover:shadow-[0_3px_9px_#8e67121c]',
  secondary: 'border-[#dce3ed] bg-white text-[#31465e] hover:bg-[#f1f5fa]',
}

/** Reference-style `.btn` (yellow primary, white secondary). */
export function ActionButton({
  tone = 'secondary',
  full = false,
  variant,
  className,
  ...props
}: ActionButtonProps) {
  return (
    <Button
      variant={variant ?? (tone === 'primary' ? 'default' : 'outline')}
      className={cn(base, tones[tone], full && 'w-full', className)}
      {...props}
    />
  )
}

/** Inline link-style button (`.text-link`). */
export function TextLink({ className, ...props }: ComponentProps<'button'>) {
  return (
    <button
      type="button"
      className={cn(
        'inline-flex items-center gap-[7px] text-left text-sm font-[650] text-ink-link hover:underline',
        className,
      )}
      {...props}
    />
  )
}

/** Square ghost button for row actions (`.icon-button`). */
export function IconButton({ className, ...props }: ComponentProps<'button'>) {
  return (
    <button
      type="button"
      className={cn(
        'inline-flex size-9 items-center justify-center rounded-[7px] text-[#64758a] hover:bg-[#e9eff6]',
        className,
      )}
      {...props}
    />
  )
}
