import { PackageIcon } from 'lucide-react'
import { useState } from 'react'

import { cn } from '#/lib/utils/cn'

type ProductImageProps = {
  /** Photo URL; null (or a URL that fails to load) shows the placeholder. */
  src: string | null
  name: string
  className?: string
}

/**
 * Product photo that never shows as broken: when the URL cannot be loaded the
 * placeholder icon takes its place. The failure is remembered per URL, so a
 * corrected URL gets a fresh try.
 */
export function ProductImage({ src, name, className }: ProductImageProps) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null)
  if (src && failedUrl !== src) {
    return (
      <img
        ref={(img) => {
          // The server-rendered image can fail before React attaches onError.
          if (img?.complete && img.naturalWidth === 0) setFailedUrl(src)
        }}
        src={src}
        alt={name}
        loading="lazy"
        decoding="async"
        referrerPolicy="no-referrer"
        onError={() => setFailedUrl(src)}
        className={className}
      />
    )
  }
  return (
    <PackageIcon
      aria-label={name}
      strokeWidth={1}
      className={cn('m-auto h-[95px] w-[75px] text-[#b29da4]')}
    />
  )
}
