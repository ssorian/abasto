import type { LossCategory } from '#/modules/inventory/db/schema'

export const lossCategoryOptions: ReadonlyArray<{
  value: LossCategory
  label: string
}> = [
  { value: 'caducado', label: 'Caducado' },
  { value: 'dañado', label: 'Dañado' },
  { value: 'otro', label: 'Otro' },
]

export const lossCategoryValues = [
  'caducado',
  'dañado',
  'otro',
] as const satisfies ReadonlyArray<LossCategory>
