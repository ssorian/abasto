import { describe, expect, test } from 'bun:test'
import {
  initialReception,
  expiredEntries,
  receptionOutcome,
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

describe('receptionOutcome (S12)', () => {
  const over = draft({
    lines: {
      ...draft().lines,
      l2: { missing: '10', damaged: '0', expiresOn: '', noExpiry: true },
    },
  })

  test('a line above the ordered boxes blocks confirm and never prints a summary that contradicts the error', () => {
    const outcome = receptionOutcome(lines, over, {})
    expect(outcome.canConfirm).toBe(false)
    expect(outcome.summary).toBe(
      'Corrige las cantidades marcadas para ver el resumen.',
    )
    expect(outcome.summary).not.toContain('faltantes')
    expect(outcome.summary).not.toContain('No entra')
  })

  test('a valid reception can be confirmed and summarizes it', () => {
    const outcome = receptionOutcome(
      lines,
      draft({
        lines: {
          ...draft().lines,
          l2: { missing: '1', damaged: '0', expiresOn: '', noExpiry: true },
        },
      }),
      {},
    )
    expect(outcome).toEqual({
      canConfirm: true,
      summary: 'Entran 13 cajas · 1 faltante nuevo',
    })
  })

  test('a missing expiry is asked for on confirm, not blocked up front', () => {
    const outcome = receptionOutcome(
      lines,
      draft({
        lines: {
          ...draft().lines,
          l1: { missing: '0', damaged: '0', expiresOn: '' },
        },
      }),
      {},
    )
    expect(outcome.canConfirm).toBe(true)
  })

  test('piece-based orders are summarized in pieces', () => {
    expect(
      receptionOutcome(
        [{ lineId: 'p', productId: 'p', orderedBoxes: 5, boxFactor: 1 }],
        {
          lines: {
            p: { missing: '0', damaged: '0', expiresOn: '', noExpiry: true },
          },
          replacements: {},
        },
        {},
      ).summary,
    ).toBe('Entran 5 piezas')
  })
})

describe('receptionSummaryText units (S13)', () => {
  test('piece-based reads pieces with the right plural', () => {
    expect(
      receptionSummaryText({
        good: 1,
        replaced: 0,
        missing: 0,
        damaged: 0,
        piecesOnly: true,
      }),
    ).toBe('Entra 1 pieza')
    expect(
      receptionSummaryText({
        good: 0,
        replaced: 0,
        missing: 2,
        damaged: 1,
        piecesOnly: true,
      }),
    ).toBe(
      'No entra ninguna pieza · 2 faltantes nuevos · 1 dañada por devolver',
    )
  })
})

describe('expired expiry dates (S3)', () => {
  const today = '2026-11-11'
  const expiredDraft = draft({
    lines: {
      l1: { missing: '0', damaged: '0', expiresOn: '2020-01-01' },
      l2: { missing: '4', damaged: '0', expiresOn: '2020-01-01' },
    },
    replacements: {
      m1: { boxes: '1', expiresOn: '2026-11-10' },
      m2: { boxes: '0', expiresOn: '2020-01-01' },
      m3: { boxes: '1', expiresOn: today },
    },
  })

  test('lists only entries whose good boxes enter with a past date', () => {
    // l2 has nothing good, m2 brings no boxes, m3 expires today (still valid).
    expect(expiredEntries(lines, expiredDraft, today)).toEqual(['l1', 'm1'])
    expect(expiredEntries(lines, draft(), today)).toEqual([])
  })

  test('without confirmation the input is refused; confirmed it carries the flag', () => {
    const owed = { m1: 2, m2: 2, m3: 2 }
    const refused = receptionInputFromDraft('po1', lines, expiredDraft, owed, {
      today,
      confirmExpired: false,
    })
    expect(refused).toEqual({
      ok: false,
      message:
        'Hay productos que entran con la caducidad vencida. Confirma que quieres recibirlos.',
    })
    const accepted = receptionInputFromDraft('po1', lines, expiredDraft, owed, {
      today,
      confirmExpired: true,
    })
    expect(accepted.ok && accepted.value.confirmExpired).toBe(true)
  })

  test('nothing expired: no flag is sent', () => {
    const parsed = receptionInputFromDraft(
      'po1',
      lines,
      draft(),
      {},
      {
        today,
        confirmExpired: true,
      },
    )
    expect(parsed.ok && 'confirmExpired' in parsed.value).toBe(false)
  })
})

describe('receptionIssues units (S13)', () => {
  test('a piece-based line says pieces, a boxed one says boxes', () => {
    const entry = { missing: '8', damaged: '3', expiresOn: '', noExpiry: true }
    const issues = receptionIssues(
      [
        { lineId: 'p', productId: 'p', orderedBoxes: 5, boxFactor: 1 },
        { lineId: 'b', productId: 'b', orderedBoxes: 5, boxFactor: 12 },
      ],
      { lines: { p: entry, b: entry }, replacements: {} },
      {},
    )
    expect(issues.p).toBe(
      'Las faltantes y dañadas no pueden superar las piezas pedidas.',
    )
    expect(issues.b).toBe(
      'Las faltantes y dañadas no pueden superar las cajas pedidas.',
    )
  })
})
