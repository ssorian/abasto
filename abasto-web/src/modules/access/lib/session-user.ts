export type SessionUser = {
  name: string
  email: string
  role: 'owner' | 'staff'
  roleLabel: 'Dueño' | 'Personal'
  initials: string
}

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
  const isOwner = row.role === 'owner'
  return {
    name: row.name.trim(),
    email: row.email,
    role: isOwner ? 'owner' : 'staff',
    roleLabel: isOwner ? 'Dueño' : 'Personal',
    initials: initialsOf(row.name),
  }
}
