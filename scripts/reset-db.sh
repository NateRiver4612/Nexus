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
bun run db:generate

echo "==> Applying migrations"
bun run db:migrate

echo "==> Seeding database"
bun run db:seed

echo "==> All steps succeeded. Starting the docker stack"
docker compose --env-file "$ENV_FILE" up -d
docker compose ps

echo "==> Done."