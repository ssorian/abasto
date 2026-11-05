import { X } from 'lucide-react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '#/components/ui/table'
import { AssignWarehouseDialog } from '#/modules/access/components/assign-warehouse-dialog'
import { useUserActions } from '#/modules/access/hooks/use-user-actions'
import { chipLabel, userRoleLabel } from '#/modules/access/lib/role-labels'
import type { ManagedUser } from '#/modules/access/services/access'
import type { Warehouse } from '#/modules/warehouses/services/warehouses'

type UsersSectionProps = {
  users: Array<ManagedUser>
  warehouses: Array<Warehouse>
}

export function UsersSection({ users, warehouses }: UsersSectionProps) {
  const { unassign } = useUserActions()

  return (
    <section aria-labelledby="users-heading">
      <h2 id="users-heading" className="mb-3 text-xl font-[650]">
        Usuarios
      </h2>
      <div className="overflow-x-auto rounded-[13px] border border-[#eee7e0] bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Correo</TableHead>
              <TableHead>Rol</TableHead>
              <TableHead>Almacenes</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((member) => (
              <TableRow key={member.id}>
                <TableCell className="font-semibold">{member.name}</TableCell>
                <TableCell>{member.email}</TableCell>
                <TableCell>{userRoleLabel(member.role)}</TableCell>
                <TableCell>
                  {member.role === 'owner' ? (
                    <span className="text-ink-muted">Todos</span>
                  ) : (
                    <div className="flex flex-wrap gap-1.5">
                      {member.assignments.map((assignment) => (
                        <span
                          key={assignment.warehouseId}
                          className="inline-flex items-center gap-1 rounded-full bg-[#f7f1ea] py-1 pr-1.5 pl-3 text-xs font-semibold"
                        >
                          {chipLabel(assignment)}
                          <button
                            type="button"
                            aria-label={`Quitar ${assignment.warehouseName} a ${member.name}`}
                            className="rounded-full p-0.5 hover:bg-[#ded6e4]"
                            onClick={() =>
                              void unassign({
                                userId: member.id,
                                warehouseId: assignment.warehouseId,
                              })
                            }
                          >
                            <X size={13} aria-hidden />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  {member.role === 'owner' ? null : (
                    <AssignWarehouseDialog
                      userId={member.id}
                      userName={member.name}
                      warehouses={warehouses}
                    />
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </section>
  )
}
