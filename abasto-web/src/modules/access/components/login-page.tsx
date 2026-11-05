import { useRouter } from '@tanstack/react-router'
import { useState } from 'react'
import type { FormEvent } from 'react'

import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import { emailSchema } from '#/lib/boundary'
import { authClient } from '#/lib/auth-client'
import { workspace } from '#/config/workspace'

const fallbackError = 'No pudimos iniciar sesión. Intenta de nuevo.'

/** Better Auth answers in English; its credential failure gets Spanish copy. */
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

export function LoginPage({ redirectTo }: { redirectTo: string }) {
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
    <main className="grid min-h-dvh place-items-center bg-background px-4 py-10">
      <form
        onSubmit={(event) => void submit(event)}
        noValidate
        className="w-full max-w-[400px] rounded-2xl border border-[#eee7e0] bg-white p-7"
      >
        <span className="block text-xs font-bold tracking-[1.5px] text-ink-eyebrow">
          {workspace.appName.toUpperCase()}
        </span>
        <h1 className="mt-1.5 text-[28px] font-bold tracking-[-1px]">
          Inicia sesión
        </h1>
        <p className="mt-1.5 text-sm text-ink-muted">
          Entra con la cuenta que te dio el dueño del almacén.
        </p>

        <div className="mt-6 grid gap-2">
          <Label htmlFor="email">Correo</Label>
          <Input id="email" name="email" type="email" autoComplete="username" />
        </div>
        <div className="mt-4 grid gap-2">
          <Label htmlFor="password">Contraseña</Label>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
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
          className="mt-6 h-auto min-h-[44px] w-full rounded-[9px] bg-primary text-sm font-[650] text-brand-ink hover:bg-brand-hover disabled:opacity-45"
        >
          {pending ? 'Entrando…' : 'Entrar'}
        </Button>
      </form>
    </main>
  )
}
