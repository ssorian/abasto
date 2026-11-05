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

type InventoryDialogProps = {
  title: string
  description: ReactNode
  /** Small uppercase line above the title. */
  eyebrow?: string
  onClose: () => void
  size?: 'standard' | 'count' | 'wide'
  children: ReactNode
}

const sizes = {
  standard: 'max-w-[calc(100vw-24px)] md:max-w-[530px]',
  count:
    'max-w-[calc(100vw-20px)] px-[19px] py-[23px] md:max-w-[800px] md:p-[29px]',
  wide: 'w-[calc(100vw-20px)] max-w-[calc(100vw-20px)] p-5 md:w-[min(1080px,calc(100vw-32px))] md:max-w-[1080px] md:p-[29px]',
}

/** Always-open dialog; the parent mounts it only while it should be visible. */
export function InventoryDialog({
  title,
  description,
  eyebrow,
  onClose,
  size = 'standard',
  children,
}: InventoryDialogProps) {
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        showCloseButton={false}
        className={cn(
          'max-h-[92dvh] gap-[18px] overflow-y-auto rounded-2xl border border-transparent bg-white p-[23px] text-base sm:max-w-[calc(100vw-24px)] md:gap-5 md:p-[29px]',
          sizes[size],
        )}
      >
        <DialogHeader className="text-left">
          {eyebrow && (
            <span className="text-xs font-bold tracking-[1.5px] text-ink-eyebrow">
              {eyebrow}
            </span>
          )}
          <DialogTitle className="text-[23px] leading-[1.3] font-semibold tracking-[-0.7px] md:text-[25px]">
            {title}
          </DialogTitle>
          <DialogDescription className="text-[13px] leading-[1.7] text-[#9d8c92] md:text-sm">
            {description}
          </DialogDescription>
        </DialogHeader>
        {children}
        <DialogClose className="absolute top-4 right-4 rounded-xs opacity-70 transition-opacity hover:opacity-100 focus:outline-2 focus:outline-offset-2">
          <XIcon className="size-4" />
          <span className="sr-only">Cerrar</span>
        </DialogClose>
      </DialogContent>
    </Dialog>
  )
}

/** Footer row with a top rule (`.dialog-actions`). */
export function DialogActions({
  className,
  children,
}: {
  className?: string
  children: ReactNode
}) {
  return (
    <div
      className={cn(
        'mt-[5px] flex items-center justify-between gap-3 border-t border-[#f4eee8] pt-5 max-md:flex-wrap',
        className,
      )}
    >
      {children}
    </div>
  )
}
