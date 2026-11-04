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
  children: ReactNode
}

/** Always-open dialog; the parent mounts it only while it should be visible. */
export function CounterDialog({
  title,
  description,
  onClose,
  wide = false,
  children,
}: CounterDialogProps) {
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        showCloseButton={false}
        className={cn(
          'max-h-[92dvh] gap-[18px] overflow-y-auto rounded-2xl border border-transparent bg-white p-[23px] text-base max-md:[&_[data-section-help]]:text-xs sm:max-w-[calc(100vw-24px)] md:gap-5 md:p-[29px]',
          wide
            ? 'w-[calc(100vw-20px)] max-w-[calc(100vw-20px)] p-5 md:w-[min(1080px,calc(100vw-32px))] md:max-w-[1080px]'
            : 'max-w-[calc(100vw-24px)] md:max-w-[530px]',
        )}
      >
        <DialogHeader className="text-left">
          <DialogTitle className="text-[23px] leading-[1.3] md:text-[25px] font-semibold tracking-[-0.7px]">
            {title}
          </DialogTitle>
          <DialogDescription className="text-[13px] leading-[1.7] text-[#8692a3]">
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
