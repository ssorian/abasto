const pesos = new Intl.NumberFormat('es-MX', {
  style: 'currency',
  currency: 'MXN',
  minimumFractionDigits: 2,
})

export const formatPesos = (cents: number) => pesos.format(cents / 100)

/** Converts a peso amount typed by the user into integer cents. */
export const toCents = (amount: number) =>
  Math.round((amount + Number.EPSILON) * 100)

/** True when the amount has at most two decimals. */
export const isValidMoney = (amount: number) =>
  Number.isFinite(amount) &&
  Math.abs(amount * 100 - Math.round(amount * 100)) < 1e-6
