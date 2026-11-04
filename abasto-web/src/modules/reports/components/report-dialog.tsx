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

type ReportDialogProps = {
  title: string
  description: string
  onClose: () => void
  children: ReactNode
}

/** Always-open dialog; the parent mounts it only while it should be visible. */
export function ReportDialog({
  title,
  description,
  onClose,
  children,
}: ReportDialogProps) {
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        showCloseButton={false}
        className="max-h-[92dvh] max-w-[calc(100vw-24px)] gap-[18px] overflow-y-auto rounded-2xl border border-transparent bg-white p-[23px] text-base sm:max-w-[calc(100vw-24px)] md:max-w-[530px] md:gap-5 md:p-[29px]"
      >
        <DialogHeader className="text-left">
          <DialogTitle className="text-[23px] leading-[1.3] font-semibold tracking-[-0.7px] md:text-[25px]">
            {title}
          </DialogTitle>
          <DialogDescription className="text-[13px] leading-[1.7] text-[#8692a3] md:text-sm">
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
