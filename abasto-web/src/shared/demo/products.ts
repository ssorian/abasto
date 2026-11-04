import coca from '#/assets/products/coca.png'
import nutrioli from '#/assets/products/nutrioli.jpg'
import sabritas from '#/assets/products/sabritas.jpg'
import lala from '#/assets/products/lala.jpg'
import costena from '#/assets/products/costena.jpg'
import maseca from '#/assets/products/maseca.jpg'
import ciel from '#/assets/products/ciel.png'
import moderna from '#/assets/products/moderna.png'

import type { Product } from './types'

type ProductSeed = Omit<
  Product,
  'baseUnit' | 'defaultPresentationId' | 'presentations'
> & {
  /** Name of the bulk presentation (also the pricing unit). */
  packName: string
  /** Base units per bulk presentation; 1 means the product is sold by the piece only. */
  packFactor: number
  /** Integer MXN cents per bulk presentation. */
  packPriceCents: number
}

const productSeeds: Array<ProductSeed> = [
  {
    id: 'coca',
    name: 'Coca-Cola Original',
    brand: 'Coca-Cola',
    description: '600 ml · Caja con 24 botellas',
    category: 'Bebidas',
    sku: 'BEB-001',
    barcode: '7501055300075',
    image: coca,
    costCents: 39200,
    packName: 'cajas',
    packFactor: 24,
    packPriceCents: 43800,
  },
  {
    id: 'nutrioli',
    name: 'Aceite Nutrioli',
    brand: 'Nutrioli',
    description: '1.05 L · Botella individual',
    category: 'Abarrotes',
    sku: 'ABA-002',
    barcode: '7501001521004',
    image: nutrioli,
    costCents: 3100,
    packName: 'piezas',
    packFactor: 1,
    packPriceCents: 3800,
  },
  {
    id: 'sabritas',
    name: 'Sabritas Original',
    brand: 'Sabritas',
    description: '45 g · Caja con 30 bolsas',
    category: 'Botanas',
    sku: 'BOT-003',
    barcode: '7501011111455',
    image: sabritas,
    costCents: 42000,
    packName: 'cajas',
    packFactor: 30,
    packPriceCents: 48600,
  },
  {
    id: 'lala',
    name: 'Leche Lala Entera',
    brand: 'Lala',
    description: '1 L · Caja con 12 piezas',
    category: 'Lácteos',
    sku: 'LAC-004',
    barcode: '7501020513034',
    image: lala,
    costCents: 27600,
    packName: 'cajas',
    packFactor: 12,
    packPriceCents: 32400,
  },
  {
    id: 'costena',
    name: 'Frijoles La Costeña',
    brand: 'La Costeña',
    description: '560 g · Caja con 12 latas',
    category: 'Abarrotes',
    sku: 'ABA-005',
    barcode: '7501017005017',
    image: costena,
    costCents: 34800,
    packName: 'cajas',
    packFactor: 12,
    packPriceCents: 39600,
  },
  {
    id: 'maseca',
    name: 'Harina Maseca',
    brand: 'Maseca',
    description: '1 kg · Bulto con 10 piezas',
    category: 'Abarrotes',
    sku: 'ABA-006',
    barcode: '7501077400036',
    image: maseca,
    costCents: 24000,
    packName: 'bultos',
    packFactor: 10,
    packPriceCents: 28000,
  },
  {
    id: 'ciel',
    name: 'Agua Ciel',
    brand: 'Ciel',
    description: '1 L · Paquete con 12 botellas',
    category: 'Bebidas',
    sku: 'BEB-007',
    barcode: '7501055332007',
    image: ciel,
    costCents: 15200,
    packName: 'paquetes',
    packFactor: 12,
    packPriceCents: 18000,
  },
  {
    id: 'moderna',
    name: 'Spaghetti La Moderna',
    brand: 'La Moderna',
    description: '200 g · Caja con 20 bolsas',
    category: 'Abarrotes',
    sku: 'ABA-008',
    barcode: '7501018310103',
    image: moderna,
    costCents: 9600,
    packName: 'cajas',
    packFactor: 20,
    packPriceCents: 12000,
  },
]

function buildProduct(seed: ProductSeed): Product {
  const { packName, packFactor, packPriceCents, ...product } = seed

  // Pack-only products (factor 1) have a single presentation that carries the barcode.
  if (packFactor === 1) {
    return {
      ...product,
      baseUnit: packName,
      defaultPresentationId: 'unit',
      presentations: [
        {
          id: 'unit',
          name: packName,
          factor: 1,
          priceCents: packPriceCents,
          barcode: product.barcode,
          active: true,
        },
      ],
    }
  }

  return {
    ...product,
    baseUnit: 'piezas',
    defaultPresentationId: 'pack',
    presentations: [
      {
        id: 'unit',
        name: 'Pieza',
        factor: 1,
        priceCents: Math.round(packPriceCents / packFactor),
        barcode: '',
        active: true,
      },
      {
        id: 'pack',
        name: packName,
        factor: packFactor,
        priceCents: packPriceCents,
        barcode: product.barcode,
        active: true,
      },
    ],
  }
}

export const demoProducts: ReadonlyArray<Product> =
  productSeeds.map(buildProduct)

export function findProduct(productId: string) {
  return demoProducts.find((product) => product.id === productId)
}
