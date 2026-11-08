import { StatusBadge } from '#/components/status-badge'

import type { StatusTone } from '#/components/status-badge'

const tones: Record<string, StatusTone> = {
  Disponible: 'green',
  Entregado: 'green',
  'Stock bajo': 'amber',
  'Por vencer': 'amber',
  'Revisar reservas': 'amber',
  Agotado: 'red',
  Vencido: 'red',
  Bloqueado: 'red',
  Reservado: 'blue',
  'En tránsito': 'blue',
  Pedido: 'blue',
  Recibido: 'green',
  'Recibido con diferencia': 'amber',
}

/** Status badge with the reference dot and tone mapping. */
export function StockBadge({
  value,
  dot = false,
  className,
}: {
  value: string
  /** Leading dot, used by product cards and the detail header. */
  dot?: boolean
  className?: string
}) {
  return (
    <StatusBadge tone={tones[value] ?? 'gray'} className={className}>
      {dot && <span className="block size-1 rounded-full bg-current" />}
      {value}
    </StatusBadge>
  )
}
