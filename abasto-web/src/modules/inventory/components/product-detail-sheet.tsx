import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import {
  ArrowUpFromLineIcon,
  CheckIcon,
  PlusIcon,
  ShoppingBagIcon,
  SlidersHorizontalIcon,
  WarehouseIcon,
} from 'lucide-react'

import {
  ActionButton,
  IconButton,
  TextLink,
} from '#/modules/inventory/components/action-button'
import {
  SectionHelp,
  SignedQuantity,
  WarningInline,
} from '#/modules/inventory/components/info-blocks'
import { LotsPanel } from '#/modules/inventory/components/lots-panel'
import { MovementIcon } from '#/modules/inventory/components/movements-tab'
import { EmptyPanel } from '#/modules/inventory/components/empty-panel'
import { Picker } from '#/modules/inventory/components/picker'
import {
  ProductThumb,
  tintFor,
} from '#/modules/inventory/components/product-thumb'
import { StockBadge } from '#/modules/inventory/components/stock-badge'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '#/components/ui/sheet'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '#/components/ui/tabs'
import { dateLabel, money, timeLabel } from '#/modules/inventory/lib/format'
import { setMinimumStock } from '#/modules/inventory/lib/operations'
import {
  available,
  averageCost,
  blockedQuantity,
  stockFor,
  stockStatus,
} from '#/modules/inventory/lib/stock'
import { presentationBreakdown } from '#/shared/demo/selectors'
import { findProduct } from '#/shared/demo/products'
import { warehouseNames } from '#/shared/demo/types'
import { cn } from '#/lib/utils/cn'

import type { WarehouseName } from '#/shared/demo/types'
import type { ApplyOperation } from '#/modules/inventory/hooks/use-inventory-state'
import type {
  InventoryProduct,
  InventoryState,
  Movement,
} from '#/modules/inventory/types/inventory'

type ProductDetailSheetProps = {
  state: InventoryState
  product: InventoryProduct | null
  warehouse: WarehouseName
  onWarehouseChange: (warehouse: WarehouseName) => void
  apply: ApplyOperation
  onClose: () => void
  onEntry: () => void
  onOperation: (type: 'out' | 'adjust') => void
  onMovement: (movement: Movement) => void
}

const triggerClass =
  'text-xs data-[state=active]:bg-white data-[state=active]:text-[#1c3a5e] data-[state=active]:shadow-[0_1px_4px_#16396514]'

/** Side panel with summary, lots and movements of one product in one warehouse. */
export function ProductDetailSheet({
  state,
  product,
  warehouse,
  onWarehouseChange,
  apply,
  onClose,
  onEntry,
  onOperation,
  onMovement,
}: ProductDetailSheetProps) {
  return (
    <Sheet open={!!product} onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        className="gap-0 overflow-hidden bg-white text-base data-[side=right]:w-[540px] data-[side=right]:max-w-[100vw] data-[side=right]:sm:max-w-[540px]"
        aria-describedby={undefined}
      >
        {product && (
          <DetailBody
            key={`${product.id}-${warehouse}`}
            state={state}
            product={product}
            warehouse={warehouse}
            onWarehouseChange={onWarehouseChange}
            apply={apply}
            onEntry={onEntry}
            onOperation={onOperation}
            onMovement={onMovement}
          />
        )}
      </SheetContent>
    </Sheet>
  )
}

function DetailBody({
  state,
  product,
  warehouse,
  onWarehouseChange,
  apply,
  onEntry,
  onOperation,
  onMovement,
}: Omit<ProductDetailSheetProps, 'product' | 'onClose'> & {
  product: InventoryProduct
}) {
  const stock = stockFor(state, product.id, warehouse)
  const [minimum, setMinimum] = useState(String(stock.min))
  const movements = state.movements.filter(
    (item) => item.productId === product.id && item.warehouse === warehouse,
  )
  const blocked = blockedQuantity(stock)
  const status = stockStatus(stock)
  const sellable = stock.physical - blocked
  const catalogProduct = findProduct(product.id)
  const navigate = useNavigate()

  const saveMinimum = () => {
    const value = Number(minimum)
    if (minimum === '' || !Number.isSafeInteger(value) || value < 0) {
      apply(() => {
        throw new Error('Ingresa un mínimo válido.')
      }, '')
      return
    }
    apply(
      (s) => setMinimumStock(s, product.id, warehouse, value),
      'Stock mínimo actualizado.',
    )
  }

  return (
    <>
      <SheetHeader className="shrink-0 gap-1.5 px-[29px] pt-[31px] pb-[22px]">
        <span className="text-xs font-bold tracking-[1.5px] text-ink-eyebrow">
          DETALLE DE INVENTARIO
        </span>
        <SheetTitle className="mt-2 text-[25px] font-semibold tracking-[-0.7px]">
          {product.name}
        </SheetTitle>
        <SheetDescription className="text-[13px]">
          {product.description}
        </SheetDescription>
      </SheetHeader>
      <div className="flex-1 overflow-auto px-[29px] pb-5">
        <div
          className={cn(
            'relative flex h-[186px] items-center justify-center rounded-[12px]',
            tintFor(product.id),
          )}
        >
          <div className="h-[155px] max-w-[70%]">
            <ProductThumb product={product} />
          </div>
          <StockBadge dot value={status} className="absolute top-4 right-4" />
        </div>
        <div className="my-[23px] flex items-center gap-2.5 text-[#6883a3]">
          <WarehouseIcon size={18} />
          <Picker
            label="Almacén del producto"
            value={warehouse}
            onChange={(next) => onWarehouseChange(next as WarehouseName)}
            options={warehouseNames.map((name) => ({
              value: name,
              label: `Almacén ${name}`,
            }))}
            className="flex-1"
          />
        </div>
        <Tabs defaultValue="Resumen" className="flex-col">
          <TabsList className="mb-[19px] h-[42px] w-full p-1">
            {['Resumen', 'Lotes', 'Movimientos'].map((name) => (
              <TabsTrigger key={name} value={name} className={triggerClass}>
                {name}
              </TabsTrigger>
            ))}
          </TabsList>
          <TabsContent value="Resumen" className="text-base">
            <div className="grid grid-cols-3 rounded-[10px] border border-[#e1e8f0] px-[5px] py-5">
              {[
                ['Disponible', available(stock), 'text-[#173f6c]'],
                ['Reservado', stock.reserved, 'text-[#466383]'],
                ['Físico', stock.physical, 'text-[#466383]'],
              ].map(([label, value, tone], index) => (
                <div
                  key={label}
                  className={cn(
                    'flex flex-col gap-2 text-center',
                    index > 0 && 'border-l border-[#e3eaf2]',
                  )}
                >
                  <span className="text-xs text-[#8292a7]">{label}</span>
                  <strong
                    className={cn(
                      'text-[29px] leading-[1.2] font-[650]',
                      tone as string,
                    )}
                  >
                    {value}
                  </strong>
                </div>
              ))}
            </div>
            <SectionHelp>
              {catalogProduct
                ? presentationBreakdown(catalogProduct, stock.physical)
                : `${stock.physical} ${product.unit}`}
            </SectionHelp>
            <p className="mt-1.5 mb-[18px] text-right text-xs text-[#98a5b6]">
              Existencias en {product.unit} ·{' '}
              <b>{blocked} bloqueadas o vencidas</b>
            </p>
            {sellable < stock.reserved && (
              <WarningInline>
                Hay reservas sin mercancía vendible suficiente. Revisa los
                pedidos antes de despachar.
              </WarningInline>
            )}
            <div className="mt-3 rounded-[9px] bg-[#f6f8fb] p-[18px]">
              <CostRow
                label="Último costo de entrada"
                value={stock.received ? money(stock.last) : '—'}
              />
              <CostRow
                label="Costo promedio actual"
                value={stock.physical ? money(averageCost(stock)) : '—'}
              />
              <small className="mt-[9px] block text-xs leading-[1.7] text-[#9aa7b6]">
                Por {product.unit}. Calculado a partir de las existencias
                actuales.
              </small>
            </div>
            <div className="flex items-center gap-2 border-b border-[#ebf0f5] py-[23px]">
              <div className="flex-1">
                <strong className="text-[13px] font-semibold">
                  Aviso de stock bajo
                </strong>
                <p className="mt-[5px] text-xs text-[#8d9bac]">
                  Te avisamos al llegar a este nivel.
                </p>
              </div>
              <input
                type="number"
                min="0"
                step="1"
                aria-label="Stock mínimo"
                value={minimum}
                onChange={(event) => setMinimum(event.target.value)}
                className="w-[55px] rounded-[7px] border border-[#dce5ef] p-2 text-center text-[13px] [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
              />
              <IconButton
                aria-label="Guardar stock mínimo"
                onClick={saveMinimum}
              >
                <CheckIcon size={18} />
              </IconButton>
            </div>
            {stock.reserved > 0 && (
              <div className="mt-[15px] flex items-center gap-[13px] rounded-[9px] border border-[#d9e5f2] bg-[#eaf1fa] p-[13px] text-xs leading-[1.7] text-[#54759a]">
                <ShoppingBagIcon size={17} />
                <p className="flex-1">
                  {stock.reserved} {product.unit} comprometidas en pedidos
                  pendientes.
                </p>
                <TextLink
                  className="text-xs"
                  onClick={() => void navigate({ to: '/mostrador' })}
                >
                  Ver
                </TextLink>
              </div>
            )}
            <div className="mt-[22px] grid grid-cols-2 gap-2.5">
              <ActionButton
                className="px-2 py-[11px] text-xs"
                onClick={() => onOperation('out')}
              >
                <ArrowUpFromLineIcon size={17} />
                Salida manual
              </ActionButton>
              <ActionButton
                className="px-2 py-[11px] text-xs"
                onClick={() => onOperation('adjust')}
              >
                <SlidersHorizontalIcon size={17} />
                Ajustar inventario
              </ActionButton>
            </div>
          </TabsContent>
          <TabsContent value="Lotes" className="text-base">
            <LotsPanel
              state={state}
              product={product}
              warehouse={warehouse}
              apply={apply}
            />
          </TabsContent>
          <TabsContent value="Movimientos" className="text-base">
            {movements.length ? (
              movements.map((movement) => (
                <button
                  key={movement.id}
                  type="button"
                  onClick={() => onMovement(movement)}
                  className="flex w-full items-center gap-3 border-b border-[#e9eef5] py-[18px] text-left"
                >
                  <MovementIcon qty={movement.qty} />
                  <span>
                    <strong className="block text-[13px]">
                      {movement.type}
                    </strong>
                    <small className="mt-1.5 block text-xs text-[#8b99aa]">
                      {dateLabel(movement.date)} · {timeLabel(movement.date)}
                    </small>
                  </span>
                  <b className="ml-auto text-[19px]">
                    <SignedQuantity qty={movement.qty} />
                  </b>
                </button>
              ))
            ) : (
              <EmptyPanel
                title="Sin movimientos recientes"
                description="Las operaciones que registres aparecerán aquí."
              />
            )}
          </TabsContent>
        </Tabs>
      </div>
      <div className="shrink-0 border-t border-[#e4eaf1] px-[29px] pt-[18px] pb-[22px] shadow-[0_-6px_20px_#18365404]">
        <ActionButton tone="primary" full onClick={onEntry}>
          <PlusIcon size={18} />
          Registrar entrada
        </ActionButton>
      </div>
    </>
  )
}

function CostRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 py-[7px] text-xs text-[#7c8fa6] md:text-sm">
      <span>{label}</span>
      <strong className="text-base font-semibold text-[#385775]">
        {value}
      </strong>
    </div>
  )
}
