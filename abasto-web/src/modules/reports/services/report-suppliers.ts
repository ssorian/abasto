import { asc } from 'drizzle-orm'
import { db } from '#/db'
import { suppliers } from '#/modules/catalog/db/schema'
import type { ReportSupplier } from '#/modules/reports/types/reports'

/** Every supplier by name, inactive ones included, for the report filter. */
export async function listReportSuppliers(): Promise<Array<ReportSupplier>> {
  return db
    .select({
      id: suppliers.id,
      name: suppliers.name,
      active: suppliers.active,
    })
    .from(suppliers)
    .orderBy(asc(suppliers.name))
}
