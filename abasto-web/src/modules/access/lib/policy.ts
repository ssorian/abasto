import { AppError } from '#/lib/errors'
import type { UserRole } from '#/db/auth-schema'
import type { WarehouseRole } from '#/modules/access/db/schema'

/** Authenticated user as the permission policy sees them. */
export type Actor = {
  userId: string
  role: UserRole
  /** Warehouse id → role, for staff. The owner needs no assignments. */
  assignments: ReadonlyMap<string, WarehouseRole>
}

/** Company-wide permissions: owner only. */
export type GlobalPermission =
  | 'catalog.manage'
  | 'warehouses.manage'
  | 'users.manage'
  | 'credit.authorize'
  | 'customers.manage'

/** Permissions scoped to one warehouse. */
export type WarehousePermission =
  'warehouse.view' | 'warehouse.operate' | 'warehouse.manage'

export type Permission = GlobalPermission | WarehousePermission

const warehouseGrants: Record<
  WarehouseRole,
  ReadonlySet<WarehousePermission>
> = {
  manager: new Set(['warehouse.view', 'warehouse.operate', 'warehouse.manage']),
  clerk: new Set(['warehouse.view', 'warehouse.operate']),
}

const warehousePermissions: ReadonlySet<Permission> =
  new Set<WarehousePermission>([
    'warehouse.view',
    'warehouse.operate',
    'warehouse.manage',
  ])

const isWarehousePermission = (
  permission: Permission,
): permission is WarehousePermission => warehousePermissions.has(permission)

export function can(
  actor: Actor,
  permission: Permission,
  warehouseId?: string,
): boolean {
  if (actor.role === 'owner') return true
  if (actor.role === 'customer') return false
  if (!isWarehousePermission(permission) || !warehouseId) return false
  const role = actor.assignments.get(warehouseId)
  return role ? warehouseGrants[role].has(permission) : false
}

export function authorize(
  actor: Actor,
  permission: Permission,
  warehouseId?: string,
) {
  if (!can(actor, permission, warehouseId)) {
    throw new AppError('forbidden', 'No tienes permiso para esta acción.')
  }
}
