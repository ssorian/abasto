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
import { useUserActions } from '#/modules/access/hooks/use-user-actions'

export const primaryButtonClass =
  'h-auto min-h-[44px] gap-[9px] rounded-[9px] bg-primary px-[17px] py-2.5 text-sm font-[650] text-brand-ink hover:bg-brand-hover disabled:opacity-45'

export function NewUserDialog() {
  const { createUser } = useUserActions()
  const [open, setOpen] = useState(false)
  const [pending, setPending] = useState(false)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const field = (name: string) => String(form.get(name) ?? '')
    setPending(true)
    const created = await createUser({
      name: field('name'),
      email: field('email'),
      password: field('password'),
    })
    setPending(false)
    if (created) setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" className={primaryButtonClass}>
          <Plus size={17} aria-hidden />
          Nuevo usuario
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-[calc(100vw-24px)] rounded-2xl bg-white p-[23px] md:max-w-[430px] md:p-[29px]">
        <DialogHeader>
          <DialogTitle>Nuevo usuario</DialogTitle>
          <DialogDescription>
            Crea la cuenta y después asígnale los almacenes que operará.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={(event) => void submit(event)} className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="user-name">Nombre</Label>
            <Input id="user-name" name="name" autoComplete="off" />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="user-email">Correo</Label>
            <Input
              id="user-email"
              name="email"
              type="email"
              autoComplete="off"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="user-password">Contraseña inicial</Label>
            <Input
              id="user-password"
              name="password"
              type="password"
              minLength={8}
              autoComplete="new-password"
            />
          </div>
          <Button
            type="submit"
            variant="ghost"
            disabled={pending}
            className={primaryButtonClass}
          >
            {pending ? 'Guardando…' : 'Crear usuario'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
