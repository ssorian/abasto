import { describe, expect, test } from 'bun:test'
import { formatCents } from '#/modules/pricing/lib/money'
import { renderToStaticMarkup } from 'react-dom/server'

import { CashSection } from '#/modules/reports/components/owner/cash-section'
import { SupplierRecovery } from '#/modules/reports/components/owner/supplier-recovery'
import { OwnerPeriodFilters } from '#/modules/reports/components/owner/owner-period-filters'

const warehouses = [
  { id: 'w1', name: 'Tejupilco' },
  { id: 'w2', name: 'Sultepec' },
]
const suppliers = [
  { id: 's1', name: 'Grupo Lala', active: true },
  { id: 's2', name: 'Alpura', active: true },
]

const render = (search: Parameters<typeof OwnerPeriodFilters>[0]['search']) =>
  renderToStaticMarkup(
    <OwnerPeriodFilters
      search={search}
      warehouses={warehouses}
      suppliers={suppliers}
      onChange={() => undefined}
    />,
  )

describe('OwnerPeriodFilters', () => {
  test('offers all warehouses and all suppliers, plus one option each', () => {
    const html = render({})
    expect(html).toContain('Todos los almacenes')
    expect(html).toContain('Tejupilco')
    expect(html).toContain('Sultepec')
    expect(html).toContain('Todos los proveedores')
    expect(html).toContain('Grupo Lala')
    expect(html).toContain('Alpura')
  })

  test('marks the filters taken from the URL', () => {
    const html = render({ almacen: 'w2', proveedor: 's1' })
    expect(html).toMatch(/<option value="w2" selected/)
    expect(html).toMatch(/<option value="s1" selected/)
  })
})

describe('CashSection', () => {
  const props = { rows: [], sentence: 'Sin cortes.' }
  test('says the cash is not filtered by supplier only when one is selected', () => {
    const note = 'La caja no se filtra por proveedor.'
    expect(renderToStaticMarkup(<CashSection {...props} />)).not.toContain(note)
    expect(
      renderToStaticMarkup(<CashSection {...props} supplierFiltered />),
    ).toContain(note)
  })
})

describe('SupplierRecovery', () => {
  const data = {
    range: { from: '2026-11-01', to: '2026-11-30' },
    recoveredCents: 6532,
    discountedCents: 4032,
    replacedCents: 2500,
    pendingCents: 123456,
    lostCents: 2704,
    scrappedCents: 1344,
    unrecognizedCents: 688,
    inventoryLossCents: 672,
  }
  const note = 'Los saldos con proveedores son de toda la empresa'

  test('shows the three figures with their breakdown in pesos', () => {
    const html = renderToStaticMarkup(<SupplierRecovery data={data} />)
    for (const text of [
      'Dinero con proveedores',
      'Recuperado',
      'Pendiente',
      'Perdido',
      'Descontado en pedidos',
      'Repuesto en mercadería',
      'Merma de proveedor',
      'No reconocido en devoluciones',
      'Pérdidas de inventario',
      formatCents(6532),
      formatCents(123456),
      formatCents(2704),
      formatCents(672),
    ]) {
      expect(html).toContain(text)
    }
  })

  test('says supplier balances ignore the warehouse only when one is selected', () => {
    expect(
      renderToStaticMarkup(<SupplierRecovery data={data} />),
    ).not.toContain(note)
    expect(
      renderToStaticMarkup(<SupplierRecovery data={data} warehouseFiltered />),
    ).toContain(note)
  })
})
