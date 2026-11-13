type MaybeElement = { closest?: (selector: string) => unknown } | null

/**
 * Whether an Escape key press belongs to an open combobox list. Dialogs
 * listen for Escape before the input does, so they must leave it to the list.
 */
export const escapeClosesOpenList = (target: unknown) =>
  typeof (target as MaybeElement)?.closest === 'function' &&
  Boolean(
    (target as { closest: (selector: string) => unknown }).closest(
      '[role="combobox"][aria-expanded="true"]',
    ),
  )
