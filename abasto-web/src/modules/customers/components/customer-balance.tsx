import { useEffect, useState } from 'react'

import { useCreditActions } from '#/modules/credit/hooks/use-credit-actions'
import { formatCents } from '#/modules/pricing/lib/money'
import type { CustomerBalance as Balance } from '#/modules/credit/services/customer-ledger'

/**
 * Balance and overdue amount of a customer. Only people who can receive
 * payments may read it; for anyone else the line simply does not appear.
 */
export function CustomerBalance({ customerId }: { customerId: string }) {
  const actions = useCreditActions()
  const [balance, setBalance] = useState<Balance>()

  useEffect(() => {
    actions.balance(customerId).then(setBalance, () => setBalance(undefined))
    // Loaded once per customer.
  }, [customerId])

  if (!balance) return null
  return (
    <p>
      Saldo: {formatCents(balance.balanceCents)} · Vencido:{' '}
      {balance.overdueCents > 0 ? (
        <strong className="text-[#a1372e]">
          {formatCents(balance.overdueCents)}
        </strong>
      ) : (
        'nada vencido'
      )}
    </p>
  )
}
