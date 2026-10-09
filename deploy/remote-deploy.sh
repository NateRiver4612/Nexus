#!/usr/bin/env bash
# Runs ON the EC2 box. Called by the GitHub Actions deploy job, or by hand for a manual rollback:
#   AWS_REGION=us-east-1 ECR_REGISTRY=<acct>.dkr.ecr.us-east-1.amazonaws.com IMAGE_TAG=<old-sha> bash remote-deploy.sh
set -euo pipefail

cd /opt/nexus
: "${ECR_REGISTRY:?ECR_REGISTRY is required}"
: "${IMAGE_TAG:?IMAGE_TAG is required}"
: "${AWS_REGION:?AWS_REGION is required}"
export ECR_REGISTRY IMAGE_TAG

COMPOSE="docker compose -f docker-compose.prod.yml"
STATE_FILE="/opt/nexus/.current_tag"
PREV_TAG="$(cat "$STATE_FILE" 2>/dev/null || true)"

echo "==> Deploying $IMAGE_TAG (previous: ${PREV_TAG:-none})"

# 1. ECR login via the instance role — token lasts 12h, we log in on every deploy anyway
aws ecr get-login-password --region "$AWS_REGION" \
  | docker login --username AWS --password-stdin "$ECR_REGISTRY"

# 2. Pull FIRST. If this fails, nothing that's currently running has been touched.
$COMPOSE pull nexus-api nexus-web   # worker shares the api image

# 3. Make sure infra is up and healthy
$COMPOSE up -d --wait postgres redis

# 4. Backup the DB before touching schema; keep the last 5
mkdir -p backups
$COMPOSE exec -T postgres sh -c 'pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB"' > "backups/pre-$IMAGE_TAG.sql"
ls -1t backups/*.sql | tail -n +6 | xargs -r rm

# 5. Migrate using a one-off container from the NEW image.
#    Adjust to your real migrate script. Migrations are NOT auto-reverted on rollback.
$COMPOSE run --rm --no-deps nexus-api bun run --cwd packages/db migrate

# 6. Roll the app containers onto the new tag
$COMPOSE up -d nexus-api nexus-worker nexus-web

# 7. Health check
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

# 8. Failed: roll back to the previous tag, then exit non-zero so CI shows the deploy as failed
echo "!! Health check failed"
if [ -n "$PREV_TAG" ]; then
  echo "==> Rolling back to $PREV_TAG"
  export IMAGE_TAG="$PREV_TAG"
  $COMPOSE up -d nexus-api nexus-worker nexus-web
  echo "!! Rolled back code only. Applied migrations are NOT reverted — backup: backups/pre-*.sql"
else
  echo "!! No previous tag to roll back to."
fi
exit 1