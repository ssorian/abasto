import { describe, expect, test } from 'bun:test'

import {
  currentAssignments,
  differenceLabel,
  statusTone,
} from './assignment-view'

const at = (iso: string) => new Date(iso)

describe('currentAssignments', () => {
  const base = {
    riderName: 'Luis',
    closedAt: null,
  }
  const list = [
    {
      ...base,
      id: 'old-open',
      status: 'En ruta',
      createdAt: at('2026-11-01T15:00:00Z'),
    },
    {
      ...base,
      id: 'today-new',
      status: 'En ruta',
      createdAt: at('2026-11-08T15:00:00Z'),
    },
    {
      ...base,
      id: 'old-done',
      status: 'Liquidada',
      createdAt: at('2026-11-07T15:00:00Z'),
      closedAt: at('2026-11-08T03:00:00Z'),
    },
    {
      ...base,
      id: 'old-closed',
      status: 'Cancelada',
      createdAt: at('2026-11-06T15:00:00Z'),
      closedAt: at('2026-11-06T20:00:00Z'),
    },
  ] as const

  test('keeps every open assignment and what moved today (business day)', () => {
    // 2026-11-08 03:00Z is 21:00 of the 7th in Mexico City; "today" is the 8th.
    const ids = currentAssignments(list, '2026-11-08').map((a) => a.id)
    expect(ids).toEqual(['old-open', 'today-new'])
  })

  test('a settlement closed during the business day stays visible', () => {
    const ids = currentAssignments(list, '2026-11-07').map((a) => a.id)
    // Open ones always stay, however old or new.
    expect(ids).toEqual(['old-open', 'today-new', 'old-done'])
  })
})

describe('differenceLabel', () => {
  test('names shortage, surplus and exact', () => {
    expect(differenceLabel(0)).toBe('Sin diferencia')
    expect(differenceLabel(-1500)).toContain('Faltante')
    expect(differenceLabel(-1500)).toContain('15.00')
    expect(differenceLabel(250)).toContain('Sobrante')
    expect(differenceLabel(250)).toContain('2.50')
  })
})

describe('statusTone', () => {
  test('maps each status to a badge tone', () => {
    expect(statusTone('En ruta')).toBe('blue')
    expect(statusTone('Liquidada')).toBe('green')
    expect(statusTone('Cancelada')).toBe('gray')
  })
})
