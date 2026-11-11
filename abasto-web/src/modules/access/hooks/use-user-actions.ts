import { useActionRunner } from '#/hooks/use-action-runner'
import {
  assignWarehouseFn,
  createStaffUserFn,
  unassignWarehouseFn,
} from '#/modules/access/server/users'

type AssignInput = Parameters<typeof assignWarehouseFn>[0]['data']

/**
 * Write actions of Configuración › Usuarios. Each resolves to `{ data }` on
 * success (the list is reloaded and a toast shown) or to `undefined` after
 * showing the server message as a toast. `pending` is true while one runs.
 */
export function useUserActions() {
  const run = useActionRunner()
  return {
    pending: run.pending,
    createUser: (data: Parameters<typeof createStaffUserFn>[0]['data']) =>
      run(() => createStaffUserFn({ data }), 'Usuario creado.'),
    /** New staff are always Encargado of the warehouse they are given. */
    assign: (data: Omit<AssignInput, 'role'>) =>
      run(
        () => assignWarehouseFn({ data: { ...data, role: 'manager' } }),
        'Almacén asignado.',
      ),
    unassign: (data: Parameters<typeof unassignWarehouseFn>[0]['data']) =>
      run(() => unassignWarehouseFn({ data }), 'Almacén quitado del usuario.'),
  }
}
