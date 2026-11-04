import { demoProducts } from '#/shared/demo/products'

import type { InventoryProduct } from '#/modules/inventory/types/inventory'

/** Inventory view of the shared demo products (money in pesos, stock in base units). */
export const inventoryProducts: ReadonlyArray<InventoryProduct> =
  demoProducts.map((product) => {
    const pack =
      product.presentations.find(
        (presentation) => presentation.id === product.defaultPresentationId,
      ) ?? product.presentations[0]

    return {
      id: product.id,
      name: product.name,
      brand: product.brand,
      description: product.description,
      category: product.category,
      sku: product.sku,
      barcode: product.barcode,
      image: product.image,
      unit: product.baseUnit,
      packName: pack.name,
      packFactor: pack.factor,
      price: pack.priceCents / 100,
      presentations: product.presentations.map(
        ({ id, name, factor, active }) => ({ id, name, factor, active }),
      ),
    }
  })

export const inventoryCategories = [
  'Bebidas',
  'Abarrotes',
  'Botanas',
  'Lácteos',
]

export function findInventoryProduct(productId: string) {
  return inventoryProducts.find((product) => product.id === productId)
}

/** Like `findInventoryProduct` but for ids that are known to exist. */
export function requireProduct(productId: string) {
  const product = findInventoryProduct(productId)
  if (!product) throw new Error('Producto no encontrado.')
  return product
}
