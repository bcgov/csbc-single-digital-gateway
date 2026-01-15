#!/bin/sh
# Auto-discover and run all database migrations
# Scans drizzle/ directory for subdirectories containing drizzle.config.ts

set -e

# Wait for database to be ready
wait_for_db() {
  echo "Waiting for database to be ready..."

  max_attempts=${DB_WAIT_MAX_ATTEMPTS:-30}
  attempt=1

  while [ $attempt -le $max_attempts ]; do
    if pg_isready -h "$DEFAULT_DB_HOST" -p "$DEFAULT_DB_PORT" -U "$DEFAULT_DB_USER" -d "$DEFAULT_DB_NAME" > /dev/null 2>&1; then
      echo "Database is ready."
      return 0
    fi

    echo "  Attempt $attempt/$max_attempts - Database not ready, waiting..."
    sleep 2
    attempt=$((attempt + 1))
  done

  echo "Database did not become ready in time."
  return 1
}

wait_for_db

echo ""
echo "Starting database migrations..."

failed=0
count=0

for config in ./drizzle/*/drizzle.config.ts; do
  if [ -f "$config" ]; then
    db_name=$(dirname "$config" | xargs basename)
    count=$((count + 1))
    echo ""
    echo "[$count] Running migrations for database: $db_name"
    echo "    Config: $config"

    if npx drizzle-kit migrate --config="$config"; then
      echo "    Status: SUCCESS"
    else
      echo "    Status: FAILED"
      failed=1
    fi
  fi
done

echo ""
if [ $count -eq 0 ]; then
  echo "No database configurations found in drizzle/*/"
  exit 1
fi

if [ $failed -eq 0 ]; then
  echo "All $count database migration(s) completed successfully."
else
  echo "One or more migrations failed."
  exit 1
fi
