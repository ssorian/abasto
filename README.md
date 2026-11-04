# Abasto

Bun workspace containing the existing Expo mobile app (`abasto-mobile`) and TanStack Start web app (`abasto-web`). Run commands from this repository root. Both app manifests and their configuration remain independently owned by their apps.

## Install

Install [Bun](https://bun.sh/) (validated with Bun 1.4.2), then:

```sh
bun install --frozen-lockfile
```

Use `bun install` when intentionally updating the single root `bun.lock`. Do not generate app-local lockfiles.

## Develop

```sh
bun run mobile           # Expo development server
bun run mobile:android   # Expo Android development server
bun run web              # Vite development server
```

You can also target either workspace directly: `bun run --filter abasto-mobile start` or `bun run --filter abasto-web dev`. See each app's README for platform-specific prerequisites and setup. Do not run Expo export as a validation command: it may rewrite the mobile TypeScript configuration.

## Check

```sh
bun run mobile:lint
bun run web:lint
bun run web:check
bun run web:build
```

The workspace-specific commands above forward to the existing scripts without changing either app's package manifest.
