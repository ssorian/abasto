/** No 0/O, 1/l/I: the owner reads or types it to the customer. */
export const PASSWORD_ALPHABET =
  'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789'

const DEFAULT_LENGTH = 12

type FillRandom = (bytes: Uint8Array) => Uint8Array

/** A random readable password; rejects biased bytes so every character is equally likely. */
export function generateStorePassword(
  length = DEFAULT_LENGTH,
  fill: FillRandom = (bytes) => crypto.getRandomValues(bytes),
): string {
  const size = PASSWORD_ALPHABET.length
  const limit = 256 - (256 % size)
  let password = ''
  while (password.length < length) {
    for (const byte of fill(new Uint8Array(length * 2))) {
      if (byte >= limit) continue
      password += PASSWORD_ALPHABET[byte % size]
      if (password.length === length) break
    }
  }
  return password
}
