import { Link } from '@tanstack/react-router'
import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

export type PanelTarget = '/mostrador' | '/inventario' | '/cobros' | '/reportes'

type HomePanelProps = {
  title: string
  icon: LucideIcon
  actionLabel: string
  /** Screen the action link opens. */
  to: PanelTarget
  emptyMessage: string
  children?: ReactNode
}

/** Overview card: heading with action link, list rows or an empty message. */
export function HomePanel({
  title,
  icon: Icon,
  actionLabel,
  to,
  emptyMessage,
  children,
}: HomePanelProps) {
  const isEmpty =
    !children || (Array.isArray(children) && children.length === 0)

  return (
    <section className="min-w-0 rounded-[14px] border border-panel-border bg-white p-[17px] md:p-[22px]">
      <div className="mb-[13px] flex items-start justify-between gap-2.5 md:items-center">
        <h3 className="flex items-center gap-2 text-[15px] font-[650] text-ink-heading panels:text-base">
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
}

export function HomeRow({ title, detail, aside }: HomeRowProps) {
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
    </div>
  )
}

export function HomeRowFigure({ children }: { children: ReactNode }) {
  return (
    <b className="text-xs whitespace-nowrap text-[#365b84] md:text-[13px]">
      {children}
    </b>
  )
}
