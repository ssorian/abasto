import type { CSSProperties } from 'react'

import type { BrandTab } from '#/modules/store/lib/catalog-filter'

type BrandNavProps = {
  tabs: Array<BrandTab>
  total: number
  value: string | undefined
  onChange: (brand: string | undefined) => void
}

/**
 * Brand tabs. Length means extent: each tab carries a bar, measured against
 * the whole catalog, and on the phone a width proportional to its products.
 */
export function BrandNav({ tabs, total, value, onChange }: BrandNavProps) {
  const most = Math.max(1, ...tabs.map((tab) => tab.count))
  const whole = Math.max(1, total)
  const all: BrandTab = { value: '', label: 'Todo', count: total }
  return (
    <nav
      aria-label="Marcas"
      className="rb-rail lg:sticky lg:top-[68px] lg:self-start"
    >
      <ul className="flex overflow-x-auto pr-10 [scrollbar-width:none] max-lg:[mask-image:linear-gradient(to_right,#000_calc(100%-40px),transparent)] lg:flex-col lg:overflow-visible lg:py-2 lg:pr-0">
        {[all, ...tabs].map((tab) => {
          const share = tab.value ? tab.count / most : 0.4
          const extent = tab.value ? tab.count / whole : 1
          const pressed = (value ?? '') === tab.value
          return (
            <li key={tab.value || 'all'} className="shrink-0 lg:shrink">
              <button
                type="button"
                className="rb-tab w-full max-lg:min-w-[calc(64px+var(--share)*84px)]"
                aria-pressed={pressed}
                onClick={() => onChange(tab.value || undefined)}
                style={
                  {
                    '--share': share,
                    '--extent': extent,
                  } as CSSProperties
                }
              >
                <span>{tab.label}</span>
                <span className="rb-count">{tab.count}</span>
                <span className="rb-extent" aria-hidden />
              </button>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
