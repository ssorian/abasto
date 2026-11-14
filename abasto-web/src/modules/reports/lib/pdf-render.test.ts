import { describe, expect, test } from 'bun:test'
import { pdfText } from '#/modules/reports/lib/pdf-render'

describe('pdfText', () => {
  test('keeps Spanish letters and swaps typographic marks for plain ones', () => {
    expect(pdfText('Crema Ácida “Alpura” 426 ml – 1½ L…')).toBe(
      'Crema Ácida "Alpura" 426 ml - 1½ L...',
    )
    expect(pdfText('Don José’s · −$50.00')).toBe("Don José's · -$50.00")
  })

  test('drops what the PDF font cannot draw instead of printing garbage', () => {
    expect(pdfText('Leche 🥛 Lala ✓')).toBe('Leche Lala')
  })
})
