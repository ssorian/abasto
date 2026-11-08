import { describe, expect, test } from 'bun:test'
import {
  initialReception,
  missingBoxes,
  receptionInputFromDraft,
  receptionIssues,
  receptionSummary,
} from '#/modules/inventory/lib/reception-draft'
import type {
  ReceptionDraft,
  ReceptionLine,
} from '#/modules/inventory/lib/reception-draft'

const lines: Array<ReceptionLine> = [
  { lineId: 'l1', productId: 'milk', orderedBoxes: 10 },
  { lineId: 'l2', productId: 'yog', orderedBoxes: 4 },
]

const draft = (patch: Partial<ReceptionDraft> = {}): ReceptionDraft => ({
  lines: {
    l1: { good: '10', damaged: '0', lotCode: '', expiresOn: '' },
    l2: { good: '4', damaged: '0', lotCode: '', expiresOn: '' },
  },
  replacements: {},
  ...patch,
})

describe('missingBoxes', () => {
  test('is ordered − good − damaged', () => {
    expect(missingBoxes(10, '7', '2')).toBe(1)
    expect(missingBoxes(10, '', '')).toBe(10)
  })

  test('never goes negative', () => {
    expect(missingBoxes(10, '8', '5')).toBe(0)
  })

  test('treats invalid text as zero received', () => {
    expect(missingBoxes(10, 'x', '2')).toBe(8)
  })
})

describe('initialReception', () => {
  test('starts with everything good and nothing damaged', () => {
    expect(initialReception(lines).lines.l1).toEqual({
      good: '10',
      damaged: '0',
      lotCode: '',
      expiresOn: '',
    })
  })
})

describe('receptionIssues', () => {
  test('is empty when everything adds up', () => {
    expect(receptionIssues(lines, draft(), {})).toEqual({})
  })

  test('rejects good + damaged above the ordered boxes', () => {
    const issues = receptionIssues(
      lines,
      draft({
        lines: {
          ...draft().lines,
          l1: { good: '8', damaged: '3', lotCode: '', expiresOn: '' },
        },
      }),
      {},
    )
    expect(issues.l1).toContain('pedidas')
    expect(issues.l2).toBeUndefined()
  })

  test('rejects invalid numbers', () => {
    const issues = receptionIssues(
      lines,
      draft({
        lines: {
          ...draft().lines,
          l2: { good: '-1', damaged: '0', lotCode: '', expiresOn: '' },
        },
      }),
      {},
    )
    expect(issues.l2).toBeDefined()
  })

  test('rejects replacements above what is owed', () => {
    const issues = receptionIssues(
      lines,
      draft({
        replacements: { milk: { boxes: '3', lotCode: '', expiresOn: '' } },
      }),
      { milk: 2 },
    )
    expect(issues.milk).toContain('debe')
  })
})

describe('receptionSummary', () => {
  test('adds good, damaged and missing boxes', () => {
    const summary = receptionSummary(
      lines,
      draft({
        lines: {
          l1: { good: '7', damaged: '2', lotCode: '', expiresOn: '' },
          l2: { good: '4', damaged: '0', lotCode: '', expiresOn: '' },
        },
      }),
    )
    expect(summary).toEqual({ good: 11, damaged: 2, missing: 1 })
  })
})

describe('receptionInputFromDraft', () => {
  test('builds one entry per line with trimmed lot codes', () => {
    const parsed = receptionInputFromDraft(
      'po1',
      lines,
      {
        ...draft(),
        lines: {
          ...draft().lines,
          l1: {
            good: '9',
            damaged: '1',
            lotCode: ' A1 ',
            expiresOn: '2027-01-01',
          },
        },
      },
      {},
    )
    expect(parsed).toEqual({
      ok: true,
      value: {
        purchaseId: 'po1',
        lines: [
          {
            lineId: 'l1',
            goodBoxes: 9,
            damagedBoxes: 1,
            lotCode: 'A1',
            expiresOn: '2027-01-01',
          },
          { lineId: 'l2', goodBoxes: 4, damagedBoxes: 0 },
        ],
      },
    })
  })

  test('sends replacements with boxes only, within what is owed', () => {
    const parsed = receptionInputFromDraft(
      'po1',
      lines,
      draft({
        replacements: {
          milk: { boxes: '2', lotCode: 'R1', expiresOn: '' },
          yog: { boxes: '', lotCode: '', expiresOn: '' },
          other: { boxes: '0', lotCode: '', expiresOn: '' },
        },
      }),
      { milk: 3, yog: 1, other: 1 },
    )
    expect(parsed.ok && parsed.value.replacements).toEqual([
      { productId: 'milk', boxes: 2, lotCode: 'R1' },
    ])
  })

  test('omits replacements when none are typed', () => {
    const parsed = receptionInputFromDraft('po1', lines, draft(), {})
    expect(parsed.ok && 'replacements' in parsed.value).toBe(false)
  })

  test('fails when a line is inconsistent', () => {
    const parsed = receptionInputFromDraft(
      'po1',
      lines,
      draft({
        lines: {
          ...draft().lines,
          l1: { good: '10', damaged: '1', lotCode: '', expiresOn: '' },
        },
      }),
      {},
    )
    expect(parsed.ok).toBe(false)
  })

  test('fails when a replacement exceeds the owed boxes', () => {
    const parsed = receptionInputFromDraft(
      'po1',
      lines,
      draft({
        replacements: { milk: { boxes: '5', lotCode: '', expiresOn: '' } },
      }),
      { milk: 2 },
    )
    expect(parsed.ok).toBe(false)
  })
})
