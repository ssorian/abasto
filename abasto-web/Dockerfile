# syntax=docker/dockerfile:1
#
# Build context: the repository root (Bun workspaces share one bun.lock).
#   docker build -f abasto-web/Dockerfile -t abasto-web .                    # app
#   docker build -f abasto-web/Dockerfile --target migrate -t abasto-web-migrate .

ARG BUN_VERSION=1.4.2

# --- Dependencies: full install (dev deps included) for build and tooling ---
FROM oven/bun:${BUN_VERSION} AS deps
WORKDIR /repo
COPY package.json bun.lock ./
# Every workspace manifest is needed for the frozen lockfile to resolve.
COPY abasto-web/package.json abasto-web/
COPY abasto-mobile/package.json abasto-mobile/
RUN bun install --frozen-lockfile --filter abasto-web

COPY abasto-web/ abasto-web/

# --- Migrations and one-off admin scripts (db:migrate, auth:create-owner) ---
FROM deps AS migrate
WORKDIR /repo/abasto-web
ENV NODE_ENV=production
CMD ["bun", "--bun", "run", "db:migrate"]

# --- Build: VITE_* variables are inlined into the client bundle here ---
FROM deps AS build
WORKDIR /repo/abasto-web
ARG VITE_APP_TITLE
ENV VITE_APP_TITLE=${VITE_APP_TITLE}
# Nitro auto-detects its preset from the build runtime: under Bun it would emit
# a Bun-only server that cannot start on the Node runtime image below.
ENV NITRO_PRESET=node-server
RUN bun run build

# --- Runtime: only the self-contained Nitro output ---
FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=3000
COPY --from=build --chown=node:node /repo/abasto-web/.output ./.output
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -qO- "http://127.0.0.1:${PORT}/" >/dev/null || exit 1
CMD ["node", ".output/server/index.mjs"]
