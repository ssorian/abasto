import { Link, useRouter } from '@tanstack/react-router'
import { useState } from 'react'
import type { FormEvent } from 'react'

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
    <div className="mx-auto grid max-w-md gap-4 py-4 lg:py-10">
      <form
        onSubmit={(event) => void submit(event)}
        noValidate
        className="rb-door"
      >
        <span aria-hidden className="rb-screw top-2.5 left-2.5" />
        <span aria-hidden className="rb-screw top-2.5 right-2.5" />
        <div className="rb-plate border-x-0 border-t-0 px-8 py-5">
          <h1 className="rb-stencil text-[34px] leading-none">
            Entra para apartar
          </h1>
        </div>
        <div className="p-6 pt-5">
          <p className="text-[15px] leading-snug text-rb-muted">
            Tu cuenta te la da el almacén; aquí no hay registro. Si aún no
            tienes una, pídela cuando pases por tu pedido.
          </p>

          <div className="mt-6 grid gap-2">
            <label htmlFor="email" className="rb-label">
              Correo
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="username"
              className="rb-field"
            />
          </div>
          <div className="mt-4 grid gap-2">
            <label htmlFor="password" className="rb-label">
              Contraseña
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              className="rb-field"
            />
          </div>

          {error ? (
            <p
              role="alert"
              className="mt-4 border-2 border-rb-beam-text bg-[#f6e3da] p-2.5 text-sm font-medium text-rb-beam-text"
            >
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={pending}
            className="rb-btn mt-6 w-full"
          >
            {pending ? 'Entrando…' : 'Entrar'}
          </button>
        </div>
        <span aria-hidden className="rb-screw bottom-2.5 left-2.5" />
        <span aria-hidden className="rb-screw right-2.5 bottom-2.5" />
      </form>
      <Link
        to="/tienda"
        search={{}}
        className="rb-btn rb-btn--quiet justify-self-center"
      >
        Seguir viendo el catálogo
      </Link>
    </div>
  )
}
