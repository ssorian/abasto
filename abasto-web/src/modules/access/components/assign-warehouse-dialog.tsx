import { useState } from 'react'
import type { FormEvent } from 'react'
import { Button } from '#/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '#/components/ui/dialog'
import { Label } from '#/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '#/components/ui/select'
import { primaryButtonClass } from '#/modules/access/components/new-user-dialog'
import { useUserActions } from '#/modules/access/hooks/use-user-actions'
import { warehouseRoleLabel } from '#/modules/access/lib/role-labels'
import { warehouseRoles } from '#/modules/access/db/schema'
import type { WarehouseRole } from '#/modules/access/db/schema'
import type { Warehouse } from '#/modules/warehouses/services/warehouses'

type AssignWarehouseDialogProps = {
  userId: string
  userName: string
  warehouses: Array<Warehouse>
}

export function AssignWarehouseDialog({
  userId,
  userName,
  warehouses,
}: AssignWarehouseDialogProps) {
  const { assign } = useUserActions()
  const [open, setOpen] = useState(false)
  const [pending, setPending] = useState(false)
  const [warehouseId, setWarehouseId] = useState('')
  const [role, setRole] = useState<WarehouseRole>('clerk')

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setPending(true)
    const saved = await assign({ userId, warehouseId, role })
    setPending(false)
    if (saved) setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          disabled={!warehouses.length}
          className="h-auto min-h-[36px] rounded-lg border border-[#eee7e0] px-3 py-1.5 text-[13px] font-semibold"
        >
          Asignar almacén
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-[calc(100vw-24px)] rounded-2xl bg-white p-[23px] md:max-w-[430px] md:p-[29px]">
        <DialogHeader>
          <DialogTitle>Asignar almacén</DialogTitle>
          <DialogDescription>
            {userName}. Si ya tiene ese almacén, se cambia su rol.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={(event) => void submit(event)} className="grid gap-4">
          <div className="grid gap-2">
            <Label>Almacén</Label>
            <Select value={warehouseId} onValueChange={setWarehouseId}>
              <SelectTrigger aria-label="Almacén">
                <SelectValue placeholder="Elige un almacén" />
              </SelectTrigger>
              <SelectContent>
                {warehouses.map((warehouse) => (
                  <SelectItem key={warehouse.id} value={warehouse.id}>
                    {warehouse.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label>Rol</Label>
            <Select
              value={role}
              onValueChange={(value) => setRole(value as WarehouseRole)}
            >
              <SelectTrigger aria-label="Rol">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {warehouseRoles.map((value) => (
                  <SelectItem key={value} value={value}>
                    {warehouseRoleLabel(value)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button
            type="submit"
            variant="ghost"
            disabled={pending || !warehouseId}
            className={primaryButtonClass}
          >
            {pending ? 'Guardando…' : 'Guardar asignación'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
