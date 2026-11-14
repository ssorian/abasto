# syntax=docker/dockerfile:1
#
# Build context: the repository root (Bun workspaces share one bun.lock).
#   docker build -f abasto-web/Dockerfile -t abasto-web .
#
# The container migrates the database on start, then serves the app.
# One-off owner bootstrap inside the running container:
#   OWNER_PASSWORD=... node scripts/create-owner.mjs --name "Nombre" --email dueno@example.com

ARG BUN_VERSION=1.4.2

# --- Dependencies ---
FROM oven/bun:${BUN_VERSION} AS deps
WORKDIR /repo
COPY package.json bun.lock ./
# Every workspace manifest is needed for the frozen lockfile to resolve.
COPY abasto-web/package.json abasto-web/
COPY abasto-mobile/package.json abasto-mobile/
RUN bun install --frozen-lockfile --filter abasto-web

COPY abasto-web/ abasto-web/

# --- Build: app bundle plus self-contained operational scripts ---
FROM deps AS build
WORKDIR /repo/abasto-web
# VITE_* variables are inlined into the client bundle at build time.
ARG VITE_APP_TITLE
ENV VITE_APP_TITLE=${VITE_APP_TITLE}
# Nitro auto-detects its preset from the build runtime: under Bun it would emit
# a Bun-only server that cannot start on the Node runtime image below.
ENV NITRO_PRESET=node-server
RUN bun run build
# The #tanstack-* and tanstack-start-* specifiers are Vite virtual modules,
# lazily imported inside the HTTP handler (pulled in by better-auth's TanStack
# Start plugin); the CLI scripts never reach them.
RUN bun build src/db/migrate.ts src/modules/access/scripts/create-owner.ts \
      --target=node --format=esm --external pg-native \
      --external '#tanstack-*' --external 'tanstack-start-*' \
      --outdir=dist-scripts --entry-naming='[name].mjs'

# --- Runtime ---
FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=3000
COPY --from=build --chown=node:node /repo/abasto-web/.output ./.output
COPY --from=build --chown=node:node /repo/abasto-web/dist-scripts ./scripts
COPY --from=build --chown=node:node /repo/abasto-web/drizzle ./drizzle
# Run through sh: no exec bit or BuildKit-only COPY --chmod needed.
COPY abasto-web/docker-entrypoint.sh ./docker-entrypoint.sh
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD wget -qO- "http://127.0.0.1:${PORT}/" >/dev/null || exit 1
CMD ["sh", "/app/docker-entrypoint.sh"]
