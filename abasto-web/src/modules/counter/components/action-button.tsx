import type { ComponentProps } from 'react'

import { Button } from '#/components/ui/button'
import { cn } from '#/lib/utils/cn'

type ActionButtonProps = ComponentProps<typeof Button> & {
  tone?: 'primary' | 'secondary'
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
  variant,
  className,
  ...props
}: ActionButtonProps) {
  return (
    <Button
      variant={variant ?? (tone === 'primary' ? 'default' : 'outline')}
      className={cn(base, tones[tone], className)}
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
        'inline-flex items-center gap-[7px] text-sm font-[650] text-ink-link hover:underline',
        className,
      )}
      {...props}
    />
  )
}
