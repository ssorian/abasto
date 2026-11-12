import { useSyncExternalStore } from 'react'

const subscribe = () => () => {}

/**
 * False while rendering on the server and during hydration, true afterwards.
 * Server HTML shows controls before their handlers exist; clicks on them are
 * lost, so controls use this to stay disabled until the client hydrates.
 */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  )
}
