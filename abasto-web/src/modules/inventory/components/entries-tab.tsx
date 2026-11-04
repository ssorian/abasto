import { ArrowUpRightIcon, PlusIcon } from 'lucide-react'

import {
  ActionButton,
  IconButton,
  TextLink,
} from '#/modules/inventory/components/action-button'
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
import { dateLabel, timeLabel } from '#/modules/inventory/lib/format'

import type { Entry, WarehouseScope } from '#/modules/inventory/types/inventory'

type EntriesTabProps = {
  entries: ReadonlyArray<Entry>
  warehouse: WarehouseScope
  onSelect: (entry: Entry) => void
  onNew: () => void
}

export function EntriesTab({
  entries,
  warehouse,
  onSelect,
  onNew,
}: EntriesTabProps) {
  const rows = entries.filter(
    (entry) => warehouse === 'Todos' || entry.warehouse === warehouse,
  )

  return (
    <>
      <SectionRow
        title="Mercancía recibida"
        description={`Entradas registradas en ${warehouse === 'Todos' ? 'todos los almacenes' : `Almacén ${warehouse}`}.`}
      />
      <ListPanel>
        {rows.length ? (
          <ListTable>
            <ListHead>
              {['Entrada', 'Referencia', 'Almacén', 'Productos', 'Fecha', '']}
            </ListHead>
            <ListBody>
              {rows.map((entry) => (
                <ListRow key={entry.id}>
                  <ListCell>
                    <TextLink onClick={() => onSelect(entry)}>
                      {entry.id}
                    </TextLink>
                  </ListCell>
                  <ListCell>{entry.reference || 'Sin referencia'}</ListCell>
                  <ListCell>{entry.warehouse}</ListCell>
                  <ListCell>
                    {entry.lines.length}{' '}
                    {entry.lines.length === 1 ? 'producto' : 'productos'}
                  </ListCell>
                  <ListCell>
                    {dateLabel(entry.date)}
                    <small className="block text-[#788596]">
                      {timeLabel(entry.date)}
                    </small>
                  </ListCell>
                  <ListCell>
                    <IconButton
                      aria-label={`Ver entrada ${entry.id}`}
                      onClick={() => onSelect(entry)}
                    >
                      <ArrowUpRightIcon size={18} />
                    </IconButton>
                  </ListCell>
                </ListRow>
              ))}
            </ListBody>
          </ListTable>
        ) : (
          <EmptyPanel
            title="Todavía no hay entradas"
            description="Registra la mercancía que recibas en este almacén."
          >
            <ActionButton tone="primary" onClick={onNew}>
              <PlusIcon size={18} />
              Registrar entrada
            </ActionButton>
          </EmptyPanel>
        )}
      </ListPanel>
    </>
  )
}
