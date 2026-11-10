import { describe, expect, test } from 'bun:test'
import {
  initialReception,
  goodBoxes,
  receptionInputFromDraft,
  receptionIssues,
  receptionSummary,
  receptionSummaryText,
  replacementBoxes,
  toggleReceived,
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
    l1: { missing: '0', damaged: '0', expiresOn: '', noExpiry: true },
    l2: { missing: '0', damaged: '0', expiresOn: '', noExpiry: true },
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
      noExpiry: false,
    })
  })
})

describe('receptionIssues', () => {
  test('is empty when everything adds up', () => {
    expect(receptionIssues(lines, draft(), {})).toEqual({})
  })

  test('asks for an expiry, or an explicit none, wherever good boxes enter', () => {
    const issues = receptionIssues(
      lines,
      draft({
        lines: {
          l1: { missing: '0', damaged: '0', expiresOn: '', noExpiry: false },
          l2: { missing: '4', damaged: '0', expiresOn: '', noExpiry: false },
        },
        replacements: {
          m1: { boxes: '1', expiresOn: '' },
          m2: { boxes: '1', expiresOn: '', noExpiry: true },
        },
      }),
      { m1: 3, m2: 3 },
    )
    const message = 'Indica la caducidad o marca «Sin caducidad».'
    // l2 has no good boxes, so it needs nothing.
    expect(issues).toEqual({ l1: message, m1: message })
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
          { lineId: 'l2', missingBoxes: 0, damagedBoxes: 0, noExpiry: true },
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

describe('replacementBoxes', () => {
  test('adds the typed replacement boxes, ignoring invalid text', () => {
    expect(
      replacementBoxes(
        draft({
          replacements: {
            m1: { boxes: '3', expiresOn: '' },
            m2: { boxes: '1', expiresOn: '' },
            m3: { boxes: 'x', expiresOn: '' },
          },
        }),
      ),
    ).toBe(4)
    expect(replacementBoxes(draft())).toBe(0)
  })
})

describe('toggleReceived', () => {
  test('marks everything owed as arrived', () => {
    expect(toggleReceived({}, 'm1', 3)).toEqual({
      m1: { boxes: '3', expiresOn: '' },
    })
  })

  test('keeps the expiry date already typed', () => {
    expect(
      toggleReceived({ m1: { boxes: '1', expiresOn: '2027-05-01' } }, 'm1', 3),
    ).toEqual({ m1: { boxes: '3', expiresOn: '2027-05-01' } })
  })

  test('undoes the mark when all of it was already marked', () => {
    expect(
      toggleReceived({ m1: { boxes: '3', expiresOn: '' } }, 'm1', 3).m1?.boxes,
    ).toBe('')
  })
})

describe('receptionSummaryText', () => {
  test('lists entering, replacement, new missing and damaged boxes', () => {
    expect(
      receptionSummaryText({ good: 63, replaced: 4, missing: 5, damaged: 2 }),
    ).toBe(
      'Entran 63 cajas + 4 de reposición · 5 faltantes nuevos · 2 dañadas por devolver',
    )
  })

  test('leaves out what is zero and uses singulars', () => {
    expect(
      receptionSummaryText({ good: 1, replaced: 0, missing: 1, damaged: 1 }),
    ).toBe('Entra 1 caja · 1 faltante nuevo · 1 dañada por devolver')
    expect(
      receptionSummaryText({ good: 10, replaced: 0, missing: 0, damaged: 0 }),
    ).toBe('Entran 10 cajas')
  })

  test('says so when nothing enters', () => {
    expect(
      receptionSummaryText({ good: 0, replaced: 0, missing: 3, damaged: 0 }),
    ).toBe('No entra ninguna caja · 3 faltantes nuevos')
  })
})
