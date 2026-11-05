import { SearchIcon } from 'lucide-react'
import type { ReactNode } from 'react'

type CatalogToolbarProps = {
  query: string
  onQueryChange: (query: string) => void
  published: number
  paused: number
  /** Extra controls before the search box, such as the price warehouse. */
  children?: ReactNode
}

export function CatalogToolbar({
  query,
  onQueryChange,
  published,
  paused,
  children,
}: CatalogToolbarProps) {
  return (
    <div className="mb-[15px] flex flex-wrap items-center gap-2.5 md:mb-[18px] md:flex-nowrap md:gap-3">
      {children}
      <div className="flex h-[45px] min-w-0 basis-full items-center gap-2.5 rounded-[9px] border border-[#e0e6ee] bg-white px-[13px] text-[#8190a2] focus-within:border-[#91a8c3] md:h-11 md:flex-1 md:basis-auto">
        <SearchIcon size={18} className="shrink-0" />
        <input
          aria-label="Buscar en catálogo"
          placeholder="Buscar en el catálogo..."
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          className="h-full w-full min-w-0 border-0 bg-transparent text-xs text-[#344e6e] outline-none placeholder:text-[#8a97a8] wide:text-sm"
        />
      </div>
      <span className="text-xs text-[#788596] md:text-base">
        {published} publicados · {paused} pausados
      </span>
    </div>
  )
}
