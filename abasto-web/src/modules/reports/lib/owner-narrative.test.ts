import { describe, expect, test } from 'bun:test'

import {
  averageTicketSentence,
  cashSentence,
  idleCapitalSentence,
  marginSentence,
  profitSentence,
  salesSentence,
  supplierSentence,
  ticketsSentence,
  topProductSentence,
  warehouseSentence,
} from '#/modules/reports/lib/owner-narrative'

const metrics = (revenueCents: number, costCents: number, tickets: number) => {
  const marginCents = revenueCents - costCents
  return {
    revenueCents,
    costCents,
    marginCents,
    marginBps: revenueCents
      ? Math.round((marginCents * 10_000) / revenueCents)
      : null,
    tickets,
    averageTicketCents: tickets ? Math.round(revenueCents / tickets) : 0,
  }
}

const row = (name: string, now: [number, number], before: [number, number]) => {
  const current = metrics(now[0], now[1], 1)
  const previous = metrics(before[0], before[1], 1)
  return {
    key: name,
    name,
    current,
    previous,
    delta: {
      revenueCents: current.revenueCents - previous.revenueCents,
      marginCents: current.marginCents - previous.marginCents,
      marginBps: null,
      tickets: 0,
      averageTicketCents: 0,
      revenueChangeBps: previous.revenueCents
        ? Math.round(
            ((current.revenueCents - previous.revenueCents) * 10_000) /
              previous.revenueCents,
          )
        : null,
    },
  }
}

describe('salesSentence', () => {
  test('says whether sales rose or fell, by how much', () => {
    expect(salesSentence(metrics(100_200, 0, 1), metrics(100_000, 0, 1))).toBe(
      'Las ventas subieron 0.2 % frente al periodo anterior.',
    )
    expect(salesSentence(metrics(95_000, 0, 1), metrics(100_000, 0, 1))).toBe(
      'Las ventas bajaron 5.0 % frente al periodo anterior.',
    )
  })

  test('says they held when nothing changed', () => {
    expect(salesSentence(metrics(100, 0, 1), metrics(100, 0, 1))).toBe(
      'Las ventas se mantuvieron igual que en el periodo anterior.',
    )
  })

  test('does not compare against a period without sales', () => {
    expect(salesSentence(metrics(100, 0, 1), metrics(0, 0, 0))).toBe(
      'No hubo ventas en el periodo anterior para comparar.',
    )
  })
})

describe('profitSentence', () => {
  const rows = [
    row('Tejupilco', [60_000, 40_000], [50_000, 36_000]),
    row('Amatepec', [20_000, 18_000], [40_000, 30_000]),
    row('Arcelia', [30_000, 24_000], [30_000, 24_000]),
  ]

  test('names the warehouse behind the biggest drop when profit fell', () => {
    expect(
      profitSentence(
        metrics(110_000, 82_000, 1),
        metrics(120_000, 90_000, 1),
        rows,
      ),
    ).toBe(
      'La utilidad bajó 6.7 % frente al periodo anterior; Amatepec explica la mayor caída.',
    )
  })

  test('names the warehouse behind the biggest gain when profit rose', () => {
    expect(
      profitSentence(
        metrics(130_000, 90_000, 1),
        metrics(120_000, 90_000, 1),
        rows,
      ),
    ).toBe(
      'La utilidad subió 33.3 % frente al periodo anterior; Tejupilco aporta el mayor aumento.',
    )
  })

  test('leaves the warehouse out when none moved the same way', () => {
    expect(
      profitSentence(metrics(100, 50, 1), metrics(100, 60, 1), [
        row('Arcelia', [100, 50], [100, 50]),
      ]),
    ).toBe('La utilidad subió 25.0 % frente al periodo anterior.')
  })

  test('does not name a driver when a single warehouse is in view', () => {
    expect(
      profitSentence(metrics(130_000, 90_000, 1), metrics(120_000, 90_000, 1), [
        row('Tejupilco', [130_000, 90_000], [120_000, 90_000]),
      ]),
    ).toBe('La utilidad subió 33.3 % frente al periodo anterior.')
  })
})

describe('marginSentence', () => {
  test('gives the margin and its change in points', () => {
    expect(marginSentence(metrics(1000, 798, 1), metrics(1000, 800, 1))).toBe(
      'El margen es de 20.2 %, 0.2 puntos más que en el periodo anterior.',
    )
    expect(marginSentence(metrics(1000, 800, 1), metrics(1000, 780, 1))).toBe(
      'El margen es de 20.0 %, 2.0 puntos menos que en el periodo anterior.',
    )
  })

  test('says it held, and handles no sales', () => {
    expect(marginSentence(metrics(1000, 800, 1), metrics(1000, 800, 1))).toBe(
      'El margen es de 20.0 %, igual que en el periodo anterior.',
    )
    expect(marginSentence(metrics(0, 0, 0), metrics(0, 0, 0))).toBe(
      'Sin ventas no hay margen que calcular.',
    )
  })
})

describe('ticketsSentence and averageTicketSentence', () => {
  test('tickets compare against the previous period', () => {
    expect(ticketsSentence(metrics(1, 0, 6438), metrics(1, 0, 6470))).toBe(
      'Hubo 6,438 tickets, 0.5 % menos que en el periodo anterior.',
    )
    expect(ticketsSentence(metrics(1, 0, 10), metrics(1, 0, 0))).toBe(
      'Hubo 10 tickets; no hubo tickets en el periodo anterior para comparar.',
    )
  })

  test('average ticket is stated in pesos with centavos', () => {
    expect(
      averageTicketSentence(
        metrics(1_940_000, 0, 100),
        metrics(1_927_000, 0, 100),
      ),
    ).toBe(
      'Cada ticket vale $194.00 en promedio, 0.7 % más que en el periodo anterior.',
    )
  })
})

describe('warehouseSentence', () => {
  test('contrasts the best and the worst revenue change', () => {
    const rows = [
      row('Tejupilco', [107_500, 0], [100_000, 0]),
      row('Luvianos', [101_400, 0], [100_000, 0]),
      row('Amatepec', [91_500, 0], [100_000, 0]),
    ]
    expect(warehouseSentence(rows)).toBe(
      'Tejupilco creció 7.5 % mientras Amatepec bajó 8.5 %.',
    )
  })

  test('is null when no warehouse has a previous period to compare', () => {
    expect(warehouseSentence([row('A', [1, 0], [0, 0])])).toBeNull()
  })
})

describe('idleCapitalSentence', () => {
  test('states the idle money and its share of the inventory', () => {
    expect(idleCapitalSentence(11_850_000, 106_150_000)).toBe(
      'Tienes $118,500.00 detenidos en producto que no se vende, el 11.2 % de tu inventario.',
    )
  })

  test('speaks of the selection, not of the whole inventory, under filters', () => {
    expect(idleCapitalSentence(11_850_000, 106_150_000, true)).toBe(
      'Tienes $118,500.00 detenidos en producto que no se vende, el 11.2 % del inventario de esta selección.',
    )
    expect(idleCapitalSentence(0, 100, true)).toBe(
      'Todo el inventario de esta selección tuvo ventas en este lapso.',
    )
  })

  test('says nothing is idle', () => {
    expect(idleCapitalSentence(0, 100)).toBe(
      'Todo tu inventario tuvo ventas en este lapso.',
    )
  })
})

describe('cashSentence', () => {
  test('states the shortage or surplus and how many cuts had a difference', () => {
    expect(
      cashSentence({ closed: 30, withDifference: 21, totalCents: -64_000 }),
    ).toBe('Caja cerró $640.00 abajo en el periodo; 21 cortes con diferencia.')
    expect(
      cashSentence({ closed: 3, withDifference: 1, totalCents: 500 }),
    ).toBe('Caja cerró $5.00 arriba en el periodo; 1 corte con diferencia.')
  })

  test('says every cut matched, or that there were none', () => {
    expect(cashSentence({ closed: 4, withDifference: 0, totalCents: 0 })).toBe(
      'Los 4 cortes del periodo cuadraron.',
    )
    expect(cashSentence({ closed: 0, withDifference: 0, totalCents: 0 })).toBe(
      'No hubo cortes de caja cerrados en el periodo.',
    )
  })
})

describe('supplierSentence', () => {
  const supplier = (name: string, revenueCents: number, marginBps: number) => ({
    key: name,
    name,
    orders: 1,
    units: 1,
    revenueCents,
    costCents: 0,
    marginCents: 0,
    marginBps,
    shareBps: 0,
  })

  test('names the supplier that leaves more per peso sold', () => {
    expect(
      supplierSentence([
        supplier('Grupo Lala', 7_600, 2070),
        supplier('Alpura', 4_800, 2480),
      ]),
    ).toBe(
      'Alpura deja más por peso vendido que Grupo Lala: 24.8 % contra 20.7 %.',
    )
  })

  test('says the biggest supplier is also the most profitable', () => {
    expect(
      supplierSentence([
        supplier('Lala', 7_600, 2500),
        supplier('Alpura', 100, 1000),
      ]),
    ).toBe('Lala vende más y también deja el mejor margen: 25.0 %.')
  })

  test('is null with fewer than two suppliers', () => {
    expect(supplierSentence([supplier('Lala', 1, 1000)])).toBeNull()
  })
})

describe('topProductSentence', () => {
  test('names the product that leaves the most profit', () => {
    expect(
      topProductSentence({
        name: 'Leche Lala Entera 1 L',
        marginCents: 4_123_000,
        marginBps: 1780,
      }),
    ).toBe(
      'Leche Lala Entera 1 L es tu mejor producto: $41,230.00 de utilidad, con un margen de 17.8 %.',
    )
  })

  test('is null without a profitable product', () => {
    expect(topProductSentence(undefined)).toBeNull()
  })
})
