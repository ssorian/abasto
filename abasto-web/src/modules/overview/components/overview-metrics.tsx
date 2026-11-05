export type OverviewMetric = { label: string; value: string }

export function OverviewMetrics({
  metrics,
}: {
  metrics: Array<OverviewMetric>
}) {
  return (
    <div className="my-[18px] grid grid-cols-2 rounded-xl border border-[#e1e8f0] bg-white md:grid-cols-4">
      {metrics.map((metric) => (
        <div
          key={metric.label}
          className="min-w-0 p-4 md:px-4 md:py-[22px] md:not-first:border-l md:not-first:border-[#e5e9e2]"
        >
          <span className="mb-[9px] block text-[11px] text-metric-label">
            {metric.label}
          </span>
          <strong className="block text-xl tracking-[-0.7px] text-ink-figure metrics:text-[23px]">
            {metric.value}
          </strong>
        </div>
      ))}
    </div>
  )
}
