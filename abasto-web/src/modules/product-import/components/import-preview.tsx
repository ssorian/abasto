import {
  ErrorNote,
  Note,
} from '#/modules/product-import/components/import-fields'

import type { ImportPreview } from '#/modules/product-import/lib/import-types'

const money = (value: number) =>
  new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(
    value,
  )

const head =
  'bg-[#f8fafc] px-[11px] py-[13px] text-[11px] font-semibold tracking-[0.35px] whitespace-nowrap text-[#78879b] md:px-[14px] md:py-[15px]'
const cell =
  'border-t border-[#edf1f5] px-[11px] py-[13px] whitespace-nowrap first:min-w-[170px] first:whitespace-normal md:px-[14px] md:py-4'

/** Metrics, file-level errors and the row-by-row result table. */
export function ImportPreviewPanel({ preview }: { preview: ImportPreview }) {
  const { mode, rows, invalidRows } = preview
  const metrics: Array<[string, string | number, boolean]> = [
    ['Filas leídas', rows.length, false],
    ['Filas con error', invalidRows, invalidRows > 0],
    mode === 'stock'
      ? ['Costo total de entrada', money(preview.totalCost), false]
      : ['Altas listas', rows.length - invalidRows, false],
  ]

  return (
    <section>
      <div className="my-[18px] grid grid-cols-1 rounded-[12px] border border-[#e1e8f0] bg-white md:grid-cols-3">
        {metrics.map(([label, value, bad]) => (
          <div
            key={label}
            className="min-w-0 p-4 md:px-4 md:py-[22px] md:not-first:border-l md:not-first:border-[#e5e9e2] max-md:not-first:border-t"
          >
            <span className="mb-[9px] block text-[11px] text-[#6c8199]">
              {label}
            </span>
            <strong
              className={`block text-[23px] tracking-[-0.7px] ${bad ? 'text-[#c35850]' : 'text-ink-figure'}`}
            >
              {value}
            </strong>
          </div>
        ))}
      </div>
      {preview.errors.map((error) => (
        <ErrorNote key={error}>{error}</ErrorNote>
      ))}
      <div className="max-h-[340px] w-full overflow-auto">
        <table className="w-full border-collapse text-left text-[13px]">
          <thead>
            <tr>
              {['Fila', 'SKU', 'Resultado', 'Revisión'].map((label) => (
                <th key={label} className={head}>
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.line}>
                <td className={cell}>{row.line}</td>
                <td className={cell}>{row.cells.sku}</td>
                <td className={cell}>
                  {row.errors.length ? (
                    <span className="text-[#c35850]">
                      {row.errors.join(' ')}
                    </span>
                  ) : (
                    <>
                      {row.summary}
                      {row.entry && (
                        <small className="mt-1 block text-[11px] text-[#7d8b9b]">
                          {row.entry.warehouse} · {row.entry.lot} · Cad.{' '}
                          {row.entry.expiry || 'Sin fecha'}
                        </small>
                      )}
                    </>
                  )}
                </td>
                <td className={cell}>
                  {row.errors.length ? 'Corregir' : 'Lista'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Note className="my-3">
        La carga es completa: si hay un error, no se importa ninguna fila. Se
        volverá a validar al confirmar.
      </Note>
    </section>
  )
}
