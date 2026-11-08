import { useState } from 'react'

import { CustomerButton } from '#/modules/customers/components/customer-button'
import { Field, TextInput } from '#/modules/customers/forms/form-field'
import { useStoreAccess } from '#/modules/store/hooks/use-store-access'

import type { FormEvent } from 'react'

/**
 * Owner-only block in the customer detail: creates the customer's store
 * account (there is no sign-up) or sets a new password for it.
 */
export function StoreAccessSection({ customerId }: { customerId: string }) {
  const { state, grant, changePassword } = useStoreAccess(customerId)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)

  if (state.status === 'loading') {
    return <p className="text-[13px] text-[#91757e]">Cargando acceso…</p>
  }
  if (state.status === 'error') {
    return <p className="text-[13px] text-[#a1372e]">{state.message}</p>
  }

  const hasAccess = state.email !== null
  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setBusy(true)
    const done = hasAccess
      ? await changePassword(password)
      : await grant(email, password)
    setBusy(false)
    if (done) setPassword('')
  }

  return (
    <form className="grid gap-3" onSubmit={submit}>
      <p className="text-[13px] text-[#91757e]">
        {hasAccess
          ? `Entra a la tienda con ${state.email}.`
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
              required
            />
          </Field>
        )}
        <Field label={hasAccess ? 'Nueva contraseña' : 'Contraseña'}>
          <TextInput
            type="text"
            autoComplete="new-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
        </Field>
      </div>
      <CustomerButton
        type="submit"
        disabled={busy}
        className="justify-self-start"
      >
        {hasAccess ? 'Cambiar contraseña' : 'Dar acceso a la tienda'}
      </CustomerButton>
    </form>
  )
}
