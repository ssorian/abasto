const origin = 'http://same.invalid'

/** Only same-site absolute paths are valid post-login targets. */
export function safeRedirect(value: unknown): string {
  if (typeof value !== 'string' || !value.startsWith('/')) return '/'
  // Browsers strip tabs/newlines and treat `\` as `/`, so `/\t/evil.com`
  // would become protocol-relative: reject them outright.
  if ([...value].some((c) => c <= ' ' || c === '\\')) return '/'
  const url = new URL(value, origin)
  if (url.origin !== origin || url.pathname.startsWith('/login')) return '/'
  return value
}
