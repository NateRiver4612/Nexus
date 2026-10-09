#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

ENV_FILE="apps/api/.env"

echo "==> Tearing down Nexus containers, networks, and volumes"
docker compose --env-file "$ENV_FILE" down -v --remove-orphans

echo "==> Removing orphaned docker_nexus-* volumes"
docker volume rm -f $(docker volume ls -q --filter name=docker_nexus-) 2>/dev/null || true

echo "==> Recreating infra containers"
docker compose --env-file "$ENV_FILE" up -d

echo "==> Waiting for Postgres to accept connections"
for i in $(seq 1 60); do
  if docker compose exec -T postgres pg_isready -U "${POSTGRES_USER:-nexus}" -d "${POSTGRES_DB:-nexus}" >/dev/null 2>&1; then
    break
  fi
  sleep 1
done

echo "==> Generating migrations"
# Runs on the host: `drizzle-kit generate` is offline (schema vs snapshots) and
# writes migration files to apps/api/drizzle, so it must see the host filesystem.
bun run generate

# Applying migrations + seeding talk to Postgres, so they run inside the API
# container — `DATABASE_URL`/`REDIS_URL` there use the compose service names
# (postgres/redis), which aren't resolvable from the host. The host's
# apps/api/.env intentionally keeps those service-name URLs too. The runtime
# image only ships apps/ + packages/ (no root package.json), so we target the
# API package's own scripts via --cwd.
echo "==> Applying migrations"
docker compose --env-file "$ENV_FILE" run --rm nexus-api bun run --cwd apps/api migrate

echo "==> Seeding database"
docker compose --env-file "$ENV_FILE" run --rm nexus-api bun run --cwd apps/api seed

echo "==> All steps succeeded. Starting the docker stack"
docker compose --env-file "$ENV_FILE" up -d
docker compose ps

echo "==> Done."