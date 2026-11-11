type Field = HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement

/** Spanish text for the first native constraint a field violates, or ''. */
export function spanishValidationMessage(field: Field): string {
  const { validity } = field
  if (validity.valid) return ''
  if (validity.valueMissing) {
    return field instanceof HTMLSelectElement
      ? 'Elige una opción.'
      : 'Completa este campo.'
  }
  if (validity.typeMismatch) {
    return field instanceof HTMLInputElement && field.type === 'url'
      ? 'Escribe una dirección web válida.'
      : 'Escribe un correo válido.'
  }
  if (validity.tooShort) {
    return `Escribe al menos ${field.getAttribute('minlength')} caracteres.`
  }
  if (validity.tooLong) {
    return `Escribe como máximo ${field.getAttribute('maxlength')} caracteres.`
  }
  if (validity.rangeUnderflow) {
    return `El valor debe ser como mínimo ${field.getAttribute('min')}.`
  }
  if (validity.rangeOverflow) {
    return `El valor debe ser como máximo ${field.getAttribute('max')}.`
  }
  if (validity.stepMismatch) {
    const step = field.getAttribute('step')
    return step
      ? `Escribe un valor válido; debe avanzar de ${step} en ${step}.`
      : 'Escribe un valor válido.'
  }
  if (validity.badInput) return 'Escribe un valor válido.'
  if (validity.patternMismatch) return 'El formato no es válido.'
  return ''
}

/** `onInvalid` handler: replaces the browser's English bubble with Spanish. */
export function applySpanishValidity(event: { target: EventTarget }) {
  const field = event.target as Field
  field.setCustomValidity('')
  field.setCustomValidity(spanishValidationMessage(field))
}

/** `onInput` handler: clears the custom message so the field can revalidate. */
export function clearSpanishValidity(event: { target: EventTarget }) {
  ;(event.target as Field).setCustomValidity('')
}
