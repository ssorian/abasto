const MAX_CHARS = 2_000_000
const MAX_ROWS = 1001

/** Parses CSV text (comma or semicolon) into trimmed rows; throws on malformed input. */
export function parseCsv(input: string): Array<Array<string>> {
  const text = input.replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n')
  if (text.length > MAX_CHARS)
    throw new Error('El archivo supera 2 MB. Divide la carga.')

  const first = text.split('\n')[0]
  const semicolons = (first.match(/;/g) ?? []).length
  const commas = (first.match(/,/g) ?? []).length
  const delimiter = semicolons > commas ? ';' : ','

  const rows: Array<Array<string>> = []
  let row: Array<string> = []
  let cell = ''
  let quoted = false
  let closed = false

  const finishCell = () => {
    row.push(cell.trim())
    cell = ''
    closed = false
  }
  const finishRow = () => {
    finishCell()
    if (row.some((value) => value !== '')) rows.push(row)
    row = []
  }

  for (let i = 0; i < text.length; i++) {
    const char = text[i]
    if (quoted) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          cell += '"'
          i++
        } else {
          quoted = false
          closed = true
        }
      } else {
        cell += char
      }
      continue
    }
    if (char === '"') {
      if (cell.trim() || closed)
        throw new Error('Comillas inválidas en el CSV.')
      quoted = true
      cell = ''
    } else if (char === delimiter) {
      finishCell()
    } else if (char === '\n') {
      finishRow()
    } else if (closed && char.trim()) {
      throw new Error('Texto inesperado después de unas comillas.')
    } else if (!closed) {
      cell += char
    }
  }
  if (quoted) throw new Error('Hay una celda con comillas sin cerrar.')
  if (cell || row.length || closed) finishRow()
  if (rows.length < 2)
    throw new Error('El CSV debe contener encabezados y al menos una fila.')
  if (rows.length > MAX_ROWS)
    throw new Error('Carga hasta 1,000 filas por archivo.')
  return rows
}

/** Cheap content hash used to detect a file that was already imported. */
export function fingerprint(
  mode: string,
  rows: ReadonlyArray<ReadonlyArray<string>>,
) {
  const text = mode + JSON.stringify(rows)
  let a = 2166136261
  let b = 5381
  for (const char of text) {
    const code = char.charCodeAt(0)
    a = Math.imul(a ^ code, 16777619)
    b = Math.imul(b, 33) ^ code
  }
  return (a >>> 0).toString(16) + (b >>> 0).toString(16)
}
