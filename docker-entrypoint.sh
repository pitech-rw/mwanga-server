#!/bin/sh
set -e

if [ -n "${DATABASE_URL:-}" ] && [ "${RUN_MIGRATIONS:-true}" != "false" ]; then
  echo "Applying database migrations..."
  npm run db:migrate
fi

exec "$@"
