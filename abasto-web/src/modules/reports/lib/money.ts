const pesos = new Intl.NumberFormat('es-MX', {
  style: 'currency',
  currency: 'MXN',
  minimumFractionDigits: 2,
})

/** Formats MXN cents, e.g. 795000 → "$7,950.00". */
export const formatMoney = (cents: number) => pesos.format(cents / 100)
