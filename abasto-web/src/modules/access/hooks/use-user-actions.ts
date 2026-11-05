import { useRouter } from '@tanstack/react-router'
import { toast } from 'sonner'
import { ClientError, genericErrorMessage, unwrap } from '#/lib/boundary'
import type { Result } from '#/lib/boundary'
import {
  assignWarehouseFn,
  createStaffUserFn,
  unassignWarehouseFn,
} from '#/modules/access/server/users'

/**
 * Write actions of Configuración › Usuarios. Each resolves to whether it
 * succeeded; AppError messages are shown as toasts and the list is reloaded.
 */
export function useUserActions() {
  const router = useRouter()

  async function run(action: () => Promise<Result<unknown>>, success: string) {
    try {
      unwrap(await action())
      await router.invalidate()
      toast.success(success)
      return true
    } catch (failure) {
      toast.error(
        failure instanceof ClientError ? failure.message : genericErrorMessage,
      )
      return false
    }
  }

  return {
    createUser: (data: Parameters<typeof createStaffUserFn>[0]['data']) =>
      run(() => createStaffUserFn({ data }), 'Usuario creado.'),
    assign: (data: Parameters<typeof assignWarehouseFn>[0]['data']) =>
      run(() => assignWarehouseFn({ data }), 'Asignación guardada.'),
    unassign: (data: Parameters<typeof unassignWarehouseFn>[0]['data']) =>
      run(() => unassignWarehouseFn({ data }), 'Asignación quitada.'),
  }
}
