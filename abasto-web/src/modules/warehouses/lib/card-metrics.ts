/** Alert metrics (below minimum, expiring lots) only look like alerts above zero. */
export const isAlertMetric = (value: number, alertable: boolean) =>
  alertable && value > 0
