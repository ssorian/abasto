import { CopyIcon, EyeIcon, EyeOffIcon, KeyRoundIcon } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

import { CustomerButton } from '#/modules/customers/components/customer-button'
import { Field, TextInput } from '#/modules/customers/forms/form-field'
import {
  accessText,
  storeAccessProblems,
} from '#/modules/customers/lib/store-access-text'
import { generateStorePassword } from '#/modules/customers/lib/store-password'
import { useStoreAccess } from '#/modules/store/hooks/use-store-access'

import type { FormEvent } from 'react'

type Issued = { email: string; password: string }

/**
 * Owner-only block in the customer detail: creates the customer's store
 * account (there is no sign-up) or sets a new password, then shows the
 * credentials once so the owner can send them.
 */
export function StoreAccessPanel({ customerId }: { customerId: string }) {
  const { state, grant, changePassword } = useStoreAccess(customerId)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [visible, setVisible] = useState(false)
  const [problems, setProblems] = useState<Array<string>>([])
  const [busy, setBusy] = useState(false)
  const [issued, setIssued] = useState<Issued>()

  if (state.status === 'loading') {
    return <p className="text-[13px] text-[#91757e]">Cargando acceso…</p>
  }
  if (state.status === 'error') {
    return <p className="text-[13px] text-[#a1372e]">{state.message}</p>
  }

  const current = state.email
  const hasAccess = current !== null

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    const found = storeAccessProblems({ email, password }, !hasAccess)
    setProblems(found)
    if (found.length) return
    setBusy(true)
    const done = hasAccess
      ? await changePassword(password)
      : await grant(email.trim(), password)
    setBusy(false)
    if (!done) return
    setIssued({ email: hasAccess ? current : email.trim(), password })
    setPassword('')
    setEmail('')
    setVisible(false)
  }

  const copy = async (shown: Issued) => {
    try {
      await navigator.clipboard.writeText(
        accessText(shown.email, shown.password),
      )
      toast.success('Datos de acceso copiados.')
    } catch {
      toast.error('No se pudo copiar. Selecciona el texto y cópialo.')
    }
  }

  return (
    <div className="grid gap-3">
      {issued && (
        <div
          role="status"
          className="grid gap-2 rounded-[10px] border border-[#cfe3d2] bg-[#f3faf4] px-[18px] py-4 text-[13px] text-[#2f4a36]"
        >
          <strong>Entrégale estos datos al cliente</strong>
          <p>
            Correo: <span className="font-mono">{issued.email}</span>
          </p>
          <p>
            Contraseña: <span className="font-mono">{issued.password}</span>
          </p>
          <p className="text-[#5d7a64]">
            La contraseña se muestra sólo ahora; después no se puede consultar.
          </p>
          <div className="flex flex-wrap gap-3">
            <CustomerButton onClick={() => void copy(issued)}>
              <CopyIcon className="size-4" />
              Copiar datos de acceso
            </CustomerButton>
            <CustomerButton onClick={() => setIssued(undefined)}>
              Listo
            </CustomerButton>
          </div>
        </div>
      )}
      <form noValidate className="grid gap-3" onSubmit={submit}>
        <p className="text-[13px] text-[#91757e]">
          {hasAccess
            ? `Entra a la tienda con ${current}.`
            : 'Sin acceso: crea su cuenta y entrégale el correo y la contraseña.'}
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          {!hasAccess && (
            <Field label="Correo">
              <TextInput
                type="email"
                autoComplete="off"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </Field>
          )}
          <Field label={hasAccess ? 'Nueva contraseña' : 'Contraseña'}>
            <div className="flex gap-2">
              <TextInput
                type={visible ? 'text' : 'password'}
                autoComplete="new-password"
                className="min-w-0 flex-1"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
              <button
                type="button"
                aria-label={
                  visible ? 'Ocultar contraseña' : 'Mostrar contraseña'
                }
                aria-pressed={visible}
                className="inline-flex size-[43px] shrink-0 items-center justify-center rounded-lg border border-[#e8e1e3] bg-white text-[#826c73] hover:bg-[#faf6f1]"
                onClick={() => setVisible((shown) => !shown)}
              >
                {visible ? (
                  <EyeOffIcon className="size-4" />
                ) : (
                  <EyeIcon className="size-4" />
                )}
              </button>
            </div>
          </Field>
        </div>
        {problems.length > 0 && (
          <p role="alert" className="text-[13px] text-[#a1372e]">
            {problems.join(' ')}
          </p>
        )}
        <div className="flex flex-wrap gap-3">
          <CustomerButton
            type="button"
            onClick={() => {
              setPassword(generateStorePassword())
              setVisible(true)
              setProblems([])
            }}
          >
            <KeyRoundIcon className="size-4" />
            Generar contraseña
          </CustomerButton>
          <CustomerButton type="submit" tone="primary" disabled={busy}>
            {hasAccess ? 'Cambiar contraseña' : 'Dar acceso a la tienda'}
          </CustomerButton>
        </div>
      </form>
    </div>
  )
}
