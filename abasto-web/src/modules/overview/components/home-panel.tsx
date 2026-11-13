import { Link } from '@tanstack/react-router'
import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

import { cn } from '#/lib/utils/cn'

export type PanelTarget = '/mostrador' | '/inventario' | '/reportes'

type HomePanelProps = {
  title: string
  icon: LucideIcon
  actionLabel: string
  /** Screen the action link opens. */
  to: PanelTarget
  emptyMessage: string
  /** `danger` marks something that is already wrong, not just upcoming. */
  tone?: 'default' | 'danger'
  children?: ReactNode
}

/** Overview card: heading with action link, list rows or an empty message. */
export function HomePanel({
  title,
  icon: Icon,
  actionLabel,
  to,
  emptyMessage,
  tone = 'default',
  children,
}: HomePanelProps) {
  const danger = tone === 'danger'
  const isEmpty =
    !children || (Array.isArray(children) && children.length === 0)

  return (
    <section
      className={cn(
        'min-w-0 rounded-[14px] border bg-white p-[17px] md:p-[22px]',
        danger ? 'border-red-200 bg-red-50/40' : 'border-panel-border',
      )}
    >
      <div className="mb-[13px] flex items-start justify-between gap-2.5 md:items-center">
        <h3
          className={cn(
            'flex items-center gap-2 text-[15px] font-[650] panels:text-base',
            danger ? 'text-red-800' : 'text-ink-heading',
          )}
        >
          <Icon size={19} />
          {title}
        </h3>
        <Link
          to={to}
          className="inline-flex items-center gap-[7px] text-[11px] font-[650] whitespace-nowrap text-ink-link hover:underline"
        >
          {actionLabel}
        </Link>
      </div>
      {isEmpty ? (
        <p className="mt-3 mb-5 text-sm leading-[1.8] text-ink-subtle">
          {emptyMessage}
        </p>
      ) : (
        children
      )}
    </section>
  )
}

type HomeRowProps = {
  title: string
  detail: string
  aside: ReactNode
  /** Direct action for this row, e.g. a link that opens the right dialog. */
  action?: ReactNode
}

export function HomeRow({ title, detail, aside, action }: HomeRowProps) {
  return (
    <div className="flex items-center justify-between gap-3.5 border-t border-row-border py-[13px]">
      <div className="min-w-0 flex-1">
        <strong className="block text-xs leading-[1.6] font-semibold text-ink-row">
          {title}
        </strong>
        <small className="block text-[10px] leading-[1.7] text-ink-faint">
          {detail}
        </small>
      </div>
      {aside}
      {action}
    </div>
  )
}

/** Small link-button for a row action. */
export const homeRowAction =
  'inline-flex min-h-8 items-center rounded-[8px] border border-panel-border bg-white px-2.5 text-[11px] font-[650] whitespace-nowrap text-ink-link hover:bg-[#faf6f1]'

export function HomeRowFigure({ children }: { children: ReactNode }) {
  return (
    <b className="text-xs whitespace-nowrap text-ink-heading md:text-[13px]">
      {children}
    </b>
  )
}
