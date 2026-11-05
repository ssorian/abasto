import { WalletIcon } from 'lucide-react'

/** Intro box at the top of Cobros (`.ops-banner`). */
export function CollectionsBanner() {
  return (
    <div className="mb-[22px] flex items-center gap-4 rounded-[14px] border border-[#dce5ef] bg-[#f1f6fb] px-[23px] py-5 text-[#254b78] max-md:items-start max-md:p-4">
      <WalletIcon size={24} className="shrink-0" />
      <div>
        <strong className="text-[15px]">Cobros y cuentas por cobrar</strong>
        <p className="mt-1 text-[13px] leading-[1.7] text-[#71859e] max-md:text-xs">
          Un pedido a crédito se vuelve deuda al recogerse. Cada abono es
          efectivo que entra a la caja y salda primero los pedidos más antiguos.
        </p>
      </div>
    </div>
  )
}
