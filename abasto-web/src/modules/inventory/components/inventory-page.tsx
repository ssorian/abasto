import { PageHeading } from '#/components/page-heading'

type InventoryPageProps = {
  /** Pre-filled product search, e.g. from Catálogo "Consultar inventario". */
  initialQuery: string
}

export function InventoryPage(_props: InventoryPageProps) {
  return (
    <PageHeading
      eyebrow="CADA PRODUCTO, EN SU LUGAR"
      title="Inventario"
      description="Ten a la mano lo que entra, lo que sale y lo que tienes."
    />
  )
}
