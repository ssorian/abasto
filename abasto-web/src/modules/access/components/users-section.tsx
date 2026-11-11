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

const head =
  'h-auto bg-[#fcfaf8] px-[11px] py-[13px] text-[11px] font-semibold tracking-[0.35px] text-[#947f86] md:px-3.5 md:py-[15px]'
const cell = 'border-t border-row-border px-[11px] py-[13px] md:px-3.5 md:py-4'

export function UsersSection({ users, warehouses }: UsersSectionProps) {
  const { unassign, pending } = useUserActions()

  return (
    <section aria-labelledby="users-heading">
      <h2 id="users-heading" className="mb-3 text-xl font-[650]">
        Usuarios
      </h2>
      <div className="w-full overflow-x-auto rounded-xl border border-[#f0eae3] bg-white">
        <Table className="text-[13px]">
          <TableHeader>
            <TableRow className="border-0 hover:bg-transparent">
              <TableHead className={head}>Nombre</TableHead>
              <TableHead className={head}>Correo</TableHead>
              <TableHead className={head}>Rol</TableHead>
              <TableHead className={head}>Almacenes</TableHead>
              <TableHead className={head}>
                <span className="sr-only">Acciones</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((member) => (
              <TableRow key={member.id}>
                <TableCell className={`${cell} font-semibold`}>
                  {member.name}
                </TableCell>
                <TableCell className={cell}>{member.email}</TableCell>
                <TableCell className={cell}>
                  {userRoleLabel(member.role)}
                </TableCell>
                <TableCell className={cell}>
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
                            disabled={pending}
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
                <TableCell className={`${cell} text-right`}>
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
