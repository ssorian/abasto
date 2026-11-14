import { ChevronDownIcon } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

import { ActionButton } from '#/modules/reports/components/report-buttons'
import type { PdfChoice } from '#/modules/reports/lib/pdf-choices'

type DownloadMenuProps = {
  choices: Array<PdfChoice>
  /** Builds and saves the report; rejects with a message to show. */
  onPdf: (choice: PdfChoice) => Promise<void>
  /** Absent when the period on screen has no sales to export. */
  onCsv?: () => void
}

const item =
  'flex min-h-10 w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left text-sm text-ink-row hover:bg-muted focus-visible:bg-muted focus-visible:outline-2 focus-visible:outline-ring disabled:opacity-50'

/** "Descargar PDF": the day, week and month reports, and the sales CSV. */
export function DownloadMenu({ choices, onPdf, onCsv }: DownloadMenuProps) {
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const root = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onPointer = ({ target }: PointerEvent) => {
      if (!root.current?.contains(target as Node)) setOpen(false)
    }
    const onKey = ({ key }: KeyboardEvent) => {
      if (key === 'Escape') setOpen(false)
    }
    document.addEventListener('pointerdown', onPointer)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onPointer)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const download = async (choice: PdfChoice) => {
    setBusy(choice.id)
    setError(null)
    try {
      await onPdf(choice)
      setOpen(false)
    } catch (cause) {
      setError(
        cause instanceof Error && cause.message
          ? cause.message
          : 'No se pudo generar el reporte. Intenta de nuevo.',
      )
    } finally {
      setBusy(null)
    }
  }

  return (
    <div ref={root} className="relative">
      <ActionButton
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls="reportes-descargas"
        onClick={() => setOpen((value) => !value)}
      >
        Descargar PDF
        <ChevronDownIcon size={16} aria-hidden />
      </ActionButton>
      {open && (
        <ul
          id="reportes-descargas"
          role="menu"
          aria-label="Descargar reporte"
          className="absolute top-[calc(100%+6px)] right-0 z-20 w-[280px] rounded-xl border border-border bg-white p-1.5 shadow-[0_8px_24px_#2a1c3622] max-[640px]:right-auto max-[640px]:left-0"
        >
          {choices.map((choice, index) => (
            <li
              key={choice.id}
              role="none"
              className={
                index === 3 ? 'mt-1.5 border-t border-border pt-1.5' : undefined
              }
            >
              <button
                type="button"
                role="menuitem"
                className={item}
                disabled={busy !== null}
                onClick={() => void download(choice)}
              >
                {choice.label}
                <small className="text-xs text-muted-foreground">
                  {busy === choice.id ? 'Generando…' : choice.hint}
                </small>
              </button>
            </li>
          ))}
          {onCsv && (
            <li role="none" className="mt-1.5 border-t border-border pt-1.5">
              <button
                type="button"
                role="menuitem"
                className={item}
                onClick={() => {
                  onCsv()
                  setOpen(false)
                }}
              >
                Exportar ventas CSV
              </button>
            </li>
          )}
          {error && (
            <li role="alert" className="px-3 py-2 text-xs text-destructive">
              {error}
            </li>
          )}
        </ul>
      )}
    </div>
  )
}
