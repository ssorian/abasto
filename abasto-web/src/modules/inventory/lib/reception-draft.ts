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

export type ReceptionLineDraft = {
  good: string
  damaged: string
  lotCode: string
  expiresOn: string
}

export type ReplacementDraft = {
  boxes: string
  lotCode: string
  expiresOn: string
}

/** Reception form state; every field stays as typed text. */
export type ReceptionDraft = {
  /** By line id. */
  lines: Readonly<Record<string, ReceptionLineDraft | undefined>>
  /** By product id; only for products the supplier owes. */
  replacements: Readonly<Record<string, ReplacementDraft | undefined>>
}

/** Owed boxes by product id for the order's supplier. */
export type OwedBoxes = Readonly<Record<string, number | undefined>>

const emptyLine = (): ReceptionLineDraft => ({
  good: '0',
  damaged: '0',
  lotCode: '',
  expiresOn: '',
})

/** Starts from "everything arrived good"; the user edits the exceptions. */
export function initialReception(
  lines: ReadonlyArray<ReceptionLine>,
): ReceptionDraft {
  return {
    lines: Object.fromEntries(
      lines.map((line) => [
        line.lineId,
        { ...emptyLine(), good: String(line.orderedBoxes) },
      ]),
    ),
    replacements: {},
  }
}

const count = (text: string) => {
  const parsed = parseBoxCount(text)
  return parsed.ok ? parsed.value : 0
}

/** Ordered − good − damaged, never below zero. */
export const missingBoxes = (ordered: number, good: string, damaged: string) =>
  Math.max(ordered - count(good) - count(damaged), 0)

/** Problems by line id (and by product id for replacements); empty when valid. */
export function receptionIssues(
  lines: ReadonlyArray<ReceptionLine>,
  draft: ReceptionDraft,
  owed: OwedBoxes,
): Record<string, string> {
  const issues: Record<string, string> = {}
  for (const line of lines) {
    const entry = draft.lines[line.lineId] ?? emptyLine()
    const good = parseBoxCount(entry.good)
    const damaged = parseBoxCount(entry.damaged)
    if (!good.ok) issues[line.lineId] = good.message
    else if (!damaged.ok) issues[line.lineId] = damaged.message
    else if (good.value + damaged.value > line.orderedBoxes) {
      issues[line.lineId] =
        'Las buenas y dañadas no pueden superar las cajas pedidas.'
    }
  }
  for (const [productId, item] of Object.entries(draft.replacements)) {
    if (!item) continue
    const boxes = parseBoxCount(item.boxes)
    const limit = owed[productId] ?? 0
    if (!boxes.ok) issues[productId] = boxes.message
    else if (boxes.value > limit) {
      issues[productId] =
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
        good: total.good + count(entry.good),
        damaged: total.damaged + count(entry.damaged),
        missing:
          total.missing +
          missingBoxes(line.orderedBoxes, entry.good, entry.damaged),
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
    const lotCode = entry.lotCode.trim()
    return {
      lineId: line.lineId,
      goodBoxes: count(entry.good),
      damagedBoxes: count(entry.damaged),
      ...(lotCode ? { lotCode } : {}),
      ...(entry.expiresOn ? { expiresOn: entry.expiresOn } : {}),
    }
  })
  const replacements = Object.entries(draft.replacements).flatMap(
    ([productId, item]) => {
      const boxes = item ? count(item.boxes) : 0
      if (!item || boxes === 0) return []
      const lotCode = item.lotCode.trim()
      return [
        {
          productId,
          boxes,
          ...(lotCode ? { lotCode } : {}),
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
