#!/bin/sh
set -e

if [ -n "${DATABASE_URL:-}" ] && [ "${RUN_MIGRATIONS:-true}" != "false" ]; then
  echo "Applying database migrations..."
  npx prisma db migrate
fi

exec "$@"
