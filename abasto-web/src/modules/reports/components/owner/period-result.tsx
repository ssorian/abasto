import { cn } from '#/lib/utils/cn'
import { formatBpsPercent } from '#/modules/executive/lib/format'
import type { WarehouseMetrics } from '#/modules/executive/types/profitability'
import { formatCents } from '#/modules/pricing/lib/money'
import { Figure, Panel } from '#/modules/reports/components/owner/owner-panel'
import { compactMoney } from '#/modules/reports/lib/owner-series'
import type { ChartDay } from '#/modules/reports/lib/owner-view'

type PeriodResultProps = {
  current: WarehouseMetrics
  /** Change of sales over the comparison period; null when it had no sales. */
  revenueChangeBps: number | null
  /** "semana anterior". */
  comparedWith: string
  /** Empty for a single day: one bar says nothing the figure does not. */
  bars: Array<ChartDay>
}

/** The three figures of the period and its one chart. */
export function PeriodResult({
  current,
  revenueChangeBps,
  comparedWith,
  bars,
}: PeriodResultProps) {
  const figures = (
    <>
      <Figure
        label="Ventas"
        size="xl"
        value={formatCents(current.revenueCents)}
        note={
          revenueChangeBps !== null && (
            <>
              <Change bps={revenueChangeBps} /> vs. {comparedWith}
            </>
          )
        }
      />
      <hr className="border-border" />
      <Figure
        label="Utilidad bruta"
        value={formatCents(current.marginCents)}
        tone={current.marginCents < 0 ? 'negative' : undefined}
        note={`margen ${formatBpsPercent(current.marginBps)}`}
      />
      <Figure
        label="Tickets"
        value={String(current.tickets)}
        note={`promedio ${formatCents(current.averageTicketCents)}`}
      />
    </>
  )
  if (bars.length === 0) {
    return (
      <Panel className="grid gap-[18px] px-6 py-[22px] min-[820px]:grid-cols-[1.4fr_auto_1fr_1fr] min-[820px]:items-start [&>hr]:min-[820px]:h-full [&>hr]:min-[820px]:border-t-0 [&>hr]:min-[820px]:border-l">
        {figures}
      </Panel>
    )
  }
  return (
    <Panel className="grid min-[820px]:grid-cols-[250px_minmax(0,1fr)]">
      <div className="grid content-start gap-[18px] border-b border-border px-6 py-[22px] min-[820px]:border-r min-[820px]:border-b-0">
        {figures}
      </div>
      <DailyBars bars={bars} />
    </Panel>
  )
}

function Change({ bps }: { bps: number }) {
  const percent = `${Math.abs(bps / 100).toFixed(Math.abs(bps) < 1000 ? 1 : 0)} %`
  if (bps === 0) return <span className="font-[650]">Igual</span>
  return (
    <span
      className={cn(
        'font-[650]',
        bps > 0 ? 'text-[#1d7a4b]' : 'text-destructive',
      )}
    >
      <span aria-hidden="true">{bps > 0 ? '▲' : '▼'}</span>
      <span className="sr-only">{bps > 0 ? 'Subió' : 'Bajó'}</span> {percent}
    </span>
  )
}

function DailyBars({ bars }: { bars: Array<ChartDay> }) {
  // Past a week the amounts no longer fit above each bar; the tooltip keeps them.
  const dense = bars.length > 7
  const columns = {
    gridTemplateColumns: `repeat(${bars.length}, minmax(0, 1fr))`,
  }
  const summary = bars
    .filter((bar) => bar.state !== 'future')
    .map((bar) => `${bar.label} ${formatCents(bar.revenueCents)}`)
    .join(', ')
  return (
    <div className="flex min-w-0 flex-col px-6 pt-[22px] pb-4">
      <h3 className="text-[15px] font-[650] text-ink-figure">Ventas por día</h3>
      <div
        role="img"
        aria-label={`Ventas por día: ${summary}.`}
        className={cn(
          'mt-3.5 grid min-h-[178px] flex-1 items-end border-b border-border',
          dense ? 'gap-[3px]' : 'gap-1.5 min-[820px]:gap-3.5',
        )}
        style={columns}
      >
        {bars.map((bar) => (
          <div
            key={bar.day}
            title={
              bar.state === 'future'
                ? undefined
                : `${bar.label}: ${formatCents(bar.revenueCents)}`
            }
            className="flex h-full flex-col items-center justify-end gap-[5px]"
          >
            {!dense && (
              <b
                className={cn(
                  'text-[11px] tabular-nums',
                  bar.state === 'future'
                    ? 'font-normal text-muted-foreground'
                    : 'font-semibold text-ink-row',
                )}
              >
                {bar.state === 'future' ? '—' : compactMoney(bar.revenueCents)}
              </b>
            )}
            {bar.state === 'sold' ? (
              <i
                className="block w-full max-w-[46px] rounded-t-[5px] bg-secondary-foreground"
                style={{ height: `${Math.max(bar.heightPercent, 2)}%` }}
              />
            ) : (
              <i
                className={cn(
                  'block h-0.5 w-full max-w-[46px]',
                  bar.state === 'zero'
                    ? 'bg-input'
                    : 'border-t-2 border-dashed border-input',
                )}
              />
            )}
          </div>
        ))}
      </div>
      <div
        aria-hidden="true"
        className={cn(
          'mt-[7px] grid text-center text-muted-foreground',
          dense
            ? 'gap-[3px] text-[10px]'
            : 'gap-1.5 text-[11px] min-[820px]:gap-3.5 min-[820px]:text-xs',
        )}
        style={columns}
      >
        {bars.map((bar, index) => (
          <span
            key={bar.day}
            className={cn(
              'overflow-hidden whitespace-nowrap',
              bar.today && 'font-bold text-ink-figure',
              // Every other day number on a month keeps the axis readable.
              dense && index % 2 === 1 && !bar.today && 'invisible',
            )}
          >
            {bar.label}
          </span>
        ))}
      </div>
    </div>
  )
}
