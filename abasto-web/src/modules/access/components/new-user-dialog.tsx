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
import { newUserProblems } from '#/modules/access/lib/new-user'

const minPasswordLength = 8

export const primaryButtonClass =
  'h-auto min-h-[44px] gap-[9px] rounded-[9px] bg-primary px-[17px] py-2.5 text-sm font-[650] text-brand-ink hover:bg-brand-hover disabled:opacity-45'

export function NewUserDialog() {
  const { createUser, pending } = useUserActions()
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const field = (name: string) => String(form.get(name) ?? '')
    const fields = {
      name: field('name'),
      email: field('email'),
      password: field('password'),
    }
    // Report every missing field at once, before any request.
    const problems = newUserProblems(fields, minPasswordLength)
    if (problems.length) return setError(problems.join(' '))
    setError(null)
    const created = await createUser(fields)
    if (created) setOpen(false)
  }

  function onOpenChange(next: boolean) {
    setOpen(next)
    setError(null)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
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
        <form
          noValidate
          onSubmit={(event) => void submit(event)}
          className="grid gap-4"
        >
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
              minLength={minPasswordLength}
              autoComplete="new-password"
            />
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
            className={primaryButtonClass}
          >
            {pending ? 'Guardando…' : 'Crear usuario'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
