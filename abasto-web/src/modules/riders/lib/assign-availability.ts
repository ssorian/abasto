type AssignAvailability = {
  /** Active riders in the catalog. */
  activeRiders: number
  /** Active riders without an assignment on the road. */
  freeRiders: number
  /** Products with free stock to hand out. */
  products: number
}

/** Why "Nuevo reparto" cannot be used right now, or null when it can. */
export function newAssignmentBlock({
  activeRiders,
  freeRiders,
  products,
}: AssignAvailability): string | null {
  if (activeRiders === 0) {
    return 'No hay repartidores activos. Da de alta uno en Repartidores.'
  }
  if (freeRiders === 0) {
    return 'Todos tus repartidores activos están en ruta. Liquida o cancela un reparto para asignar de nuevo.'
  }
  if (products === 0) {
    return 'No hay producto disponible en este almacén para repartir.'
  }
  return null
}
