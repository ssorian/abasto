import { XIcon } from 'lucide-react'
import { Dialog as DialogPrimitive } from 'radix-ui'

import {
  Dialog,
  DialogClose,
  DialogDescription,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
} from '#/components/ui/dialog'
import { cn } from '#/lib/utils/cn'

import type { ReactNode } from 'react'

type CatalogModalProps = {
  title: string
  description: string
  onClose: () => void
  /** `editor` (650px) for the product form, `wide` (1080px) for presentations. */
  size?: 'default' | 'editor' | 'wide'
  children: ReactNode
}

/** Dialog shell shared by the product form, presentations editor and reason dialog. */
export function CatalogModal({
  title,
  description,
  onClose,
  size = 'default',
  children,
}: CatalogModalProps) {
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogPortal>
        <DialogOverlay className="bg-[#30114b66] supports-backdrop-filter:backdrop-blur-[3px]" />
        <DialogPrimitive.Content
          data-slot="dialog-content"
          className={cn(
            'fixed top-1/2 left-1/2 z-50 grid -translate-x-1/2 -translate-y-1/2 outline-none data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95 max-h-[92dvh] grid-cols-1 overflow-y-auto rounded-2xl border bg-white text-base shadow-lg ring-0',
            size === 'wide'
              ? 'w-[calc(100vw-20px)] max-w-[1080px] gap-[18px] p-5 sm:max-w-[1080px] md:w-[min(1080px,calc(100vw-32px))] md:gap-5 md:p-[29px]'
              : cn(
                  'gap-[18px] p-[23px] md:gap-5 md:p-[29px]',
                  size === 'editor'
                    ? 'w-full max-w-[650px] sm:max-w-[650px]'
                    : 'w-[calc(100vw-24px)] max-w-[calc(100vw-24px)] sm:max-w-[530px]',
                ),
          )}
        >
          <DialogHeader className="gap-2 text-left">
            <DialogTitle className="text-[23px] leading-[1.3] font-semibold tracking-[-0.7px] md:text-[25px]">
              {title}
            </DialogTitle>
            <DialogDescription className="text-[13px] leading-[1.7] text-[#9d8c92] md:text-sm">
              {description}
            </DialogDescription>
          </DialogHeader>
          {children}
          <DialogClose className="absolute top-4 right-4 rounded-xs opacity-70 transition-opacity hover:opacity-100 focus-visible:ring-2 focus-visible:ring-ring [&_svg]:size-4">
            <XIcon />
            <span className="sr-only">Cerrar</span>
          </DialogClose>
        </DialogPrimitive.Content>
      </DialogPortal>
    </Dialog>
  )
}
