import { useRouter } from '@tanstack/react-router'
import { Plus } from 'lucide-react'
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
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import { ClientError, genericErrorMessage, unwrap } from '#/lib/boundary'
import { createWarehouseFn } from '#/modules/warehouses/server/warehouses'

const buttonClass =
  'h-auto min-h-[44px] gap-[9px] rounded-[9px] bg-primary px-[17px] py-2.5 text-sm font-[650] text-brand-ink hover:bg-brand-hover disabled:opacity-45'

export function CreateWarehouseDialog() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  function onOpenChange(next: boolean) {
    setOpen(next)
    setError(null)
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const name = String(new FormData(event.currentTarget).get('name') ?? '')
    setPending(true)
    setError(null)
    try {
      unwrap(await createWarehouseFn({ data: { name } }))
      await router.invalidate()
      setOpen(false)
    } catch (failure) {
      setError(
        failure instanceof ClientError ? failure.message : genericErrorMessage,
      )
    } finally {
      setPending(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button variant="ghost" className={buttonClass}>
          <Plus size={17} aria-hidden />
          Nuevo almacén
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-[calc(100vw-24px)] rounded-2xl bg-white p-[23px] md:max-w-[430px] md:p-[29px]">
        <DialogHeader>
          <DialogTitle>Nuevo almacén</DialogTitle>
          <DialogDescription>
            Escribe el nombre con el que lo reconocerá tu equipo.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={(event) => void submit(event)} className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="warehouse-name">Nombre</Label>
            <Input id="warehouse-name" name="name" autoComplete="off" />
          </div>
          {error ? (
            <p role="alert" className="text-sm text-red-700">
              {error}
            </p>
          ) : null}
          <Button
            type="submit"
            variant="ghost"
            disabled={pending}
            className={buttonClass}
          >
            {pending ? 'Guardando…' : 'Crear almacén'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
