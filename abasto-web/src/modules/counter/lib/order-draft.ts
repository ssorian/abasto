import type { Parsed } from '#/modules/inventory/lib/parsed'

/** Quantity stays text while the user types. */
export type DraftLine = { presentationId: string; quantity: string }

export type OrderDraft = {
  warehouseId: string
  customerId: string
  notes: string
  lines: Array<DraftLine>
}

export type OrderInput = {
  warehouseId: string
  customerId: string
  notes: string
  lines: Array<{ presentationId: string; quantity: number }>
}

const INT4_MAX = 2147483647

/** One line per presentation: adding it again keeps the existing line. */
export const addLine = (lines: Array<DraftLine>, presentationId: string) =>
  lines.some((line) => line.presentationId === presentationId)
    ? lines
    : [...lines, { presentationId, quantity: '1' }]

export const setLineQuantity = (
  lines: Array<DraftLine>,
  presentationId: string,
  quantity: string,
) =>
  lines.map((line) =>
    line.presentationId === presentationId ? { ...line, quantity } : line,
  )

export const removeLine = (lines: Array<DraftLine>, presentationId: string) =>
  lines.filter((line) => line.presentationId !== presentationId)

/** Whole presentations only: digits, at least 1, within int4. */
export const parseQuantity = (text: string): number | null => {
  const clean = text.trim()
  if (!/^\d+$/.test(clean)) return null
  const value = Number(clean)
  return value >= 1 && value <= INT4_MAX ? value : null
}

const fail = (message: string): Parsed<never> => ({ ok: false, message })

export function draftToOrderInput(draft: OrderDraft): Parsed<OrderInput> {
  if (!draft.warehouseId) return fail('Elige un almacén.')
  if (!draft.customerId) return fail('Elige un cliente.')
  if (!draft.lines.length) return fail('Agrega al menos un producto al pedido.')
  const lines: OrderInput['lines'] = []
  for (const line of draft.lines) {
    const quantity = parseQuantity(line.quantity)
    if (quantity === null) {
      return fail(
        'La cantidad de cada producto debe ser un entero mayor que cero.',
      )
    }
    lines.push({ presentationId: line.presentationId, quantity })
  }
  return {
    ok: true,
    value: {
      warehouseId: draft.warehouseId,
      customerId: draft.customerId,
      notes: draft.notes.trim(),
      lines,
    },
  }
}
