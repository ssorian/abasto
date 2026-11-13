import { useEffect, useState } from 'react'

import {
  catalogViewKey,
  catalogViewOf,
  defaultCatalogView,
} from '#/modules/catalog/lib/catalog-view'

import type { CatalogView } from '#/modules/catalog/lib/catalog-view'

/** Table/cards choice, remembered on this device; reads storage after hydration. */
export function useCatalogView() {
  const [view, setView] = useState<CatalogView>(defaultCatalogView)

  useEffect(() => {
    try {
      setView(catalogViewOf(window.localStorage.getItem(catalogViewKey)))
    } catch {
      // Storage unavailable (private mode): keep the default.
    }
  }, [])

  const choose = (next: CatalogView) => {
    setView(next)
    try {
      window.localStorage.setItem(catalogViewKey, next)
    } catch {
      // The choice still applies for this visit.
    }
  }

  return [view, choose] as const
}
