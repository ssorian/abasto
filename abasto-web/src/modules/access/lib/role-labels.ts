import type { UserRole } from '#/db/auth-schema'
import type { WarehouseRole } from '#/modules/access/db/schema'
import type { UserAssignment } from '#/modules/access/services/access'

const userRoleLabels: Record<UserRole, string> = {
  owner: 'Dueño',
  staff: 'Encargado',
  customer: 'Cliente',
}

export const userRoleLabel = (role: UserRole) => userRoleLabels[role]

const warehouseRoleLabels: Record<WarehouseRole, string> = {
  manager: 'Encargado',
}

export const warehouseRoleLabel = (role: WarehouseRole) =>
  warehouseRoleLabels[role]

/** The chip is the warehouse name; the role already lives in the Rol column. */
export const chipLabel = (assignment: UserAssignment) =>
  assignment.warehouseName
