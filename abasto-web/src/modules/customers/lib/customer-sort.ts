/** Active customers first; each group keeps the incoming (name) order. */
export function activeFirst<T extends { active: boolean }>(
  customers: ReadonlyArray<T>,
): Array<T> {
  return [...customers].sort((a, b) => Number(b.active) - Number(a.active))
}
