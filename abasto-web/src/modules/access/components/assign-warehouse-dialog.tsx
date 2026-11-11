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
  const { assign, pending } = useUserActions()
  const [open, setOpen] = useState(false)
  const [warehouseId, setWarehouseId] = useState('')

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const saved = await assign({ userId, warehouseId })
    if (saved) {
      setOpen(false)
      setWarehouseId('')
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          disabled={!warehouses.length}
          className="h-auto min-h-[44px] rounded-[9px] border border-[#e8e1e3] bg-white px-[17px] py-2.5 text-sm font-[650] text-[#503f45] hover:bg-[#faf6f1]"
        >
          Asignar almacén
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-[calc(100vw-24px)] rounded-2xl bg-white p-[23px] md:max-w-[430px] md:p-[29px]">
        <DialogHeader>
          <DialogTitle>Asignar almacén</DialogTitle>
          <DialogDescription>
            {userName} quedará como encargado del almacén que elijas.
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
