import { Link, useRouter } from '@tanstack/react-router'
import { EyeIcon, EyeOffIcon } from 'lucide-react'
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
  const [showPassword, setShowPassword] = useState(false)

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
        className="st-door"
      >
        <div className="bg-st-plum-tint px-6 py-6">
          <h1 className="text-[26px] leading-tight font-bold text-st-plum-ink">
            Entra para apartar
          </h1>
        </div>
        <div className="p-6 pt-5">
          <p className="text-[15px] leading-snug text-st-muted">
            Tu cuenta te la da el almacén; aquí no hay registro. Si aún no
            tienes una, pídela cuando pases por tu pedido.
          </p>

          <div className="mt-6 grid gap-2">
            <label htmlFor="email" className="st-card">
              Correo
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="username"
              className="st-field"
            />
          </div>
          <div className="mt-4 grid gap-2">
            <label htmlFor="password" className="st-card">
              Contraseña
            </label>
            <div className="relative">
              <input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                className="st-field pr-12"
              />
              <button
                type="button"
                aria-label={
                  showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'
                }
                aria-pressed={showPassword}
                onClick={() => setShowPassword((shown) => !shown)}
                className="absolute inset-y-0 right-0 grid w-11 place-items-center text-st-ink-soft hover:text-st-ink"
              >
                {showPassword ? (
                  <EyeOffIcon className="size-5" aria-hidden />
                ) : (
                  <EyeIcon className="size-5" aria-hidden />
                )}
              </button>
            </div>
          </div>

          {error ? (
            <p
              role="alert"
              className="mt-4 rounded-xl border border-st-danger/30 bg-st-danger-tint p-3 text-sm font-medium text-st-danger"
            >
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={pending}
            className="st-btn mt-6 w-full"
          >
            {pending ? 'Entrando…' : 'Entrar'}
          </button>
        </div>
      </form>
      <Link
        to="/tienda"
        search={{}}
        className="st-btn st-btn--quiet justify-self-center"
      >
        Seguir viendo el catálogo
      </Link>
    </div>
  )
}
