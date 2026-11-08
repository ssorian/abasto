Welcome to your new TanStack Start app!

# Getting Started

To run this application:

```bash
bun install
bun --bun run dev
```

# Database and tests

Postgres 17 runs in Docker (`docker-compose.yml`) as two services: `db` (port 55450, database `abasto`, durable volume) for development and `db-test` (port 55451, database `abasto_test`, in memory with fsync off) for tests. `db-test` starts empty every time it is recreated.

```bash
bun run db:up     # start both Postgres services and wait until they are healthy
bun run db:migrate
bun run test      # bun test against abasto_test
bun run db:down   # stop it (data stays in the abasto-db volume)
```

Set these in `.env.local`:

```bash
DATABASE_URL=postgresql://abasto:abasto@localhost:55450/abasto
TEST_DATABASE_URL=postgresql://abasto:abasto@localhost:55451/abasto_test
```

`TEST_DATABASE_URL` is optional (that value is the default). Tests refuse to run against a database whose name does not end in `_test`, and they apply the migrations in `drizzle/` before running.

# Building For Production

To build this application for production:

```bash
bun --bun run build
```

## Styling

This project uses [Tailwind CSS](https://tailwindcss.com/) for styling.

### Removing Tailwind CSS

If you prefer not to use Tailwind CSS:

1. Remove the demo pages in `src/routes/demo/`
2. Replace the Tailwind import in `src/styles.css` with your own styles
3. Remove `tailwindcss()` from the plugins array in `vite.config.ts`
4. Remove `@tailwindcss/vite` and `tailwindcss` from `package.json`

## Linting & Formatting

This project uses [eslint](https://eslint.org/) and [prettier](https://prettier.io/) for linting and formatting. Eslint is configured using [tanstack/eslint-config](https://tanstack.com/config/latest/docs/eslint). The following scripts are available:

```bash
bun --bun run lint
bun --bun run format
bun --bun run check
```

## Deploy with Nitro

This project uses Nitro as a generic server adapter, so it can run on any Node-compatible host.

```bash
bun run build
node .output/server/index.mjs
```

The build output is a self-contained Node server. To deploy, push the `.output/` directory to your host (Render, Fly.io, your own VPS, etc.) and run the server command above.

For host-specific presets (Vercel, Netlify, Cloudflare, AWS Lambda, etc.) and tuning, see https://v3.nitro.build/deploy.

## T3Env

- You can use T3Env to add type safety to your environment variables.
- Add Environment variables to the `src/env.mjs` file.
- Use the environment variables in your code.

### Usage

```ts
import { env } from '#/env'

console.log(env.VITE_APP_TITLE)
```

## Accounts and roles

Better Auth stores users and sessions in Postgres (`src/db/auth-schema.ts`). Public sign-up is disabled: the owner creates staff accounts and assigns them to warehouses as `manager` (one role per warehouse; the owner sees everything).

1. Set `BETTER_AUTH_SECRET` in `.env.local` (`bunx --bun @better-auth/cli secret` generates one).
2. Create the first owner once:

   ```bash
   bun run auth:create-owner --name "Nombre" --email dueno@example.com
   ```

   The password is read from `OWNER_PASSWORD` or asked interactively (at least 8 characters). A second run fails with `Ya existe un dueño registrado.`

## Seed data

`bun run db:seed` loads a sample business into the development database through the real services: four warehouses (Tejupilco, Arcelia, Luvianos, Amatepec) each with its own manager, suppliers Grupo Lala and Alpura, eighteen dairy products with official brand photos and per-warehouse prices, lots with expiry dates, customers with credit and commercial rules, orders in every state, open and closed cash drawers, an abono, a pending credit authorization, an overdue balance and transfers.

- It only runs on an empty database. An owner created with `auth:create-owner` is reused; otherwise it creates `dueno@abasto.local`.
- Every seeded user gets the password in `SEED_PASSWORD` (default `abasto-2026`); the command prints the users.
- It refuses to run when `NODE_ENV=production` and never deletes data. To start over, recreate the development database (for example `docker compose down -v`, `bun run db:up`, `bun run db:migrate`), which erases all of its data.

## Routing

This project uses [TanStack Router](https://tanstack.com/router) with file-based routing. Routes are managed as files in `src/routes`.

### Adding A Route

To add a new route to your application just add a new file in the `./src/routes` directory.

TanStack will automatically generate the content of the route file for you.

Now that you have two routes you can use a `Link` component to navigate between them.

### Adding Links

To use SPA (Single Page Application) navigation you will need to import the `Link` component from `@tanstack/react-router`.

```tsx
import { Link } from '@tanstack/react-router'
```

Then anywhere in your JSX you can use it like so:

```tsx
<Link to="/about">About</Link>
```

This will create a link that will navigate to the `/about` route.

More information on the `Link` component can be found in the [Link documentation](https://tanstack.com/router/v1/docs/framework/react/api/router/linkComponent).

### Using A Layout

In the File Based Routing setup the layout is located in `src/routes/__root.tsx`. Anything you add to the root route will appear in all the routes. The route content will appear in the JSX where you render `{children}` in the `shellComponent`.

Here is an example layout that includes a header:

```tsx
import { HeadContent, Scripts, createRootRoute } from '@tanstack/react-router'

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { title: 'My App' },
    ],
  }),
  shellComponent: ({ children }) => (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        <header>
          <nav>
            <Link to="/">Home</Link>
            <Link to="/about">About</Link>
          </nav>
        </header>
        {children}
        <Scripts />
      </body>
    </html>
  ),
})
```

More information on layouts can be found in the [Layouts documentation](https://tanstack.com/router/latest/docs/framework/react/guide/routing-concepts#layouts).

## Server Functions

TanStack Start provides server functions that allow you to write server-side code that seamlessly integrates with your client components.

```tsx
import { createServerFn } from '@tanstack/react-start'

const getServerTime = createServerFn({
  method: 'GET',
}).handler(async () => {
  return new Date().toISOString()
})

// Use in a component
function MyComponent() {
  const [time, setTime] = useState('')

  useEffect(() => {
    getServerTime().then(setTime)
  }, [])

  return <div>Server time: {time}</div>
}
```

## API Routes

You can create API routes by using the `server` property in your route definitions:

```tsx
import { createFileRoute } from '@tanstack/react-router'
import { json } from '@tanstack/react-start'

export const Route = createFileRoute('/api/hello')({
  server: {
    handlers: {
      GET: () => json({ message: 'Hello, World!' }),
    },
  },
})
```

## Data Fetching

There are multiple ways to fetch data in your application. You can use TanStack Query to fetch data from a server. But you can also use the `loader` functionality built into TanStack Router to load the data for a route before it's rendered.

For example:

```tsx
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/people')({
  loader: async () => {
    const response = await fetch('https://swapi.dev/api/people')
    return response.json()
  },
  component: PeopleComponent,
})

function PeopleComponent() {
  const data = Route.useLoaderData()
  return (
    <ul>
      {data.results.map((person) => (
        <li key={person.name}>{person.name}</li>
      ))}
    </ul>
  )
}
```

Loaders simplify your data fetching logic dramatically. Check out more information in the [Loader documentation](https://tanstack.com/router/latest/docs/framework/react/guide/data-loading#loader-parameters).

# Learn More

You can learn more about all of the offerings from TanStack in the [TanStack documentation](https://tanstack.com).

For TanStack Start specific documentation, visit [TanStack Start](https://tanstack.com/start).
