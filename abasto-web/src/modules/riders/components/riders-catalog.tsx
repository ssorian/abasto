import { PencilIcon, PlusIcon, UserRoundIcon } from 'lucide-react'

import { StatusBadge } from '#/components/status-badge'
import { ActionButton } from '#/modules/inventory/components/action-button'
import { EmptyPanel } from '#/modules/inventory/components/empty-panel'
import {
  ListBody,
  ListCell,
  ListHead,
  ListPanel,
  ListRow,
  ListTable,
} from '#/modules/inventory/components/list-panel'
import { SectionRow } from '#/modules/inventory/components/section-row'
import { useRiderActions } from '#/modules/riders/hooks/use-rider-actions'
import type { Rider } from '#/modules/riders/services/riders'

type RidersCatalogProps = {
  riders: ReadonlyArray<Rider>
  /** Only users with `warehouse.manage` edit the catalog. */
  canManage: boolean
  onNew: () => void
  onRename: (rider: Rider) => void
}

/** The warehouse's riders: add, rename, activate or deactivate. */
export function RidersCatalog({
  riders,
  canManage,
  onNew,
  onRename,
}: RidersCatalogProps) {
  const actions = useRiderActions()
  return (
    <section aria-label="Repartidores">
      <SectionRow
        title="Repartidores"
        description="Quién puede recibir producto en este almacén. Un repartidor inactivo no recibe repartos nuevos."
        action={
          canManage ? (
            <ActionButton onClick={onNew}>
              <PlusIcon size={19} />
              Nuevo repartidor
            </ActionButton>
          ) : undefined
        }
      />
      {riders.length ? (
        <ListPanel>
          <ListTable>
            <ListHead>{['Nombre', 'Estado', '']}</ListHead>
            <ListBody>
              {riders.map((rider) => (
                <ListRow key={rider.id}>
                  <ListCell>
                    <strong className="text-[#5f4a51]">{rider.name}</strong>
                  </ListCell>
                  <ListCell>
                    <StatusBadge tone={rider.active ? 'green' : 'gray'}>
                      {rider.active ? 'Activo' : 'Inactivo'}
                    </StatusBadge>
                  </ListCell>
                  <ListCell>
                    {canManage && (
                      <span className="flex flex-wrap justify-end gap-2">
                        <ActionButton
                          className="min-h-9 px-3"
                          onClick={() => onRename(rider)}
                        >
                          <PencilIcon size={16} />
                          Renombrar
                        </ActionButton>
                        <ActionButton
                          className="min-h-9 px-3"
                          onClick={() =>
                            void actions.setActive(rider.id, !rider.active)
                          }
                        >
                          {rider.active ? 'Desactivar' : 'Activar'}
                        </ActionButton>
                      </span>
                    )}
                  </ListCell>
                </ListRow>
              ))}
            </ListBody>
          </ListTable>
        </ListPanel>
      ) : (
        <EmptyPanel
          icon={UserRoundIcon}
          title="Aún no hay repartidores"
          description={
            canManage
              ? 'Agrega a quien reparte para poder asignarle producto.'
              : 'Pide al encargado del almacén que agregue a los repartidores.'
          }
        />
      )}
    </section>
  )
}
