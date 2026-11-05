/** Only same-site absolute paths are valid post-login targets. */
export function safeRedirect(value: unknown): string {
  if (typeof value !== 'string') return '/'
  if (!value.startsWith('/') || value.startsWith('//')) return '/'
  if (value.startsWith('/\\') || value.startsWith('/login')) return '/'
  return value
}
