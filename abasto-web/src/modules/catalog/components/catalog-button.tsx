import { Button } from '#/components/ui/button'
import { cn } from '#/lib/utils/cn'

import type { ComponentProps } from 'react'

type CatalogButtonProps = Omit<ComponentProps<typeof Button>, 'variant'> & {
  tone?: 'primary' | 'secondary'
}

const tones = {
  primary:
    'bg-primary text-brand-ink shadow-[0_2px_3px_#8e67120a] hover:bg-brand-hover hover:shadow-[0_3px_9px_#8e67121c]',
  secondary: 'border-[#dce3ed] bg-white text-[#31465e] hover:bg-[#f1f5fa]',
}

/** Console button: 44px tall, 9px radius, bold 14px label. */
export function CatalogButton({
  tone = 'secondary',
  className,
  ...props
}: CatalogButtonProps) {
  return (
    <Button
      variant="ghost"
      className={cn(
        'h-auto min-h-[44px] gap-[9px] rounded-[9px] px-[17px] py-2.5 text-sm font-[650] disabled:opacity-45',
        tones[tone],
        className,
      )}
      {...props}
    />
  )
}
