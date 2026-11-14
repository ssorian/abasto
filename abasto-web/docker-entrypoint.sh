#!/bin/sh
# Migrate first; only a fully migrated database gets the new server.
set -eu
node /app/scripts/migrate.mjs /app/drizzle
exec node /app/.output/server/index.mjs
