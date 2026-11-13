import { describe, expect, test } from 'bun:test'
import { newAssignmentBlock } from '#/modules/riders/lib/assign-availability'

describe('newAssignmentBlock', () => {
  test('is null when a free rider and a product exist', () => {
    expect(
      newAssignmentBlock({ activeRiders: 2, freeRiders: 1, products: 3 }),
    ).toBeNull()
  })

  test('says there are no active riders', () => {
    expect(
      newAssignmentBlock({ activeRiders: 0, freeRiders: 0, products: 3 }),
    ).toBe('No hay repartidores activos. Da de alta uno en Repartidores.')
  })

  test('says every active rider is on the road', () => {
    expect(
      newAssignmentBlock({ activeRiders: 2, freeRiders: 0, products: 3 }),
    ).toBe(
      'Todos tus repartidores activos están en ruta. Liquida o cancela un reparto para asignar de nuevo.',
    )
  })

  test('says there is no product available', () => {
    expect(
      newAssignmentBlock({ activeRiders: 2, freeRiders: 1, products: 0 }),
    ).toBe('No hay producto disponible en este almacén para repartir.')
  })

  test('rider reason wins when both are missing', () => {
    expect(
      newAssignmentBlock({ activeRiders: 0, freeRiders: 0, products: 0 }),
    ).toContain('repartidores activos')
  })
})
