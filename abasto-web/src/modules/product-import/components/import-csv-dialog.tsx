import { useState } from 'react'
import {
  DownloadIcon,
  FileCheckCornerIcon,
  UploadIcon,
  XIcon,
} from 'lucide-react'

import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '#/components/ui/dialog'
import {
  ErrorNote,
  Field,
  FieldSelect,
  FieldTextarea,
  ImportButton,
  Note,
} from '#/modules/product-import/components/import-fields'
import { ImportPreviewPanel } from '#/modules/product-import/components/import-preview'
import { previewImport } from '#/modules/product-import/lib/csv-validate'
import {
  columnRules,
  downloadText,
  importHeaders,
  importTemplate,
  modeBanners,
  templateFilename,
} from '#/modules/product-import/lib/csv-template'
import {
  defaultBaseUnits,
  defaultCategories,
  defaultHasStockHistory,
  defaultReferenceProducts,
} from '#/modules/product-import/lib/default-context'
import { cn } from '#/lib/utils/cn'

import type { WarehouseName } from '#/shared/demo/types'
import type {
  ImportMode,
  ImportPreview,
  ImportReferenceProduct,
  ImportResult,
} from '#/modules/product-import/lib/import-types'

export type ImportCsvDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Import type selected when the dialog opens; the user can switch it. */
  initialMode?: ImportMode
  /** Products the file is validated against. Defaults to the shared demo products. */
  products?: ReadonlyArray<ImportReferenceProduct>
  /** Whether a product already has history in a warehouse (stock imports only load new ones). */
  hasStockHistory?: (sku: string, warehouse: WarehouseName) => boolean
  /** Allowed categories for catalog imports. */
  categories?: ReadonlyArray<string>
  /** Called with the validated rows once the user confirms; the dialog then closes. */
  onApply?: (result: ImportResult) => void
}

/** Fingerprints of files already applied in this session. */
const appliedFingerprints = new Set<string>()

export function ImportCsvDialog({
  open,
  onOpenChange,
  ...props
}: ImportCsvDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {open && (
        <ImportDialogContent onClose={() => onOpenChange(false)} {...props} />
      )}
    </Dialog>
  )
}

type ContentProps = Omit<ImportCsvDialogProps, 'open' | 'onOpenChange'> & {
  onClose: () => void
}

function ImportDialogContent({
  onClose,
  initialMode = 'catalog',
  products = defaultReferenceProducts,
  hasStockHistory = defaultHasStockHistory,
  categories = defaultCategories,
  onApply,
}: ContentProps) {
  const [mode, setMode] = useState<ImportMode>(initialMode)
  const [text, setText] = useState('')
  const [filename, setFilename] = useState('Datos pegados.csv')
  const [preview, setPreview] = useState<ImportPreview | null>(null)
  const [error, setError] = useState('')
  const [acknowledged, setAcknowledged] = useState(false)

  const reset = () => {
    setPreview(null)
    setError('')
    setAcknowledged(false)
  }

  const readFile = async (file: File | undefined) => {
    if (!file) return
    reset()
    if (file.size > 2e6) {
      setError('Carga un CSV de hasta 2 MB.')
      return
    }
    try {
      setText(await file.text())
      setFilename(file.name)
    } catch {
      setError('No se pudo leer el archivo.')
    }
  }

  const validate = () => {
    try {
      setPreview(
        previewImport(text, mode, {
          products,
          hasStockHistory,
          categories,
          baseUnits: defaultBaseUnits,
          importedFingerprints: appliedFingerprints,
        }),
      )
      setAcknowledged(false)
      setError('')
    } catch (problem) {
      setPreview(null)
      setError(
        problem instanceof Error ? problem.message : 'No se pudo leer el CSV.',
      )
    }
  }

  const blocked =
    !preview || preview.invalidRows > 0 || preview.errors.length > 0

  const apply = () => {
    if (!preview || blocked) return
    // Revalidate on confirm, like the reference, in case the text changed.
    appliedFingerprints.add(preview.fingerprint)
    const rows = preview.rows
    onApply?.(
      mode === 'catalog'
        ? {
            mode,
            filename,
            fingerprint: preview.fingerprint,
            products: rows.flatMap((row) => (row.product ? [row.product] : [])),
          }
        : {
            mode,
            filename,
            fingerprint: preview.fingerprint,
            entries: rows.flatMap((row) => (row.entry ? [row.entry] : [])),
          },
    )
    onClose()
  }

  const stepIndex = preview ? 1 : 0

  return (
    <DialogContent
      showCloseButton={false}
      className="max-h-[92dvh] w-[calc(100vw-20px)] max-w-[calc(100vw-20px)] gap-[18px] overflow-y-auto rounded-2xl border border-transparent bg-white p-5 text-base sm:max-w-[calc(100vw-20px)] md:w-[min(1080px,calc(100vw-32px))] md:max-w-[1080px] md:gap-5 md:p-[29px]"
    >
      <DialogHeader className="text-left">
        <DialogTitle className="text-[23px] leading-[1.3] font-semibold tracking-[-0.7px] md:text-[25px]">
          Importar CSV
        </DialogTitle>
        <DialogDescription className="text-[13px] leading-[1.7] text-[#8692a3] md:text-sm">
          Revisa la carga completa antes de agregar productos o existencias
          iniciales.
        </DialogDescription>
      </DialogHeader>
      <div className="mt-2 mb-3.5 flex flex-wrap gap-2.5 text-xs">
        {['1. Cargar archivo', '2. Revisar', '3. Confirmar y registrar'].map(
          (label, index) => (
            <span
              key={label}
              className={cn(
                'rounded-[18px] bg-[#eef2f8] px-3.5 py-2 text-[#8195ae]',
                index === stepIndex && 'bg-[#ffdf74] font-[650] text-[#173963]',
              )}
            >
              {label}
            </span>
          ),
        )}
      </div>
      <div className="grid gap-[15px] md:grid-cols-2">
        <Field label="Qué vas a importar">
          <FieldSelect
            value={mode}
            onChange={(event) => {
              setMode(event.target.value as ImportMode)
              setText('')
              reset()
            }}
          >
            <option value="catalog">Catálogo · productos nuevos</option>
            <option value="stock">Existencias iniciales por lote</option>
          </FieldSelect>
        </Field>
        <div className="flex items-end pb-2">
          <ImportButton
            className="max-md:whitespace-normal"
            onClick={() =>
              downloadText(importTemplate(mode), templateFilename(mode))
            }
          >
            <DownloadIcon size={16} />
            Descargar plantilla con ejemplo
          </ImportButton>
        </div>
      </div>
      <div className="my-[15px] rounded-[9px] border border-[#d9e5f2] bg-[#eaf1fa] p-[13px] text-xs leading-[1.7] text-[#54759a]">
        {modeBanners[mode]}
      </div>
      <Note className="mt-3 mb-5">
        CSV UTF-8, hasta 1,000 filas y 2 MB. Separador coma o punto y coma. Usa
        punto decimal y fechas AAAA-MM-DD. Conserva los códigos como texto para
        no perder ceros iniciales. La plantilla contiene una fila de ejemplo:
        reemplázala con tus datos.
      </Note>
      <details className="rounded-[9px] border border-[#e0e8f2] bg-[#f5f8fc] px-4 py-3.5 text-xs leading-[1.8] text-[#6b829e]">
        <summary className="cursor-pointer font-semibold text-[#284f79]">
          Ver columnas y reglas
        </summary>
        <p className="mt-[9px] [overflow-wrap:anywhere]">
          {importHeaders[mode].join(' · ')}
        </p>
        <p className="mt-[9px] [overflow-wrap:anywhere]">{columnRules[mode]}</p>
      </details>
      <Field label="Seleccionar archivo CSV">
        <input
          type="file"
          accept=".csv,text/csv,text/plain"
          onChange={(event) => void readFile(event.target.files?.[0])}
          className="min-h-[43px] w-full rounded-[8px] border border-[#dce4ed] bg-white px-3 py-2 text-sm font-normal"
        />
      </Field>
      <Field label="O pega aquí el contenido del CSV">
        <FieldTextarea
          rows={5}
          spellCheck={false}
          value={text}
          placeholder={importHeaders[mode].join(',')}
          className="overflow-auto font-mono text-[11px] whitespace-pre"
          onChange={(event) => {
            setText(event.target.value)
            setFilename('Datos pegados.csv')
            reset()
          }}
        />
      </Field>
      <ImportButton disabled={!text.trim()} onClick={validate}>
        <FileCheckCornerIcon size={17} />
        Validar y ver vista previa
      </ImportButton>
      {error && <ErrorNote>{error}</ErrorNote>}
      {preview && (
        <div className="mt-4 flex flex-col gap-[15px] border-t border-[#dbe5f0] pt-2.5">
          <ImportPreviewPanel preview={preview} />
          <label className="flex cursor-pointer items-center gap-[9px] text-[13px] leading-[1.6] text-[#3b4f41]">
            <input
              type="checkbox"
              checked={acknowledged}
              disabled={blocked}
              onChange={(event) => setAcknowledged(event.target.checked)}
              className="size-[17px] flex-none accent-[#326447]"
            />
            Revisé las filas y confirmo que son altas o existencias iniciales,
            sin duplicar mercancía ya registrada.
          </label>
          <div>
            <ImportButton
              tone="primary"
              disabled={!acknowledged || blocked}
              onClick={apply}
            >
              <UploadIcon size={17} />
              Importar {preview.rows.length} filas
            </ImportButton>
          </div>
        </div>
      )}
      <DialogClose className="absolute top-4 right-4 rounded-xs opacity-70 transition-opacity hover:opacity-100 focus:outline-2 focus:outline-offset-2">
        <XIcon className="size-4" />
        <span className="sr-only">Cerrar</span>
      </DialogClose>
    </DialogContent>
  )
}
