import { useState } from 'react'

import { stockLevels } from '#/modules/reports/lib/manager-chart-data'
import {
  CardEmpty,
  Chip,
  ManagerCard,
} from '#/modules/reports/components/manager/manager-card'
import type { LowStockRow } from '#/modules/reports/types/reports'

const LIMIT = 5

/** Products under their minimum, lowest first; red when under a quarter of it. */
export function LowStockCard({ rows }: { rows: Array<LowStockRow> }) {
  const [all, setAll] = useState(false)
  const levels = stockLevels(rows)
  const shown = all ? levels : levels.slice(0, LIMIT)
  return (
    <ManagerCard
      title="Stock bajo"
      subtitle="Existencia contra el mínimo del producto."
      badge={
        levels.length ? <Chip tone="amber">{levels.length}</Chip> : undefined
      }
    >
      {levels.length === 0 ? (
        <CardEmpty>Ningún producto está bajo su mínimo.</CardEmpty>
      ) : (
        <ul>
          {shown.map((row) => (
            <li key={row.name} className="border-t border-[#f5f1ed] py-2.5">
              <div className="flex justify-between gap-3 text-[13px] text-ink-row">
                <span>{row.name}</span>
                <span className="whitespace-nowrap">
                  <strong>{row.available}</strong>{' '}
                  <span className="text-[11px] text-ink-muted">
                    mín. {row.minimum}
                  </span>
                </span>
              </div>
              <div
                role="img"
                aria-label={`${row.percent} % del mínimo${row.critical ? ', muy bajo' : ''}`}
                className="mt-[7px] h-1.5 rounded-[3px] bg-[#f6efe6]"
              >
                <div
                  className="h-1.5 rounded-[3px]"
                  style={{
                    width: `${row.percent}%`,
                    background: row.critical ? '#bd5754' : '#a77a24',
                  }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
      {levels.length > LIMIT && (
        <button
          type="button"
          onClick={() => setAll(!all)}
          className="mt-2.5 text-[13px] font-[650] text-ink-link hover:underline"
        >
          {all ? 'Ver menos' : `Ver ${levels.length - LIMIT} más`}
        </button>
      )}
    </ManagerCard>
  )
}
