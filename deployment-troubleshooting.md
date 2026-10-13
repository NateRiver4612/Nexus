# Nexus Deployment Troubleshooting Notes

Issues hit while setting up the GitHub Actions → ECR → EC2 deploy pipeline, with causes and fixes.

**Pipeline overview:** push to `main` → build & push images to ECR (OIDC auth) → SSH to EC2 → `remote-deploy.sh` (pull, backup, migrate, roll containers, health check).

---

## Quick index

| # | Symptom | Root cause | Section |
|---|---------|-----------|---------|
| 1 | `Not authorized to perform sts:AssumeRoleWithWebIdentity` | OIDC trust policy / role mismatch | [Issue 1](#issue-1-oidc-assumerolewithwebidentity-not-authorized) |
| 2 | `script "migrate" exited with code 1` (no details) | pgvector extension missing | [Issue 2](#issue-2-migration-fails-with-no-useful-error) |
| 3 | `not healthy yet (20/20)` though containers are `Up` | Health check used wrong API port | [Issue 3](#issue-3-health-check-fails-but-containers-are-running) |

---

## Issue 1: OIDC `AssumeRoleWithWebIdentity` not authorized

**Error**

```
Could not assume role with OIDC: Not authorized to perform sts:AssumeRoleWithWebIdentity
```

**Cause**
AWS received the GitHub token but the IAM role's trust policy rejected it. The workflow itself (`permissions: id-token: write`) was fine. The mismatch is between what GitHub sends (the `sub` claim) and what the trust policy allows.

**Checklist (AWS Console + GitHub)**

1. **IAM → Identity providers:** `token.actions.githubusercontent.com` exists with audience `sts.amazonaws.com`, in the correct account.
2. **IAM → Roles → deploy role → Trust relationships:** policy looks like this:

   ```json
   {
     "Version": "2012-10-17",
     "Statement": [
       {
         "Effect": "Allow",
         "Principal": {
           "Federated": "arn:aws:iam::<ACCOUNT_ID>:oidc-provider/token.actions.githubusercontent.com"
         },
         "Action": "sts:AssumeRoleWithWebIdentity",
         "Condition": {
           "StringEquals": {
             "token.actions.githubusercontent.com:aud": "sts.amazonaws.com"
           },
           "StringLike": {
             "token.actions.githubusercontent.com:sub": "repo:<OWNER>/<REPO>:ref:refs/heads/main"
           }
         }
       }
     ]
   }
   ```

3. **`sub` must match exactly** (case-sensitive): `repo:<OWNER>/<REPO>:ref:refs/heads/<branch>`.
   - Manual `workflow_dispatch` from a non-`main` branch produces a different `sub` and fails.
   - If a job uses `environment: X`, the `sub` becomes `repo:<OWNER>/<REPO>:environment:X`.
   - Renamed/transferred repos or forks change the `sub`.
4. **GitHub secret `AWS_DEPLOY_ROLE_ARN`** is the full ARN of *this* role, with no trailing space/newline. Environment/org-level secrets with the same name override repo-level ones.
5. **Debug tip:** temporarily loosen `sub` to `repo:<OWNER>/<REPO>:*`. If it works, the mismatch was the `sub`. Tighten it again afterwards. CloudTrail → Event history → `AssumeRoleWithWebIdentity` shows rejection details.

**Also needed later:** the role's *permissions* policy must allow ECR push (`ecr:GetAuthorizationToken`, `ecr:BatchCheckLayerAvailability`, `ecr:InitiateLayerUpload`, `ecr:UploadLayerPart`, `ecr:CompleteLayerUpload`, `ecr:PutImage`) on the `nexus-api` and `nexus-web` repos.

---

## Issue 2: Migration fails with no useful error

**Error (CI output)**

```
[⣷] applying migrations...
NOTICE: schema "drizzle" already exists, skipping      <- harmless
NOTICE: relation "__drizzle_migrations" already exists, skipping   <- harmless
error: script "migrate" exited with code 1
!! Migration failed. ... Check MIGRATE_CMD ...         <- misleading
```

**Cause**
`MIGRATE_CMD` was fine. A SQL statement in a migration failed, and drizzle-kit hid the real error. The actual error was only in the Postgres server log:

```
ERROR: type "vector" does not exist
STATEMENT: CREATE TABLE "knowledge_source_chunks" ( ... )
```

The **pgvector extension was never created**. Files in `/docker-entrypoint-initdb.d` (e.g. `01-vector.sql`) only run when the data volume is **empty on first start**. The volume already existed, so the script never ran.

**How to find the real error**

```bash
docker logs nexus-postgres --tail 100 2>&1 | grep -B2 -A8 -i "error"
```

**Fix (one-time, on EC2)**

```bash
docker exec nexus-postgres sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "CREATE EXTENSION IF NOT EXISTS vector;"'
docker exec nexus-postgres sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "\dx"'   # verify
```

- If you get `extension "vector" is not available`, the image is plain `postgres`. Switch to a pgvector image with the **same major version** as the existing data (e.g. `pgvector/pgvector:pg16`).

**Permanent fix:** add to `remote-deploy.sh` right after step 4 (infra up):

```bash
# 4b. Ensure required extensions exist (init scripts only run on an empty volume)
$COMPOSE exec -T postgres sh -c \
  'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -v ON_ERROR_STOP=1 -c "CREATE EXTENSION IF NOT EXISTS vector;"'
```

**Other things this symptom can mean (for next time)**

- Tables exist but `drizzle.__drizzle_migrations` is empty (DB previously set up via `drizzle-kit push` or manually) → "relation already exists". Wipe the DB if disposable, or baseline the migration table.
- A genuinely broken migration (bad SQL, duplicate constraint, type change on existing data). The Postgres log names it.

**Improvement:** change the failure message in `remote-deploy.sh` to point at the right place: *"Migration failed. Check `docker logs nexus-postgres` for the SQL error."*

---

## Issue 3: Health check fails but containers are running

**Symptom**

```
not healthy yet (20/20)
!! Health check failed
!! No previous tag to roll back to.
```

`docker ps` showed `nexus-web` on `3000` and `nexus-api` on **`3001`**, all `Up`.

**Cause**
The script health-checked `http://localhost:4000/health`, but the API is published on **3001**. The app was fine; the check was pointing at the wrong port.

**Fix**: use variables at the top of `remote-deploy.sh` so ports can't drift from `docker-compose.prod.yml`:

```bash
API_PORT="${API_PORT:-3001}"
WEB_PORT="${WEB_PORT:-3000}"
```

```bash
if curl -sf "http://localhost:$API_PORT/health" > /dev/null && curl -sf "http://localhost:$WEB_PORT" > /dev/null; then
```

**Notes**

- "No previous tag to roll back to" is expected on the first successful deploy. `.current_tag` is only written after a healthy deploy.
- If `/health` returns 404, the route has a different path (e.g. `/api/health`). Verify with `curl -v http://localhost:3001/health`.
- `NEXT_PUBLIC_API_URL` is baked into the web image at build time. If it changes, the web image must be rebuilt.

---

## General debugging playbook (when a deploy fails)

Run on the EC2 box from `/opt/nexus`:

```bash
# State of all containers + published ports
docker ps -a --filter "name=nexus-" --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'

# App logs
docker logs nexus-api --tail 80
docker logs nexus-web --tail 80

# DB errors (migrations, extensions)
docker logs nexus-postgres --tail 100 2>&1 | grep -B2 -A8 -i "error"

# Hit endpoints directly
curl -v http://localhost:3001/health
curl -v http://localhost:3000

# Memory problems (t3.micro has only 1 GB)
free -m
docker inspect nexus-api nexus-web --format '{{.Name}} OOMKilled={{.State.OOMKilled}} ExitCode={{.State.ExitCode}}'
dmesg | grep -i -E "killed process|out of memory" | tail
```

**Common causes of app containers failing to start**

- Missing env vars / `.env` not present in `/opt/nexus` (the deploy script never creates it).
- Wrong DB/Redis host. Inside compose use service names (`postgres`, `redis`), not `localhost`.
- App binding to `127.0.0.1` instead of `0.0.0.0` inside the container.
- Out of memory. Add swap as a quick fix, or move to a bigger instance:

  ```bash
  sudo fallocate -l 2G /swapfile && sudo chmod 600 /swapfile
  sudo mkswap /swapfile && sudo swapon /swapfile
  echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
  ```

**Manual rollback**

```bash
cd /opt/nexus
AWS_REGION=us-east-1 ECR_REGISTRY=<acct>.dkr.ecr.us-east-1.amazonaws.com IMAGE_TAG=<old-sha> bash remote-deploy.sh
```

Note: rollback restores **code only**. Applied migrations are not reverted. Pre-deploy DB backups are in `/opt/nexus/backups/pre-<tag>.sql` (last 5 kept).

---

## Security / cleanup reminders

- Security group: expose 80/443 (via reverse proxy) rather than raw ports 3000/3001 where possible.
- Remove any temporary OIDC debug step from the workflow.
- Tighten the trust policy `sub` back to `repo:<OWNER>/<REPO>:ref:refs/heads/main` if it was loosened for debugging.
- If the EC2 is Graviton (`t4g`, `uname -m` = `aarch64`), switch both builds to `linux/arm64`.
