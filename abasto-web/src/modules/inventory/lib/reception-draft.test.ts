import { describe, expect, test } from 'bun:test'
import {
  initialReception,
  goodBoxes,
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
    l1: { missing: '0', damaged: '0', expiresOn: '' },
    l2: { missing: '0', damaged: '0', expiresOn: '' },
  },
  replacements: {},
  ...patch,
})

describe('goodBoxes', () => {
  test('is ordered − missing − damaged', () => {
    expect(goodBoxes(10, '1', '2')).toBe(7)
    expect(goodBoxes(10, '', '')).toBe(10)
  })

  test('never goes negative', () => {
    expect(goodBoxes(10, '8', '5')).toBe(0)
  })

  test('treats invalid text as no exception', () => {
    expect(goodBoxes(10, 'x', '2')).toBe(8)
  })
})

describe('initialReception', () => {
  test('starts with everything good: no exceptions and no lot to type', () => {
    expect(initialReception(lines).lines.l1).toEqual({
      missing: '0',
      damaged: '0',
      expiresOn: '',
    })
  })
})

describe('receptionIssues', () => {
  test('is empty when everything adds up', () => {
    expect(receptionIssues(lines, draft(), {})).toEqual({})
  })

  test('rejects missing + damaged above the ordered boxes', () => {
    const issues = receptionIssues(
      lines,
      draft({
        lines: {
          ...draft().lines,
          l1: { missing: '8', damaged: '3', expiresOn: '' },
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
          l2: { missing: '-1', damaged: '0', expiresOn: '' },
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
        replacements: { m1: { boxes: '3', expiresOn: '' } },
      }),
      { m1: 2 },
    )
    expect(issues.m1).toContain('debe')
  })
})

describe('receptionSummary', () => {
  test('adds good, damaged and missing boxes', () => {
    const summary = receptionSummary(
      lines,
      draft({
        lines: {
          l1: { missing: '1', damaged: '2', expiresOn: '' },
          l2: { missing: '0', damaged: '0', expiresOn: '' },
        },
      }),
    )
    expect(summary).toEqual({ good: 11, damaged: 2, missing: 1 })
  })
})

describe('receptionInputFromDraft', () => {
  test('builds one entry per line with the exceptions and no lot code', () => {
    const parsed = receptionInputFromDraft(
      'po1',
      lines,
      {
        ...draft(),
        lines: {
          ...draft().lines,
          l1: { missing: '0', damaged: '1', expiresOn: '2027-01-01' },
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
            missingBoxes: 0,
            damagedBoxes: 1,
            expiresOn: '2027-01-01',
          },
          { lineId: 'l2', missingBoxes: 0, damagedBoxes: 0 },
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
          m1: { boxes: '2', expiresOn: '2027-02-01' },
          y1: { boxes: '', expiresOn: '' },
          o1: { boxes: '0', expiresOn: '' },
        },
      }),
      { m1: 3, y1: 1, o1: 1 },
    )
    expect(parsed.ok && parsed.value.replacements).toEqual([
      { pendingId: 'm1', boxes: 2, expiresOn: '2027-02-01' },
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
          l1: { missing: '10', damaged: '1', expiresOn: '' },
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
        replacements: { m1: { boxes: '5', expiresOn: '' } },
      }),
      { m1: 2 },
    )
    expect(parsed.ok).toBe(false)
  })
})
