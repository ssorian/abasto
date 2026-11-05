import { describe, expect, test } from 'bun:test'
import {
  agingCsv,
  buildCsv,
  centsToDecimal,
  salesCsv,
} from '#/modules/reports/lib/csv'

describe('csv output', () => {
  test('starts with a BOM, joins rows with CRLF and quotes every cell', () => {
    expect(buildCsv(['a', 'b'], [[1, 'x']])).toBe('\uFEFF"a","b"\r\n"1","x"')
  })

  test('doubles quotes and keeps commas and newlines inside the cell', () => {
    expect(buildCsv(['n'], [['Don "Pepe", S.A.\nCentro']])).toBe(
      '\uFEFF"n"\r\n"Don ""Pepe"", S.A.\nCentro"',
    )
  })

  test('neutralises spreadsheet formulas but keeps negative numbers', () => {
    const csv = buildCsv(
      ['n'],
      [['=HYPERLINK("x")'], ['+1'], ['@cmd'], ['-cmd'], ['-12.50'], [null]],
    )
    expect(csv).toContain(`"'=HYPERLINK(""x"")"`)
    expect(csv).toContain(`"'+1"`)
    expect(csv).toContain(`"'@cmd"`)
    expect(csv).toContain(`"'-cmd"`)
    expect(csv).toContain('"-12.50"')
    expect(csv.endsWith('\r\n""')).toBe(true)
  })

  test('formats cents as exact decimals without floats', () => {
    expect(centsToDecimal(0)).toBe('0.00')
    expect(centsToDecimal(5)).toBe('0.05')
    expect(centsToDecimal(1005)).toBe('10.05')
    expect(centsToDecimal(-1005)).toBe('-10.05')
    expect(centsToDecimal(2_147_483_647)).toBe('21474836.47')
  })

  test('a sales table exports its headings, rows and totals in pesos', () => {
    const csv = salesCsv('customer', [
      {
        key: 'c1',
        name: '=Distribuidora, Norte',
        orders: 2,
        units: 20,
        revenueCents: 19500,
        costCents: 3005,
        marginCents: 16495,
      },
    ])
    const [heading, row] = csv.replace('\uFEFF', '').split('\r\n')
    expect(heading).toBe(
      '"Cliente","Pedidos","Unidades base","Ventas","Costo","Utilidad","Margen %"',
    )
    expect(row).toBe(
      `"'=Distribuidora, Norte","2","20","195.00","30.05","164.95","84.59"`,
    )
  })

  test('an aging table exports every bucket', () => {
    const csv = agingCsv([
      {
        customerId: 'c1',
        name: 'Norte',
        currentCents: 100,
        days1to30Cents: 200,
        days31to60Cents: 300,
        over60Cents: 400,
        totalCents: 1000,
      },
    ])
    expect(csv.replace('\uFEFF', '').split('\r\n')).toEqual([
      '"Cliente","Al corriente","1-30 días","31-60 días","Más de 60 días","Saldo total"',
      '"Norte","1.00","2.00","3.00","4.00","10.00"',
    ])
  })
})
