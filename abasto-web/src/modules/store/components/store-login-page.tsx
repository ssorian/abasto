import { Link, useRouter } from '@tanstack/react-router'
import { useState } from 'react'
import type { FormEvent } from 'react'

import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import { workspace } from '#/config/workspace'
import { authClient } from '#/lib/auth-client'
import { emailSchema } from '#/lib/boundary'

const fallbackError = 'No pudimos iniciar sesión. Intenta de nuevo.'

/** Better Auth answers in English: show Spanish copy for known failures only. */
const messageFor = (error: { code?: string; status?: number }) => {
  if (error.code === 'INVALID_EMAIL_OR_PASSWORD') {
    return 'Correo o contraseña incorrectos.'
  }
  if (error.status === 429) {
    return 'Demasiados intentos. Espera un momento e intenta de nuevo.'
  }
  return fallbackError
}

export function StoreLoginPage({ redirectTo }: { redirectTo: string }) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const email = emailSchema.safeParse(String(form.get('email') ?? '').trim())
    const password = String(form.get('password') ?? '')
    if (!email.success) return setError(email.error.issues[0].message)
    if (!password) return setError('Escribe tu contraseña.')

    setPending(true)
    setError(null)
    try {
      const { error: failure } = await authClient.signIn.email({
        email: email.data,
        password,
      })
      if (failure) return setError(messageFor(failure))
      await router.invalidate()
      router.history.push(redirectTo)
    } catch {
      setError(fallbackError)
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="mx-auto grid max-w-md gap-4 py-4">
      <form
        onSubmit={(event) => void submit(event)}
        noValidate
        className="rounded-2xl border border-panel-border bg-white p-6 shadow-[0_8px_24px_-12px_rgba(91,42,134,0.18)]"
      >
        <span className="block text-xs font-bold tracking-[1.5px] text-ink-eyebrow">
          {workspace.business.name.toUpperCase()}
        </span>
        <h1 className="mt-1.5 text-[28px] font-bold tracking-[-1px] text-ink-heading">
          Entra para apartar
        </h1>
        <p className="mt-1.5 text-sm text-ink-muted">
          Tu cuenta te la da el almacén; aquí no hay registro. Si aún no tienes
          una, pídela cuando pases por tu pedido.
        </p>

        <div className="mt-6 grid gap-2">
          <Label htmlFor="email">Correo</Label>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="username"
            className="h-12 rounded-xl text-base"
          />
        </div>
        <div className="mt-4 grid gap-2">
          <Label htmlFor="password">Contraseña</Label>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            className="h-12 rounded-xl text-base"
          />
        </div>

        {error ? (
          <p role="alert" className="mt-4 text-sm text-red-700">
            {error}
          </p>
        ) : null}

        <Button
          type="submit"
          disabled={pending}
          className="mt-6 h-12 w-full rounded-xl bg-primary text-base font-semibold text-brand-ink hover:bg-brand-hover disabled:opacity-45"
        >
          {pending ? 'Entrando…' : 'Entrar'}
        </Button>
      </form>
      <Link
        to="/tienda"
        search={{}}
        className="min-h-11 text-center text-sm font-semibold text-ink-link underline-offset-4 hover:underline"
      >
        Seguir viendo el catálogo
      </Link>
    </div>
  )
}
