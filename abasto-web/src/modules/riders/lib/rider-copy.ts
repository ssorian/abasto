/** Shown when renaming a rider: the name is read from the rider on every delivery. */
export const renameWarning = (currentName: string) =>
  `El nombre también cambia en los repartos anteriores de ${currentName}, incluidos los ya liquidados.`
