import { PageHeading } from '#/components/page-heading'
import { NewUserDialog } from '#/modules/access/components/new-user-dialog'
import { UsersSection } from '#/modules/access/components/users-section'
import type { ManagedUser } from '#/modules/access/services/access'
import type { Warehouse } from '#/modules/warehouses/services/warehouses'

type SettingsPageProps =
  | { allowed: false }
  | { allowed: true; users: Array<ManagedUser>; warehouses: Array<Warehouse> }

export function SettingsPage(props: SettingsPageProps) {
  if (!props.allowed) {
    return (
      <p className="text-sm text-ink-muted">
        No tienes permiso para esta acción.
      </p>
    )
  }
  return (
    <>
      <PageHeading
        title="Configuración"
        description="Quién opera cada almacén."
        actions={<NewUserDialog />}
      />
      <UsersSection users={props.users} warehouses={props.warehouses} />
    </>
  )
}
