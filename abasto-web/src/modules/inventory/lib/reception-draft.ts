import { parseBoxCount } from '#/modules/inventory/lib/box-count'
import { fail } from '#/modules/inventory/lib/parsed'
import type { Parsed } from '#/modules/inventory/lib/parsed'
import type { ReceptionInput } from '#/modules/inventory/services/supplier-reception'

/** What the dialog needs of one ordered line. */
export type ReceptionLine = {
  lineId: string
  productId: string
  orderedBoxes: number
}

/** Only the exceptions are typed; the good boxes are derived. */
export type ReceptionLineDraft = {
  missing: string
  damaged: string
  expiresOn: string
}

export type ReplacementDraft = {
  boxes: string
  expiresOn: string
}

/** Reception form state; every field stays as typed text. */
export type ReceptionDraft = {
  /** By line id. */
  lines: Readonly<Record<string, ReceptionLineDraft | undefined>>
  /** By pending id; only for open "Por reponer" balances of the supplier. */
  replacements: Readonly<Record<string, ReplacementDraft | undefined>>
}

/** Open "Por reponer" boxes by pending id for the order's supplier. */
export type OwedBoxes = Readonly<Record<string, number | undefined>>

const emptyLine = (): ReceptionLineDraft => ({
  missing: '0',
  damaged: '0',
  expiresOn: '',
})

/** Starts from "everything arrived good"; the user types the exceptions. */
export function initialReception(
  lines: ReadonlyArray<ReceptionLine>,
): ReceptionDraft {
  return {
    lines: Object.fromEntries(lines.map((line) => [line.lineId, emptyLine()])),
    replacements: {},
  }
}

const count = (text: string) => {
  const parsed = parseBoxCount(text)
  return parsed.ok ? parsed.value : 0
}

/** Ordered − missing − damaged, never below zero. */
export const goodBoxes = (ordered: number, missing: string, damaged: string) =>
  Math.max(ordered - count(missing) - count(damaged), 0)

/** Problems by line id (and by pending id for replacements); empty when valid. */
export function receptionIssues(
  lines: ReadonlyArray<ReceptionLine>,
  draft: ReceptionDraft,
  owed: OwedBoxes,
): Record<string, string> {
  const issues: Record<string, string> = {}
  for (const line of lines) {
    const entry = draft.lines[line.lineId] ?? emptyLine()
    const missing = parseBoxCount(entry.missing)
    const damaged = parseBoxCount(entry.damaged)
    if (!missing.ok) issues[line.lineId] = missing.message
    else if (!damaged.ok) issues[line.lineId] = damaged.message
    else if (missing.value + damaged.value > line.orderedBoxes) {
      issues[line.lineId] =
        'Las faltantes y dañadas no pueden superar las cajas pedidas.'
    }
  }
  for (const [pendingId, item] of Object.entries(draft.replacements)) {
    if (!item) continue
    const boxes = parseBoxCount(item.boxes)
    const limit = owed[pendingId] ?? 0
    if (!boxes.ok) issues[pendingId] = boxes.message
    else if (boxes.value > limit) {
      issues[pendingId] =
        `El proveedor debe ${limit} ${limit === 1 ? 'caja' : 'cajas'}.`
    }
  }
  return issues
}

/** What the confirmation will record: totals across lines. */
export function receptionSummary(
  lines: ReadonlyArray<ReceptionLine>,
  draft: ReceptionDraft,
) {
  return lines.reduce(
    (total, line) => {
      const entry = draft.lines[line.lineId] ?? emptyLine()
      return {
        good:
          total.good +
          goodBoxes(line.orderedBoxes, entry.missing, entry.damaged),
        damaged: total.damaged + count(entry.damaged),
        missing: total.missing + count(entry.missing),
      }
    },
    { good: 0, damaged: 0, missing: 0 },
  )
}

/** Reception form → server input; replacements only where boxes were typed. */
export function receptionInputFromDraft(
  purchaseId: string,
  lines: ReadonlyArray<ReceptionLine>,
  draft: ReceptionDraft,
  owed: OwedBoxes,
): Parsed<ReceptionInput> {
  const issue = Object.values(receptionIssues(lines, draft, owed)).at(0)
  if (issue) return fail(issue)
  const entries = lines.map((line) => {
    const entry = draft.lines[line.lineId] ?? emptyLine()
    return {
      lineId: line.lineId,
      missingBoxes: count(entry.missing),
      damagedBoxes: count(entry.damaged),
      ...(entry.expiresOn ? { expiresOn: entry.expiresOn } : {}),
    }
  })
  const replacements = Object.entries(draft.replacements).flatMap(
    ([pendingId, item]) => {
      const boxes = item ? count(item.boxes) : 0
      if (!item || boxes === 0) return []
      return [
        {
          pendingId,
          boxes,
          ...(item.expiresOn ? { expiresOn: item.expiresOn } : {}),
        },
      ]
    },
  )
  return {
    ok: true,
    value: {
      purchaseId,
      lines: entries,
      ...(replacements.length ? { replacements } : {}),
    },
  }
}

/** Boxes typed across all replacements; invalid text counts as zero. */
export const replacementBoxes = (draft: ReceptionDraft) =>
  Object.values(draft.replacements).reduce(
    (total, item) => total + (item ? count(item.boxes) : 0),
    0,
  )

/**
 * "Recibido" on an owed balance: everything owed arrived. Marking it again
 * undoes it. Any expiry date already typed stays.
 */
export function toggleReceived(
  replacements: ReceptionDraft['replacements'],
  pendingId: string,
  owedBoxes: number,
): ReceptionDraft['replacements'] {
  const current = replacements[pendingId]
  const all = String(owedBoxes)
  return {
    ...replacements,
    [pendingId]: {
      expiresOn: current?.expiresOn ?? '',
      boxes: current?.boxes.trim() === all ? '' : all,
    },
  }
}

const plural = (amount: number, one: string, many: string) =>
  `${amount} ${amount === 1 ? one : many}`

/** One line for the confirmation: what enters stock and what stays with the supplier. */
export function receptionSummaryText(totals: {
  good: number
  replaced: number
  missing: number
  damaged: number
}) {
  const entering =
    totals.good === 0 && totals.replaced === 0
      ? 'No entra ninguna caja'
      : `${totals.good === 1 ? 'Entra' : 'Entran'} ${plural(totals.good, 'caja', 'cajas')}`
  return [
    totals.replaced > 0
      ? `${entering} + ${totals.replaced} de reposición`
      : entering,
    totals.missing > 0
      ? plural(totals.missing, 'faltante nuevo', 'faltantes nuevos')
      : null,
    totals.damaged > 0
      ? `${totals.damaged} ${totals.damaged === 1 ? 'dañada' : 'dañadas'} por devolver`
      : null,
  ]
    .filter(Boolean)
    .join(' · ')
}
