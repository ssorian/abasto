import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'

import { ClientError, genericErrorMessage, unwrap } from '#/lib/boundary'
import {
  grantStoreAccessFn,
  storeAccessFn,
  storeAccessPasswordFn,
} from '#/modules/store/server/store-access'

const messageOf = (failure: unknown) =>
  failure instanceof ClientError ? failure.message : genericErrorMessage

export type StoreAccessState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; email: string | null }

/** Owner view of a customer's store account: load, grant, change password. */
export function useStoreAccess(customerId: string) {
  const [state, setState] = useState<StoreAccessState>({ status: 'loading' })

  const load = useCallback(async () => {
    try {
      const access = unwrap(await storeAccessFn({ data: { customerId } }))
      setState({ status: 'ready', email: access?.email ?? null })
    } catch (failure) {
      setState({ status: 'error', message: messageOf(failure) })
    }
  }, [customerId])

  useEffect(() => {
    void load()
  }, [load])

  const grant = async (email: string, password: string) => {
    try {
      const granted = unwrap(
        await grantStoreAccessFn({ data: { customerId, email, password } }),
      )
      setState({ status: 'ready', email: granted.email })
      toast.success('Acceso a la tienda creado.')
      return true
    } catch (failure) {
      toast.error(messageOf(failure))
      return false
    }
  }

  const changePassword = async (password: string) => {
    try {
      unwrap(await storeAccessPasswordFn({ data: { customerId, password } }))
      toast.success('Contraseña actualizada. Se cerraron sus sesiones.')
      return true
    } catch (failure) {
      toast.error(messageOf(failure))
      return false
    }
  }

  return { state, grant, changePassword }
}
