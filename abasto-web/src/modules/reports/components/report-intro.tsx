import { DownloadIcon } from 'lucide-react'

import { ActionButton } from '#/modules/reports/components/report-buttons'

type ReportIntroProps = {
  eyebrow: string
  title: string
  description: string
  exportDisabled: boolean
  onExport: () => void
}

/** Section heading with the CSV export action. */
export function ReportIntro({
  eyebrow,
  title,
  description,
  exportDisabled,
  onExport,
}: ReportIntroProps) {
  return (
    <div className="mt-1 mb-[26px] flex flex-col items-start gap-[15px] md:flex-row md:items-center md:justify-between md:gap-5">
      <div>
        <span className="text-xs leading-normal font-bold tracking-[1.5px] text-ink-eyebrow">
          {eyebrow}
        </span>
        <h2 className="my-[7px] text-2xl font-semibold tracking-[-0.6px] text-[#17365b] md:text-[27px]">
          {title}
        </h2>
        <p className="text-xs leading-[1.6] text-[#79879b] md:text-sm md:leading-normal">
          {description}
        </p>
      </div>
      <ActionButton disabled={exportDisabled} onClick={onExport}>
        <DownloadIcon size={16} />
        Exportar CSV
      </ActionButton>
    </div>
  )
}
