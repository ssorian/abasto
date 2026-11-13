import type { ReactNode } from 'react'

import { XIcon } from 'lucide-react'

import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '#/components/ui/dialog'
import { cn } from '#/lib/utils/cn'

type CounterDialogProps = {
  title: string
  description: string
  onClose: () => void
  wide?: boolean
  /** Takes almost the whole viewport (implies wide gutters). */
  full?: boolean
  children: ReactNode
}

/** Always-open dialog; the parent mounts it only while it should be visible. */
export function CounterDialog({
  title,
  description,
  onClose,
  wide = false,
  full = false,
  children,
}: CounterDialogProps) {
  wide ||= full
  const gutter = wide ? 'px-5 md:px-[29px]' : 'px-[23px] md:px-[29px]'
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        showCloseButton={false}
        className={cn(
          // The content never scrolls: the header and the close button stay put while the body scrolls.
          'flex max-h-[92dvh] flex-col gap-0 overflow-hidden rounded-2xl border border-transparent bg-white p-0 text-base max-md:[&_[data-section-help]]:text-xs sm:max-w-[calc(100vw-24px)]',
          full
            ? 'h-[calc(100dvh-20px)] max-h-[calc(100dvh-20px)] w-[calc(100vw-20px)] max-w-[calc(100vw-20px)] md:h-[calc(100dvh-32px)] md:max-h-[calc(100dvh-32px)] md:w-[calc(100vw-32px)] md:max-w-[1600px]'
            : wide
              ? 'w-[calc(100vw-20px)] max-w-[calc(100vw-20px)] md:w-[min(1080px,calc(100vw-32px))] md:max-w-[1080px]'
              : 'max-w-[calc(100vw-24px)] md:max-w-[530px]',
        )}
      >
        <DialogHeader
          className={cn(
            'shrink-0 pt-[23px] text-left md:pt-[29px]',
            gutter,
            'pr-14 md:pr-14',
          )}
        >
          <DialogTitle className="text-[23px] leading-[1.3] md:text-[25px] font-semibold tracking-[-0.7px]">
            {title}
          </DialogTitle>
          <DialogDescription className="text-[13px] leading-[1.7] text-[#9d8c92]">
            {description}
          </DialogDescription>
        </DialogHeader>
        <div
          className={cn(
            'grid min-h-0 flex-1 gap-[18px] overflow-y-auto pt-[18px] pb-[23px] [scrollbar-width:thin] md:gap-5 md:pt-5 md:pb-[29px]',
            // A full dialog gives its third child (the table) the spare height.
            full
              ? 'grid-rows-[auto_auto_minmax(14rem,1fr)_auto]'
              : 'content-start',
            gutter,
          )}
        >
          {children}
        </div>
        <DialogClose className="absolute top-4 right-4 rounded-xs opacity-70 transition-opacity hover:opacity-100 focus:outline-2 focus:outline-offset-2">
          <XIcon className="size-4" />
          <span className="sr-only">Cerrar</span>
        </DialogClose>
      </DialogContent>
    </Dialog>
  )
}
