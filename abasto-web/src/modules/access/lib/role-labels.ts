import type { UserRole } from '#/db/auth-schema'
import type { WarehouseRole } from '#/modules/access/db/schema'
import type { UserAssignment } from '#/modules/access/services/access'

const userRoleLabels: Record<UserRole, string> = {
  owner: 'Dueño',
  staff: 'Personal',
  customer: 'Cliente',
}

export const userRoleLabel = (role: UserRole) => userRoleLabels[role]

export const warehouseRoleLabel = (role: WarehouseRole) =>
  role === 'manager' ? 'Encargado' : 'Mostrador'

export const chipLabel = (assignment: UserAssignment) =>
  `${assignment.warehouseName} · ${warehouseRoleLabel(assignment.role)}`
