import { PageHeading } from '#/components/page-heading'
import { NewUserDialog } from '#/modules/access/components/new-user-dialog'
import { UsersSection } from '#/modules/access/components/users-section'
import type { ManagedUser } from '#/modules/access/services/access'
import type { Warehouse } from '#/modules/warehouses/services/warehouses'

type SettingsPageProps = {
  users: Array<ManagedUser>
  warehouses: Array<Warehouse>
}

/** Owner-only; the route redirects everyone else before this renders. */
export function SettingsPage({ users, warehouses }: SettingsPageProps) {
  return (
    <>
      <PageHeading
        title="Configuración"
        description="Quién opera cada almacén."
        actions={<NewUserDialog />}
      />
      <UsersSection users={users} warehouses={warehouses} />
    </>
  )
}
