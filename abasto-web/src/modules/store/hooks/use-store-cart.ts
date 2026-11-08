import { useCallback, useSyncExternalStore } from 'react'

import {
  CART_STORAGE_KEY,
  addToCart,
  cartCount,
  clearCart,
  linesOf,
  parseCarts,
  removeFromCart,
  serializeCarts,
  setCartQuantity,
} from '#/modules/store/lib/cart'
import type { Carts } from '#/modules/store/lib/cart'

const listeners = new Set<() => void>()
const serverCarts: Carts = {}
let cachedRaw: string | null | undefined
let cachedCarts: Carts = serverCarts

function readCarts(): Carts {
  const raw = window.localStorage.getItem(CART_STORAGE_KEY)
  if (raw !== cachedRaw) {
    cachedRaw = raw
    cachedCarts = parseCarts(raw)
  }
  return cachedCarts
}

function writeCarts(next: Carts) {
  try {
    window.localStorage.setItem(CART_STORAGE_KEY, serializeCarts(next))
  } catch {
    // Storage full or blocked: the cart still works for this page view.
    cachedRaw = undefined
    cachedCarts = next
  }
  listeners.forEach((listener) => listener())
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  const onStorage = (event: StorageEvent) => {
    if (event.key === CART_STORAGE_KEY) listener()
  }
  window.addEventListener('storage', onStorage)
  return () => {
    listeners.delete(listener)
    window.removeEventListener('storage', onStorage)
  }
}

/** The cart of one warehouse, shared by every component through localStorage. */
export function useStoreCart(warehouseId: string) {
  const carts = useSyncExternalStore(subscribe, readCarts, () => serverCarts)
  const update = useCallback(
    (change: (current: Carts) => Carts) => writeCarts(change(readCarts())),
    [],
  )
  return {
    lines: linesOf(carts, warehouseId),
    count: cartCount(carts, warehouseId),
    add: (presentationId: string, quantity: number) =>
      update((current) =>
        addToCart(current, warehouseId, presentationId, quantity),
      ),
    setQuantity: (presentationId: string, quantity: number) =>
      update((current) =>
        setCartQuantity(current, warehouseId, presentationId, quantity),
      ),
    remove: (presentationId: string) =>
      update((current) => removeFromCart(current, warehouseId, presentationId)),
    clear: () => update((current) => clearCart(current, warehouseId)),
  }
}
