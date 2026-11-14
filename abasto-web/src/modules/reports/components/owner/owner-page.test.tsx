import { describe, expect, test } from 'bun:test'
import { renderToStaticMarkup } from 'react-dom/server'

import { formatCents } from '#/modules/pricing/lib/money'
import { ControlSummary } from '#/modules/reports/components/owner/control-summary'
import { OwnerToolbar } from '#/modules/reports/components/owner/owner-toolbar'
import type { CashCuts } from '#/modules/reports/types/reports'

const warehouses = [
  { id: 'w1', name: 'Tejupilco' },
  { id: 'w2', name: 'Sultepec' },
]
const suppliers = [
  { id: 's1', name: 'Grupo Lala', active: true },
  { id: 's2', name: 'Alpura', active: false },
]

describe('OwnerToolbar', () => {
  const render = (
    props: Pick<Parameters<typeof OwnerToolbar>[0], 'preset' | 'search'>,
  ) =>
    renderToStaticMarkup(
      <OwnerToolbar
        {...props}
        warehouses={warehouses}
        suppliers={suppliers}
        onChange={() => undefined}
      />,
    )

  test('offers calendar periods and marks the current one', () => {
    const html = render({ preset: 'week', search: {} })
    for (const label of ['Hoy', 'Semana', 'Mes', 'Personalizado']) {
      expect(html).toContain(`>${label}</button>`)
    }
    expect(html).not.toContain('7 días')
    expect(html).toMatch(/aria-pressed="true"[^>]*>Semana</)
    expect(html).not.toContain('type="date"')
  })

  test('offers all warehouses and suppliers and marks the ones in the URL', () => {
    const html = render({
      preset: 'week',
      search: { almacen: 'w2', proveedor: 's1' },
    })
    expect(html).toContain('Todos los almacenes')
    expect(html).toContain('Todos los proveedores')
    expect(html).toContain('Alpura (inactivo)')
    expect(html).toMatch(/<option value="w2" selected="">Sultepec/)
    expect(html).toMatch(/<option value="s1" selected="">Grupo Lala/)
  })

  test('asks for the dates only on a custom period', () => {
    const html = render({
      preset: 'custom',
      search: { periodo: 'custom', desde: '2026-11-01', hasta: '2026-11-07' },
    })
    expect(html).toContain('value="2026-11-01"')
    expect(html).toContain('value="2026-11-07"')
  })
})

describe('ControlSummary', () => {
  const cut = {
    sessionId: 'c1',
    warehouseId: 'w1',
    warehouseName: 'Tejupilco',
    status: 'closed',
    openedAt: new Date('2026-11-13T14:00:00Z'),
    closedAt: new Date('2026-11-13T23:00:00Z'),
    openedByName: 'Miguel Cruz',
    closedByName: 'Miguel Cruz',
    openingCents: 0,
    salesCents: 203834,
    entriesCents: 0,
    withdrawalsCents: 0,
    riderDifferenceCents: 0,
    expectedCents: 203834,
    countedCents: 198834,
    differenceCents: -5000,
  } satisfies CashCuts['rows'][number]
  const cashCuts: CashCuts = {
    range: { from: '2026-11-09', to: '2026-11-13' },
    warehouses,
    rows: [cut],
    totals: {
      sessions: 1,
      salesCents: 203834,
      expectedCents: 203834,
      countedCents: 198834,
      differenceCents: -5000,
    },
    riderShortfalls: [],
  }
  const supplierRecovery = {
    range: cashCuts.range,
    recoveredCents: 6532,
    discountedCents: 4032,
    replacedCents: 2500,
    pendingCents: 123456,
    lostCents: 2704,
    scrappedCents: 1344,
    unrecognizedCents: 688,
    inventoryLossCents: 672,
  }
  const render = (props: Partial<Parameters<typeof ControlSummary>[0]> = {}) =>
    renderToStaticMarkup(
      <ControlSummary
        cashCuts={cashCuts}
        supplierRecovery={supplierRecovery}
        {...props}
      />,
    )

  test('shows three figures and keeps every detail closed', () => {
    const html = render()
    for (const text of [
      'Caja',
      '-$50.00',
      '1 corte con diferencia',
      'Repartos',
      'Sin faltantes ni sobrantes',
      'Proveedores, por recuperar',
      formatCents(123456),
      `${formatCents(2704)}</span> ya perdido`,
    ]) {
      expect(html).toContain(text)
    }
    expect(html.match(/aria-expanded="false"/g)).toHaveLength(3)
    expect(html).not.toContain('Esperado')
    expect(html).not.toContain('Merma de proveedor')
  })

  test('the cash detail lists each closed cut', () => {
    const html = render({ defaultOpen: 'cash' })
    for (const text of [
      'Vie 13',
      'Miguel Cruz',
      formatCents(203834),
      formatCents(198834),
      'Faltante',
    ]) {
      expect(html).toContain(text)
    }
  })

  test('the supplier detail breaks down recovered, pending and lost', () => {
    const html = render({ defaultOpen: 'suppliers' })
    for (const text of [
      'Recuperado',
      'Pendiente, a hoy',
      'Perdido',
      'Descontado en pedidos',
      'Repuesto en mercadería',
      'Merma de proveedor',
      'No reconocido en devoluciones',
      'Pérdidas de inventario',
      formatCents(6532),
      formatCents(672),
    ]) {
      expect(html).toContain(text)
    }
  })

  test('says which filter the figures ignore, only when it is selected', () => {
    const cashNote = 'La caja no se filtra por proveedor.'
    const supplierNote = 'Los saldos con proveedores son de toda la empresa'
    expect(render()).not.toContain(cashNote)
    expect(render()).not.toContain(supplierNote)
    expect(render({ supplierFiltered: true })).toContain(cashNote)
    expect(render({ warehouseFiltered: true })).toContain(supplierNote)
  })
})
