import { DownloadIcon } from 'lucide-react'
import type { ReactNode } from 'react'

import { ActionButton } from '#/modules/reports/components/report-buttons'
import { ReportEmpty } from '#/modules/reports/components/report-empty'
import { SectionRow } from '#/modules/reports/components/section-row'

type TableSectionProps = {
  title: string
  description: string
  /** Rows to list; an empty table shows `emptyText` and disables the export. */
  count: number
  emptyText: string
  onExport: () => void
  children: ReactNode
}

/** A titled report table with its CSV export and an empty message. */
export function TableSection({
  title,
  description,
  count,
  emptyText,
  onExport,
  children,
}: TableSectionProps) {
  return (
    <section className="mt-[26px]">
      <SectionRow title={title} description={description}>
        <ActionButton disabled={count === 0} onClick={onExport}>
          <DownloadIcon size={16} />
          Exportar CSV
        </ActionButton>
      </SectionRow>
      {count === 0 ? <ReportEmpty>{emptyText}</ReportEmpty> : children}
    </section>
  )
}
