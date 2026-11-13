import { useState } from 'react'
import type { ReactNode } from 'react'

import { Maximize2Icon, Minimize2Icon, XIcon } from 'lucide-react'

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
  size?: 'standard' | 'count' | 'wide' | 'wider'
  /** Pinned under the scrolling body, so totals and buttons stay visible. */
  footer?: ReactNode
  children: ReactNode
}

const sizes = {
  standard: 'max-w-[calc(100vw-24px)] md:max-w-[530px]',
  count: 'max-w-[calc(100vw-20px)] md:max-w-[800px]',
  wide: 'w-[calc(100vw-20px)] max-w-[calc(100vw-20px)] md:w-[min(1080px,calc(100vw-32px))] md:max-w-[1080px]',
  wider:
    'w-[calc(100vw-20px)] max-w-[calc(100vw-20px)] md:w-[min(1320px,calc(100vw-32px))] md:max-w-[1320px]',
}

/** Horizontal padding shared by the fixed header and the scrolling body. */
const gutters = {
  standard: 'px-[23px] md:px-[29px]',
  count: 'px-[19px] md:px-[29px]',
  wide: 'px-5 md:px-[29px]',
  wider: 'px-5 md:px-[29px]',
}

/** Full screen: wins over every size; inner lists drop their height cap via `group-data-maximized/dialog`. */
const maximizedClass =
  'h-dvh max-h-dvh w-screen max-w-none rounded-none sm:max-w-none md:w-screen md:max-w-none'

const cornerButton =
  'rounded-xs opacity-70 transition-opacity hover:opacity-100 focus:outline-2 focus:outline-offset-2'

/** Always-open dialog; the parent mounts it only while it should be visible. */
export function InventoryDialog({
  title,
  description,
  eyebrow,
  onClose,
  size = 'standard',
  footer,
  children,
}: InventoryDialogProps) {
  // Only wide dialogs hold long tables, so only they can fill the screen.
  const canMaximize = size === 'wide' || size === 'wider'
  const [maximized, setMaximized] = useState(false)
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        showCloseButton={false}
        data-maximized={maximized || undefined}
        className={cn(
          // The content never scrolls: the header and its corner buttons stay put while the body scrolls.
          'group/dialog flex max-h-[92dvh] flex-col gap-0 overflow-hidden rounded-2xl border border-transparent bg-white p-0 text-base sm:max-w-[calc(100vw-24px)]',
          sizes[size],
          maximized && maximizedClass,
        )}
      >
        <DialogHeader
          className={cn(
            'shrink-0 pt-[23px] text-left md:pt-[29px]',
            gutters[size],
            // Room for the corner buttons, after the gutters so it wins.
            'pr-20 md:pr-20',
          )}
        >
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
        <div
          className={cn(
            'grid min-h-0 flex-1 content-start gap-[18px] overflow-y-auto pt-[18px] [scrollbar-width:thin] md:gap-5 md:pt-5',
            footer ? 'pb-4' : 'pb-[23px] md:pb-[29px]',
            gutters[size],
          )}
        >
          {children}
        </div>
        {footer && (
          <div
            className={cn(
              'grid shrink-0 gap-3 border-t border-[#f4eee8] bg-white py-4',
              gutters[size],
            )}
          >
            {footer}
          </div>
        )}
        <span className="absolute top-4 right-4 flex items-center gap-3">
          {canMaximize && (
            <button
              type="button"
              className={cornerButton}
              aria-pressed={maximized}
              title={maximized ? 'Restaurar tamaño' : 'Pantalla completa'}
              onClick={() => setMaximized((current) => !current)}
            >
              {maximized ? (
                <Minimize2Icon className="size-4" />
              ) : (
                <Maximize2Icon className="size-4" />
              )}
              <span className="sr-only">
                {maximized ? 'Restaurar tamaño' : 'Pantalla completa'}
              </span>
            </button>
          )}
          <DialogClose className={cornerButton}>
            <XIcon className="size-4" />
            <span className="sr-only">Cerrar</span>
          </DialogClose>
        </span>
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
