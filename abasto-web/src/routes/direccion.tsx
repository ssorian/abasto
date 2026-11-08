import { createFileRoute, redirect } from '@tanstack/react-router'

// The owner console moved into Reportes; keep old bookmarks working.
export const Route = createFileRoute('/direccion')({
  beforeLoad: () => {
    throw redirect({ to: '/reportes' })
  },
})
