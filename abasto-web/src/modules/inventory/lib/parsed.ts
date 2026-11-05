/** Result of parsing text typed by the user; messages are ready to show. */
export type Parsed<T> = { ok: true; value: T } | { ok: false; message: string }

export const fail = (message: string): Parsed<never> => ({ ok: false, message })
