import { CheckCheckIcon, PlusIcon, TruckIcon, XIcon } from 'lucide-react'

import { StatusBadge } from '#/components/status-badge'
import { ActionButton } from '#/modules/inventory/components/action-button'
import { EmptyPanel } from '#/modules/inventory/components/empty-panel'
import { dateLabel, timeLabel } from '#/modules/inventory/lib/format'
import {
  ListBody,
  ListCell,
  ListHead,
  ListPanel,
  ListRow,
  ListTable,
} from '#/modules/inventory/components/list-panel'
import { SectionRow } from '#/modules/inventory/components/section-row'
import { formatCents } from '#/modules/pricing/lib/money'
import { describeQuantity } from '#/modules/riders/lib/box-quantities'
import {
  differenceLabel,
  statusTone,
} from '#/modules/riders/lib/assignment-view'
import type { AssignmentDetail } from '#/modules/riders/services/assignment-reads'

type AssignmentsSectionProps = {
  assignments: ReadonlyArray<AssignmentDetail>
  /** There is at least one rider and one product that can be assigned. */
  canAssign: boolean
  onNew: () => void
  onSettle: (assignment: AssignmentDetail) => void
  onCancel: (assignment: AssignmentDetail) => void
}

/** Open assignments ("En ruta") and the ones settled or cancelled today. */
export function AssignmentsSection({
  assignments,
  canAssign,
  onNew,
  onSettle,
  onCancel,
}: AssignmentsSectionProps) {
  return (
    <section aria-label="Repartos" className="mb-9">
      <SectionRow
        title="Repartos de hoy"
        description="Lo que sigue en ruta, aunque sea de días anteriores, y lo que se liquidó o canceló hoy."
        action={
          <ActionButton tone="primary" disabled={!canAssign} onClick={onNew}>
            <PlusIcon size={19} />
            Nuevo reparto
          </ActionButton>
        }
      />
      {assignments.length ? (
        <ListPanel>
          <ListTable>
            <ListHead>
              {['Repartidor', 'Productos', 'Estado', 'Fecha', '']}
            </ListHead>
            <ListBody>
              {assignments.map((assignment) => (
                <AssignmentRow
                  key={assignment.id}
                  assignment={assignment}
                  onSettle={onSettle}
                  onCancel={onCancel}
                />
              ))}
            </ListBody>
          </ListTable>
        </ListPanel>
      ) : (
        <EmptyPanel
          icon={TruckIcon}
          title="No hay repartos hoy"
          description={
            canAssign
              ? 'Asigna producto a un repartidor y aparecerá aquí.'
              : 'Para asignar necesitas un repartidor activo y producto disponible.'
          }
        />
      )}
    </section>
  )
}

function AssignmentRow({
  assignment,
  onSettle,
  onCancel,
}: {
  assignment: AssignmentDetail
  onSettle: (assignment: AssignmentDetail) => void
  onCancel: (assignment: AssignmentDetail) => void
}) {
  const settled = assignment.status === 'Liquidada'
  const when = new Date(
    assignment.closedAt ?? assignment.createdAt,
  ).toISOString()
  return (
    <ListRow>
      <ListCell>
        <strong className="text-[#5f4a51]">{assignment.riderName}</strong>
      </ListCell>
      <ListCell>
        {assignment.lines.map((line) => (
          <span key={line.id} className="block">
            <strong>{line.productName}</strong>{' '}
            {describeQuantity(line.assignedQuantity, line.boxFactor)}
            {settled && line.soldQuantity !== null && (
              <small className="block text-[#907e84]">
                Vendió {describeQuantity(line.soldQuantity, line.boxFactor)} ·
                regresó{' '}
                {describeQuantity(line.leftoverQuantity ?? 0, line.boxFactor)}
              </small>
            )}
          </span>
        ))}
      </ListCell>
      <ListCell>
        <StatusBadge tone={statusTone(assignment.status)}>
          {assignment.status}
        </StatusBadge>
        {settled && assignment.expectedCents !== null && (
          <small className="block">
            Esperado {formatCents(assignment.expectedCents)} · entregó{' '}
            {formatCents(assignment.deliveredCents ?? 0)}
            <span className="block font-semibold">
              {differenceLabel(assignment.differenceCents ?? 0)}
            </span>
          </small>
        )}
      </ListCell>
      <ListCell>
        {assignment.status === 'En ruta' ? 'Salió ' : 'Cerró '}
        {dateLabel(when)}
        <small className="block text-[#907e84]">{timeLabel(when)}</small>
      </ListCell>
      <ListCell>
        {assignment.status === 'En ruta' && (
          <span className="flex flex-wrap justify-end gap-2">
            <ActionButton
              tone="primary"
              className="min-h-9 px-3"
              onClick={() => onSettle(assignment)}
            >
              <CheckCheckIcon size={17} />
              Liquidar
            </ActionButton>
            <ActionButton
              className="min-h-9 px-3"
              onClick={() => onCancel(assignment)}
            >
              <XIcon size={17} />
              Cancelar
            </ActionButton>
          </span>
        )}
      </ListCell>
    </ListRow>
  )
}
