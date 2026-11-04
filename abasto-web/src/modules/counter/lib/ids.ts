/** Short readable id; only call from event handlers (never during render). */
export const makeId = (prefix: string) =>
  `${prefix}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`
