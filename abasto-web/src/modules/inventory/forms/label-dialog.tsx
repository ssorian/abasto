import { useState } from 'react'
import { CopyIcon, PrinterIcon } from 'lucide-react'

import { ActionButton } from '#/modules/inventory/components/action-button'
import {
  Field,
  FieldInput,
  FieldSelect,
} from '#/modules/inventory/components/form-controls'
import { SectionHelp } from '#/modules/inventory/components/info-blocks'
import { InventoryDialog } from '#/modules/inventory/components/inventory-dialog'
import {
  findLabel,
  barcodeGeometry,
  printableLabels,
} from '#/modules/inventory/lib/lot-labels'

import type { WarehouseName } from '#/shared/demo/types'
import type {
  InventoryProduct,
  InventoryState,
  Lot,
} from '#/modules/inventory/types/inventory'

type LabelDialogProps = {
  state: InventoryState
  product: InventoryProduct
  lot: Lot
  warehouse: WarehouseName
  onClose: () => void
  /** Creates the label code for one presentation; returns true when registered. */
  onCreate: (presentationId: string) => boolean
}

/** Internal label of a lot: generate its code, preview the Code 39 bars, print copies. */
export function LabelDialog({
  state,
  product,
  lot,
  warehouse,
  onClose,
  onCreate,
}: LabelDialogProps) {
  const [presentationId, setPresentationId] = useState(
    product.presentations.find((item) => item.factor === product.packFactor)
      ?.id ?? product.presentations[0].id,
  )
  const [copies, setCopies] = useState(1)
  const [message, setMessage] = useState('')

  const presentation =
    product.presentations.find((item) => item.id === presentationId) ??
    product.presentations[0]
  const label = findLabel(state, product.id, warehouse, lot.id, presentationId)

  const print = () => {
    if (!label) return
    if (!Number.isSafeInteger(copies) || copies < 1 || copies > 100) {
      setMessage('Imprime entre 1 y 100 etiquetas.')
      return
    }
    const win = window.open('', '_blank', 'width=850,height=750')
    if (!win) {
      setMessage('Permite abrir la ventana de etiquetas para imprimir.')
      return
    }
    win.document.write(
      printableLabels(
        product,
        lot,
        label,
        presentation.name,
        presentation.factor,
        copies,
      ),
    )
    win.document.close()
    setMessage('')
  }

  const copy = async () => {
    if (!label) return
    try {
      await navigator.clipboard.writeText(label.code)
      setMessage('Código copiado. Pégalo en Mostrador y presiona Enter.')
    } catch {
      setMessage('Selecciona y copia el código mostrado debajo de las barras.')
    }
  }

  const geometry = label ? barcodeGeometry(label.code) : null

  return (
    <InventoryDialog
      title="Etiqueta interna por lote"
      description={`${product.name} · ${lot.code} · ${warehouse}`}
      onClose={onClose}
    >
      <Field label="Presentación que identifica el código">
        <FieldSelect
          value={presentationId}
          onChange={(event) => {
            setPresentationId(event.target.value)
            setMessage('')
          }}
        >
          {product.presentations
            .filter((item) => item.active)
            .map((item) => (
              <option key={item.id} value={item.id}>
                {item.name} · {item.factor} {product.unit}
              </option>
            ))}
        </FieldSelect>
      </Field>
      <SectionHelp>
        Cada lectura agrega una presentación y fija el lote. El precio se
        calcula al vender. Después de trasladar mercancía, genera etiquetas del
        almacén de destino.
      </SectionHelp>
      {label && geometry ? (
        <>
          <div className="overflow-auto rounded-[12px] bg-[#f5f7fa] p-2.5 md:p-5">
            <article className="mx-auto grid max-w-[360px] gap-1 border border-[#ccc] bg-white p-3.5 text-xs text-[#111]">
              <strong className="text-[15px]">{product.name}</strong>
              <div>
                {presentation.name} · {presentation.factor} {product.unit} ·{' '}
                {warehouse}
              </div>
              <b>Lote {label.lot}</b>
              <div>Caducidad: {lot.expiry || 'Sin fecha'}</div>
              <svg
                viewBox={`0 0 ${geometry.width} 65`}
                role="img"
                aria-label={label.code}
                className="h-auto w-full"
              >
                <rect width={geometry.width} height="65" fill="white" />
                {geometry.bars.map((bar) => (
                  <rect
                    key={bar.x}
                    x={bar.x}
                    y="3"
                    width={bar.width}
                    height="59"
                    fill="black"
                  />
                ))}
              </svg>
              <code className="text-center">{label.code}</code>
              <small className="text-center text-[9px]">
                Precio vigente al vender · Etiqueta interna
              </small>
            </article>
          </div>
          <Field label="Número de etiquetas">
            <FieldInput
              type="number"
              min="1"
              max="100"
              step="1"
              value={copies}
              onChange={(event) => setCopies(Number(event.target.value))}
            />
          </Field>
          <div className="flex flex-wrap gap-[9px]">
            <ActionButton tone="primary" onClick={print}>
              <PrinterIcon size={17} />
              Abrir impresión
            </ActionButton>
            <ActionButton onClick={copy}>
              <CopyIcon size={16} />
              Copiar código para probar
            </ActionButton>
          </div>
          <SectionHelp>
            Formato de 90 × 55 mm en hoja A4. Imprime al 100%. El lector debe
            admitir Code 39 sin dígito de control y enviar Enter.
          </SectionHelp>
        </>
      ) : (
        <ActionButton
          tone="primary"
          disabled={lot.qty < presentation.factor}
          onClick={() => onCreate(presentationId)}
        >
          Generar etiqueta
        </ActionButton>
      )}
      {message && <SectionHelp role="status">{message}</SectionHelp>}
    </InventoryDialog>
  )
}
