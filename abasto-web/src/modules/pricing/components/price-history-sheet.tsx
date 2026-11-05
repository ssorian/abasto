import { useEffect, useState } from 'react'

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '#/components/ui/sheet'
import { ClientError, genericErrorMessage, unwrap } from '#/lib/boundary'
import { formatCents } from '#/modules/pricing/lib/money'
import { priceHistoryFn } from '#/modules/pricing/server/pricing'
import type { getPriceHistory } from '#/modules/pricing/services/price-reads'

type Entry = Awaited<ReturnType<typeof getPriceHistory>>[number]

const sourceLabels: Record<string, string> = {
  manual: 'Manual',
  bulk: 'Cambio masivo',
  'purchase-suggestion': 'Sugerencia de compra',
}

type PriceHistorySheetProps = {
  target: { warehouseId: string; presentationId: string; title: string }
  onClose: () => void
}

export function PriceHistorySheet({ target, onClose }: PriceHistorySheetProps) {
  const [entries, setEntries] = useState<Array<Entry>>()
  const [error, setError] = useState<string>()

  useEffect(() => {
    let current = true
    priceHistoryFn({ data: target })
      .then((result) => current && setEntries(unwrap(result)))
      .catch((failure: unknown) => {
        if (current) {
          setError(
            failure instanceof ClientError
              ? failure.message
              : genericErrorMessage,
          )
        }
      })
    return () => {
      current = false
    }
  }, [target])

  return (
    <Sheet open onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Historial de precios</SheetTitle>
          <SheetDescription>{target.title}</SheetDescription>
        </SheetHeader>
        <div className="px-4 pb-4">
          {error ? (
            <p className="text-sm text-[#b42318]">{error}</p>
          ) : !entries ? (
            <p className="text-sm text-[#6d7d90]">Cargando…</p>
          ) : !entries.length ? (
            <p className="text-sm text-[#6d7d90]">
              Aún no hay precios propios en este almacén.
            </p>
          ) : (
            <ul className="divide-y divide-[#edf0f4]">
              {entries.map((entry) => (
                <li key={entry.id} className="py-3 text-sm">
                  <strong className="text-[#223751]">
                    {formatCents(entry.priceCents)}
                  </strong>
                  <span className="ml-2 text-xs text-[#6d7d90]">
                    {sourceLabels[entry.source] ?? entry.source}
                  </span>
                  <time className="block text-xs text-[#8a97a8]">
                    {new Date(entry.effectiveFrom).toLocaleString('es-MX')}
                  </time>
                  {entry.reason && (
                    <span className="block text-xs text-[#6d7d90]">
                      {entry.reason}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
