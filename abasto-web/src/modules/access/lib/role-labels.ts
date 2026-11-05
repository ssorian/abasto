import type { UserRole } from '#/db/auth-schema'
import type { WarehouseRole } from '#/modules/access/db/schema'
import type { UserAssignment } from '#/modules/access/services/access'

export const userRoleLabel = (role: UserRole) =>
  role === 'owner' ? 'Dueño' : 'Personal'

export const warehouseRoleLabel = (role: WarehouseRole) =>
  role === 'manager' ? 'Encargado' : 'Mostrador'

export const chipLabel = (assignment: UserAssignment) =>
  `${assignment.warehouseName} · ${warehouseRoleLabel(assignment.role)}`
