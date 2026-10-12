#!/usr/bin/env bash
# Runs ON the EC2 box. Called by the GitHub Actions deploy job, or by hand for a manual rollback:
#   AWS_REGION=us-east-1 ECR_REGISTRY=<acct>.dkr.ecr.us-east-1.amazonaws.com IMAGE_TAG=<old-sha> bash remote-deploy.sh
set -euo pipefail

cd /opt/nexus
: "${ECR_REGISTRY:?ECR_REGISTRY is required}"
: "${IMAGE_TAG:?IMAGE_TAG is required}"
: "${AWS_REGION:?AWS_REGION is required}"
export ECR_REGISTRY IMAGE_TAG

# ┌─────────────────────────────────────────────────────────────────────────────┐
# │ EDIT THIS: the command that applies DB migrations, run inside the api image.│
# │ It must point at a script in a WORKSPACE package.json (the image has no     │
# │ root package.json). Find yours with:                                        │
# │   grep -rn "migrate" --include=package.json . --exclude-dir=node_modules    │
# └─────────────────────────────────────────────────────────────────────────────┘
MIGRATE_CMD="${MIGRATE_CMD:-bun run --cwd apps/api migrate}"

PROJECT="nexus"   # pinned so the compose project name never depends on the folder name
COMPOSE="docker compose -p $PROJECT -f docker-compose.prod.yml"
STATE_FILE="/opt/nexus/.current_tag"
PREV_TAG="$(cat "$STATE_FILE" 2>/dev/null || true)"

echo "==> Deploying $IMAGE_TAG (previous: ${PREV_TAG:-none})"

# 1. ECR login via the instance role. The token is removed again when the script exits,
#    so it doesn't sit unencrypted in ~/.docker/config.json between deploys.
aws ecr get-login-password --region "$AWS_REGION" \
  | docker login --username AWS --password-stdin "$ECR_REGISTRY"
trap 'docker logout "$ECR_REGISTRY" > /dev/null 2>&1 || true' EXIT

# 2. Pull FIRST. If this fails, nothing that's currently running has been touched.
$COMPOSE pull nexus-api nexus-web

# 3. Remove stray containers squatting on our fixed container_names (nexus-postgres, etc.)
#    that belong to a DIFFERENT compose project or were started with plain `docker run`.
#    Containers from this project are left alone. Volumes are never removed.
docker ps -a --filter "name=^nexus-" \
  --format '{{.ID}} {{.Names}} {{.Label "com.docker.compose.project"}}' \
  | while read -r id name proj; do
      if [ "$proj" != "$PROJECT" ]; then
        echo "==> Removing stray container $name (project: ${proj:-none})"
        docker rm -f "$id" > /dev/null
      fi
    done

# 4. Make sure infra is up and healthy
$COMPOSE up -d --wait postgres redis

# 5. Backup the DB before touching schema; keep the last 5
mkdir -p backups
$COMPOSE exec -T postgres sh -c 'pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB"' > "backups/pre-$IMAGE_TAG.sql"
ls -1t backups/*.sql | tail -n +6 | xargs -r rm

# 6. Migrate using a one-off container from the NEW image.
#    Fails BEFORE the cutover, so the running app is untouched. Migrations are NOT auto-reverted.
echo "==> Running migrations: $MIGRATE_CMD"
if ! $COMPOSE run --rm --no-deps nexus-api sh -c "$MIGRATE_CMD"; then
  echo "!! Migration failed. Nothing was switched over; the running app is untouched."
  echo "!! Check MIGRATE_CMD names a real script in a workspace package.json (the image has no root package.json)."
  exit 1
fi

# 7. Roll the app containers onto the new tag
$COMPOSE up -d nexus-api nexus-web

# 8. Health check
echo "==> Health checking..."
for i in $(seq 1 20); do
  if curl -sf http://localhost:4000/health > /dev/null && curl -sf http://localhost:3000 > /dev/null; then
    echo "$IMAGE_TAG" > "$STATE_FILE"
    docker image prune -af --filter "until=168h" > /dev/null
    echo "==> Healthy. Deploy complete: $IMAGE_TAG"
    exit 0
  fi
  echo "    not healthy yet ($i/20)"
  sleep 3
done

# 9. Failed: roll back to the previous tag, then exit non-zero so CI shows the deploy as failed
echo "!! Health check failed"
if [ -n "$PREV_TAG" ]; then
  echo "==> Rolling back to $PREV_TAG"
  export IMAGE_TAG="$PREV_TAG"
  $COMPOSE up -d nexus-api nexus-web
  echo "!! Rolled back code only. Applied migrations are NOT reverted — backup: backups/pre-*.sql"
else
  echo "!! No previous tag to roll back to."
fi
exit 1