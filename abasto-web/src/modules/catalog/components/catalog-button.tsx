import { Button } from '#/components/ui/button'
import { cn } from '#/lib/utils/cn'

import type { ComponentProps } from 'react'

type CatalogButtonProps = Omit<ComponentProps<typeof Button>, 'variant'> & {
  tone?: 'primary' | 'secondary'
}

const tones = {
  primary:
    'bg-primary text-brand-ink shadow-[0_2px_3px_#c81d4e0a] hover:bg-brand-hover hover:shadow-[0_3px_9px_#c81d4e1c]',
  secondary: 'border-[#e8e1e3] bg-white text-[#503f45] hover:bg-[#faf6f1]',
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
