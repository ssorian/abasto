import { workspace } from '#/config/workspace'

/**
 * The one place that names the customer store. The name is provisional:
 * change `name` here (or point it to another source) and the header, login,
 * footer and page titles follow.
 */
export const storeConfig = {
  name: workspace.business.name,
  location: workspace.business.location,
} as const

export const storeTitle = (page: string) => `${page} · ${storeConfig.name}`
