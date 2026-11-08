import { ClientError, unwrap } from '#/lib/boundary'
import { defaultExpiringDays, periodOf } from '#/modules/reports/lib/search'
import type { ReportSearch } from '#/modules/reports/lib/search'
import {
  cashCutsFn,
  receivablesAgingFn,
  reportScopeFn,
  reportSuppliersFn,
  salesReportFn,
  stockAlertsFn,
} from '#/modules/reports/server/reports'
import type {
  CashCuts,
  ReceivablesAging,
  ReportSupplier,
  ReportTab,
  ReportWarehouse,
  SalesReport,
  StockAlerts,
} from '#/modules/reports/types/reports'

export type ReportData =
  | { tab: 'ventas'; report: SalesReport }
  | { tab: 'cajas'; report: CashCuts }
  | { tab: 'inventario'; report: StockAlerts }
  | { tab: 'cartera'; report: ReceivablesAging }

export type ReportsLoad =
  | { allowed: false }
  | {
      allowed: true
      warehouses: Array<ReportWarehouse>
      suppliers: Array<ReportSupplier>
      /** Missing when the filters were refused; `error` says why. */
      data?: ReportData
      error?: string
    }

/** Loads the active tab's report; anyone who manages no warehouse gets `allowed: false`. */
export async function loadReport(search: ReportSearch): Promise<ReportsLoad> {
  const scope = await reportScopeFn()
  if (!scope.ok) {
    if (scope.code === 'forbidden') return { allowed: false }
    throw new ClientError(scope.code, scope.message)
  }
  const tab = search.tab ?? 'ventas'
  const suppliers = unwrap(await reportSuppliersFn())
  try {
    const data = await fetchTab(tab, search)
    return { allowed: true, warehouses: scope.data, suppliers, data }
  } catch (error) {
    // Bad dates or a warehouse that is not theirs: show it next to the filters.
    if (
      error instanceof ClientError &&
      (error.code === 'invalid' || error.code === 'forbidden')
    ) {
      return {
        allowed: true,
        warehouses: scope.data,
        suppliers,
        error: error.message,
      }
    }
    throw error
  }
}

async function fetchTab(
  tab: ReportTab,
  search: ReportSearch,
): Promise<ReportData> {
  const input = {
    period: periodOf(search),
    warehouseId: search.almacen,
    supplierId: search.proveedor,
  }
  switch (tab) {
    case 'ventas':
      return { tab, report: unwrap(await salesReportFn({ data: input })) }
    case 'cajas':
      return { tab, report: unwrap(await cashCutsFn({ data: input })) }
    case 'inventario':
      return {
        tab,
        report: unwrap(
          await stockAlertsFn({
            data: {
              warehouseId: search.almacen,
              supplierId: search.proveedor,
              expiringDays: search.dias ?? defaultExpiringDays,
            },
          }),
        ),
      }
    case 'cartera':
      return { tab, report: unwrap(await receivablesAgingFn()) }
  }
}
