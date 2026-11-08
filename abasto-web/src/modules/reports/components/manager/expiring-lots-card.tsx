import { useState } from 'react'

import { formatCents } from '#/modules/pricing/lib/money'
import { shortDate } from '#/modules/reports/lib/manager-format'
import {
  CardEmpty,
  ManagerCard,
} from '#/modules/reports/components/manager/manager-card'
import {
  CellNote,
  DataTable,
  Row,
  TableWrap,
  Td,
  Th,
} from '#/modules/reports/components/report-table'
import type { LotAlertRow } from '#/modules/reports/types/reports'

const LIMIT = 5
const sum = (rows: Array<LotAlertRow>) =>
  rows.reduce((total, lot) => total + lot.valueCents, 0)

/** Lots about to expire with their value at cost; already expired ones are a single line. */
export function ExpiringLotsCard({
  expiring,
  expired,
  days,
}: {
  expiring: Array<LotAlertRow>
  expired: Array<LotAlertRow>
  days: number
}) {
  const [all, setAll] = useState(false)
  const shown = all ? expiring : expiring.slice(0, LIMIT)
  return (
    <ManagerCard
      title="Lotes por caducar"
      subtitle={`Próximos ${days} días, con su valor a costo.`}
    >
      {expiring.length === 0 ? (
        <CardEmpty>Ningún lote caduca en los próximos {days} días.</CardEmpty>
      ) : (
        <TableWrap bordered>
          <DataTable>
            <thead>
              <tr>
                <Th>Producto</Th>
                <Th>Caduca</Th>
                <Th className="text-right">Valor a costo</Th>
              </tr>
            </thead>
            <tbody>
              {shown.map((lot) => (
                <Row key={lot.lotId}>
                  <Td>
                    {lot.name}
                    <CellNote>
                      Lote {lot.lotCode} · {lot.onHand} {lot.unit}
                    </CellNote>
                  </Td>
                  <Td>{shortDate(lot.expiresOn)}</Td>
                  <Td className="text-right font-semibold tabular-nums">
                    {formatCents(lot.valueCents)}
                  </Td>
                </Row>
              ))}
            </tbody>
          </DataTable>
        </TableWrap>
      )}
      {expiring.length > LIMIT && (
        <button
          type="button"
          onClick={() => setAll(!all)}
          className="mt-2.5 text-[13px] font-[650] text-ink-link hover:underline"
        >
          {all ? 'Ver menos' : `Ver ${expiring.length - LIMIT} más`}
        </button>
      )}
      {expiring.length > 0 && (
        <p className="mt-2.5 text-xs text-ink-muted">
          En riesgo: <strong>{formatCents(sum(expiring))}</strong> en{' '}
          {expiring.length} {expiring.length === 1 ? 'lote' : 'lotes'}.
        </p>
      )}
      {expired.length > 0 && (
        <p className="mt-2 text-xs font-medium text-destructive">
          Ya caducados: {expired.length}{' '}
          {expired.length === 1 ? 'lote' : 'lotes'} ·{' '}
          {formatCents(sum(expired))}.
        </p>
      )}
    </ManagerCard>
  )
}
