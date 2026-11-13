import { parseBoxCount } from '#/modules/inventory/lib/box-count'
import { parsePesosToCents } from '#/modules/inventory/lib/cents'
import { fail } from '#/modules/inventory/lib/parsed'
import type { Parsed } from '#/modules/inventory/lib/parsed'
import type { ReturnResolution } from '#/modules/inventory/db/schema'

export type ReturnDraft = {
  pendingId: string
  /** Boxes still open on the balance. */
  owedBoxes: number
  boxes: string
  resolution: ReturnResolution
  /** Pesos credited by the supplier; only for a discount, blank = original value. */
  credit: string
}

export type ReturnRequest = {
  pendingId: string
  boxes: number
  resolution: ReturnResolution
  creditCents?: number
}

/** "Devuelto" form → server input; a replacement never carries an amount. */
export function returnInputFromDraft(
  draft: ReturnDraft,
): Parsed<ReturnRequest> {
  const boxes = parseBoxCount(draft.boxes)
  if (!boxes.ok) return boxes
  if (boxes.value === 0) return fail('Escribe cuántas cajas devolver.')
  if (boxes.value > draft.owedBoxes) {
    return fail(
      `El proveedor tiene ${draft.owedBoxes} ${draft.owedBoxes === 1 ? 'caja' : 'cajas'} por devolver.`,
    )
  }
  const base = {
    pendingId: draft.pendingId,
    boxes: boxes.value,
    resolution: draft.resolution,
  }
  if (draft.resolution === 'replacement' || !draft.credit.trim()) {
    return { ok: true, value: base }
  }
  const credit = parsePesosToCents(draft.credit, { allowZero: true })
  if (!credit.ok) return credit
  return { ok: true, value: { ...base, creditCents: credit.value } }
}

export type ScrapRequest = { pendingId: string; boxes: number }

/** "Dar por merma" form → server input. */
export function scrapInputFromDraft(draft: {
  pendingId: string
  owedBoxes: number
  boxes: string
}): Parsed<ScrapRequest> {
  const boxes = parseBoxCount(draft.boxes)
  if (!boxes.ok) return boxes
  if (boxes.value === 0) return fail('Escribe cuántas cajas dar por merma.')
  if (boxes.value > draft.owedBoxes) {
    return fail(
      `El proveedor tiene ${draft.owedBoxes} ${draft.owedBoxes === 1 ? 'caja' : 'cajas'} por devolver.`,
    )
  }
  return { ok: true, value: { pendingId: draft.pendingId, boxes: boxes.value } }
}
