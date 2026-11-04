/** Test helpers that go through the real Better Auth HTTP endpoints. */
import { auth } from '#/lib/auth'

const baseURL = () => process.env.BETTER_AUTH_URL ?? 'http://localhost:3000'

const post = (path: string, body: unknown, headers?: Headers) =>
  auth.handler(
    new Request(`${baseURL()}/api/auth${path}`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        origin: baseURL(),
        cookie: headers?.get('cookie') ?? '',
      },
      body: JSON.stringify(body),
    }),
  )

/** Signs in and returns request headers carrying the session cookie. */
export async function signIn(email: string, password: string) {
  const response = await post('/sign-in/email', { email, password })
  if (!response.ok) throw new Error(`sign-in failed: ${response.status}`)
  const cookie = response.headers
    .getSetCookie()
    .map((value) => value.split(';')[0])
    .join('; ')
  return new Headers({ cookie })
}

export const signUp = (email: string, password: string) =>
  post('/sign-up/email', { name: 'Anyone', email, password })

/** Calls Better Auth's self-service profile update with the session in `headers`. */
export const updateOwnUser = (headers: Headers, body: unknown) =>
  post('/update-user', body, headers)
