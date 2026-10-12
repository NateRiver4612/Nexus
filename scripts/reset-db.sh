#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

ENV_FILE="apps/api/.env"

# Runs a step with a labeled banner; on failure prints the full output (bun /
# drizzle / postgres stacks included) plus a clear exit marker so the failing
# step is obvious instead of the script just dying silently.
run_step() {
  local label="$1"
  shift
  echo "==> $label"
  if ! "$@" 2>&1; then
    echo "!! $label FAILED (exit code: $?) — see the error output above." >&2
    exit 1
  fi
}

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
run_step "Generating migrations" bun run generate

# Applying migrations + seeding talk to Postgres from the host. Local dev runs
# the API/web on the host, and postgres/redis publish their ports to localhost —
# so apps/api/.env resolves `localhost`, which host processes can reach. The
# compose `nexus-api` service is only used for the containerized deploy.
run_step "Applying migrations" bun run migrate

run_step "Seeding database" bun run seed

echo "==> All steps succeeded. Starting the docker stack"
docker compose --env-file "$ENV_FILE" up -d
docker compose ps

echo "==> Done."