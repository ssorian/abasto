import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { tanstackStartCookies } from 'better-auth/tanstack-start'
import { db } from '#/db'
import { account, session, user, verification } from '#/db/auth-schema'

export const minPasswordLength = 8

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: 'pg',
    schema: { user, session, account, verification },
  }),
  emailAndPassword: {
    enabled: true,
    // Only the owner creates accounts (see modules/access/services/access.ts).
    disableSignUp: true,
    minPasswordLength,
  },
  user: {
    additionalFields: {
      role: { type: 'string', defaultValue: 'staff', input: false },
    },
  },
  plugins: [tanstackStartCookies()],
})
