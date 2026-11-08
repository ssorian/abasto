export type SessionUser = {
  name: string
  email: string
  role: 'owner' | 'staff' | 'customer'
  roleLabel: 'Dueño' | 'Personal' | 'Cliente'
  initials: string
}

const roleLabels = {
  owner: 'Dueño',
  staff: 'Personal',
  customer: 'Cliente',
} as const

const initialsOf = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word.charAt(0).toUpperCase())
    .join('')

export function toSessionUser(row: {
  name: string
  email: string
  role: string
}): SessionUser {
  const role =
    row.role === 'owner' || row.role === 'customer' ? row.role : 'staff'
  return {
    name: row.name.trim(),
    email: row.email,
    role,
    roleLabel: roleLabels[role],
    initials: initialsOf(row.name),
  }
}
