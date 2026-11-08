/** Whole boxes and loose units of a quantity in base units. */
export function splitBoxes(baseUnits: number, boxFactor: number) {
  if (boxFactor <= 1) return { boxes: 0, units: baseUnits }
  return {
    boxes: Math.floor(baseUnits / boxFactor),
    units: baseUnits % boxFactor,
  }
}

/** "41 cajas y 8 unidades", "1 caja", "5 unidades". */
export function describeQuantity(baseUnits: number, boxFactor: number) {
  const { boxes, units } = splitBoxes(baseUnits, boxFactor)
  const parts = [
    ...(boxes > 0 ? [`${boxes} ${boxes === 1 ? 'caja' : 'cajas'}`] : []),
    ...(units > 0 || boxes === 0
      ? [`${units} ${units === 1 ? 'unidad' : 'unidades'}`]
      : []),
  ]
  return parts.join(' y ')
}
