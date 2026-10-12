# Nexus — AWS EC2 Deployment Guide

## Overview

The deployment process uses two separate computers:

- **GitHub Actions runner:** A temporary computer that builds Docker images, pushes them to Amazon ECR, and triggers the deployment.
- **AWS EC2 instance:** Your permanent server that runs the Nexus application and executes `remote-deploy.sh`.

The GitHub Actions runner does the heavy work (build and push images), then remotely tells the EC2 instance to run `remote-deploy.sh`.

### Deployment flow

```text
Push to main
    │
    ▼
GitHub Actions Runner
    │
    ├── 1. Checkout repository
    ├── 2. Authenticate with AWS using OIDC
    ├── 3. Build API Docker image
    ├── 4. Build Web Docker image
    ├── 5. Push images to Amazon ECR
    │
    ▼
SSH into EC2
    │
    ├── 6. Sync deployment files
    └── 7. Execute remote-deploy.sh
              │
              ▼
         EC2 Instance
              │
              ├── Authenticate with ECR
              ├── Pull new images
              ├── Start PostgreSQL and Redis
              ├── Back up PostgreSQL
              ├── Run database migrations
              ├── Replace application containers
              ├── Check application health
              └── Record deployed image tag
```

---

# Part 1: `deploy.yml`

**Location:** `.github/workflows/deploy.yml`

This workflow runs on GitHub's temporary runner.

## 1. Workflow triggers

```yaml
on:
  push:
    branches: [main]
  workflow_dispatch:
```

- `push`: Automatically deploys when code is pushed to `main`.
- `workflow_dispatch`: Adds a manual **Run workflow** button in the GitHub Actions tab.

## 2. AWS authentication permissions

```yaml
permissions:
  id-token: write
  contents: read
```

- `contents: read`: Allows the workflow to check out and read repository code.
- `id-token: write`: Allows the workflow to request a short-lived GitHub OIDC identity token.

AWS trusts this identity through the IAM role's trust policy and exchanges it for temporary AWS credentials.

This avoids storing long-lived AWS access keys in GitHub Secrets.

## 3. Deployment concurrency

```yaml
concurrency:
  group: deploy-production
  cancel-in-progress: false
```

This prevents multiple production deployments from running simultaneously.

- `group: deploy-production`: Places production deployments in the same concurrency group.
- `cancel-in-progress: false`: Prevents a running deployment from being cancelled when another deployment is queued.

A subsequent deployment waits for the running deployment to finish.

## 4. Build job

```yaml
runs-on: ubuntu-latest
```

GitHub creates a fresh Linux runner for the job.

The runner is temporary and is discarded after the workflow finishes.

### Job outputs

Jobs run on separate machines, so they cannot share ordinary environment variables directly.

The build job exposes outputs such as:

- `IMAGE_TAG`: A unique identifier for the application version.
- `ECR_REGISTRY`: The Amazon ECR registry address.

The deploy job consumes these outputs.

### Step 1: Check out the repository

`actions/checkout` downloads the repository source code onto the runner.

The Docker builds use the repository root as their build context, which is important when using Turborepo pruning or shared workspace packages.

### Step 2: Generate the image tag

```bash
echo "image_tag=${GITHUB_SHA::12}" >> "$GITHUB_OUTPUT"
```

`${GITHUB_SHA::12}` takes the first 12 characters of the current commit SHA.

For example:

```text
a1b2c3d4e5f6
```

This creates a version-specific image tag rather than relying on a mutable `latest` tag.

Writing to `$GITHUB_OUTPUT` publishes the value as a step output for subsequent workflow steps.

### Step 3: Configure AWS credentials

The `aws-actions/configure-aws-credentials` action assumes the configured IAM role, such as `github-actions-deploy`.

It uses GitHub OIDC to obtain temporary AWS credentials.

After authentication, AWS CLI commands in the job can operate using the assumed role's permissions.

### Step 4: Authenticate with Amazon ECR

The `aws-actions/amazon-ecr-login` action authenticates Docker with Amazon ECR.

It also exposes the registry address:

```text
<account-id>.dkr.ecr.<region>.amazonaws.com
```

This address is passed to later steps and the deployment job.

### Step 5: Set up Docker Buildx

Docker Buildx enables advanced Docker image building, including:

- Platform-specific builds.
- Build cache reuse.
- More flexible build configuration.

This is used to build images for the target EC2 architecture.

### Step 6: Build and push the API image

The API image uses the following configuration:

```yaml
context: .
file: apps/api/Dockerfile
platforms: linux/amd64
push: true
```

Explanation:

- `context: .`: Uses the repository root as the Docker build context.
- `file`: Selects the API Dockerfile.
- `platforms: linux/amd64`: Builds for a standard x86-64 server.
- `push: true`: Pushes the resulting image to ECR.
- `tags`: Tags the image with the commit-based version.
- `cache-from` and `cache-to`: Reuse build layers to speed up future builds.

Example image:

```text
<registry>/nexus-api:a1b2c3d4e5f6
```

### Step 7: Build and push the Web image

The Web image follows the same process as the API image.

It additionally passes build arguments, such as:

```text
NEXT_PUBLIC_API_URL
```

This value is supplied during the frontend build.

The resulting image is pushed to ECR with the same commit-based tag:

```text
<registry>/nexus-web:a1b2c3d4e5f6
```

**Important:** Next.js `NEXT_PUBLIC_*` variables are generally embedded into the browser bundle during the build. Changing them on the EC2 instance after building the image does not automatically change the client-side value.

---

## 5. Deploy job

The deploy job runs only after the build job succeeds.

```yaml
needs: build
```

Because each job uses a separate runner, the deploy job checks out the repository again to access the deployment scripts and configuration files.

### Step 1: Configure SSH

The workflow writes the SSH private key from GitHub Secrets to a file.

```bash
chmod 600 <private-key-file>
```

This restricts file access to the owner, as required by SSH for private keys.

The workflow also runs `ssh-keyscan` to collect the EC2 server's SSH host key.

This prevents an interactive host-key confirmation prompt from blocking the automated job.

**Security note:** In production, verify the EC2 host key against a trusted fingerprint rather than blindly trusting an unverified `ssh-keyscan` result.

### Step 2: Synchronize deployment files

The workflow creates the required directories on EC2 and copies the deployment files.

The files include:

```text
/opt/nexus/
├── docker-compose.prod.yml
├── remote-deploy.sh
├── postgres-init/
│   └── 01-vector.sql
└── backups/
```

The workflow copies the Compose file, deployment script, and PostgreSQL initialization SQL file using `scp`.

The `backups/` directory is used by the deployment script and should be created on the server if it does not already exist.

### Step 3: Execute the remote deployment

The workflow opens an SSH session and runs a command similar to:

```bash
cd /opt/nexus

AWS_REGION=<region> \
ECR_REGISTRY=<registry> \
IMAGE_TAG=<image-tag> \
bash remote-deploy.sh
```

The environment variables are passed to the deployment script for that invocation.

The script's output is streamed back to the GitHub Actions logs.

If the script exits with a nonzero status, the deployment step fails and the workflow is marked as unsuccessful.

---

# Part 2: `remote-deploy.sh`

**Location on EC2:** `/opt/nexus/remote-deploy.sh`

This script runs on the permanent EC2 server and manages the production deployment.

## 1. Enable strict shell behavior

```bash
set -euo pipefail
```

These options make the script safer:

| Option        | Behavior                                                                       |
| ------------- | ------------------------------------------------------------------------------ |
| `-e`          | Exits when a command fails, subject to Bash's conditional and exception rules. |
| `-u`          | Treats references to unset variables as errors.                                |
| `-o pipefail` | Makes a pipeline fail if a command within it fails.                            |

Without these options, a failed command might be ignored, allowing the deployment to continue in an inconsistent state.

## 2. Validate required environment variables

```bash
: "${ECR_REGISTRY:?ECR_REGISTRY is required}"
: "${IMAGE_TAG:?IMAGE_TAG is required}"
: "${AWS_REGION:?AWS_REGION is required}"
```

Each expression checks that the corresponding variable is set and non-empty.

If a required value is missing, the script exits with an error message.

## 3. Export variables for Docker Compose

```bash
export ECR_REGISTRY IMAGE_TAG AWS_REGION
```

Exporting these variables makes them available to child processes, including Docker Compose.

The production Compose file can reference them:

```yaml
services:
  nexus-api:
    image: ${ECR_REGISTRY}/nexus-api:${IMAGE_TAG}

  nexus-web:
    image: ${ECR_REGISTRY}/nexus-web:${IMAGE_TAG}
```

The actual service definitions may include additional services, such as `nexus-worker`, PostgreSQL, and Redis.

## 4. Define deployment helpers and state

```bash
COMPOSE="docker compose -f docker-compose.prod.yml"
STATE_FILE="/opt/nexus/.current_tag"
```

- `COMPOSE`: A shortcut for the production Compose command.
- `STATE_FILE`: Records the image tag of the last successful deployment.

The script reads the previous tag before deployment:

```bash
PREV_TAG=$(cat "$STATE_FILE" 2>/dev/null || true)
```

The `|| true` prevents the first deployment from failing if the state file does not exist yet.

The previous tag is needed if the new deployment fails its health checks.

---

# The Eight Deployment Steps

## Step 1: Authenticate with Amazon ECR

The script runs:

```bash
aws ecr get-login-password --region "$AWS_REGION" \
  | docker login \
      --username AWS \
      --password-stdin "$ECR_REGISTRY"
```

The AWS CLI obtains a temporary ECR authentication password.

Docker consumes it through standard input, avoiding the need to place the password directly in the command arguments.

This requires the EC2 instance to have an IAM instance role with appropriate ECR permissions.

The role should allow pulling the required images from the repository.

## Step 2: Pull the new images

```bash
$COMPOSE pull nexus-api nexus-web nexus-worker
```

Docker downloads the new application images before replacing the running containers.

If an image pull fails, strict shell behavior stops the script before the cutover step.

The old application containers remain running, assuming they were already healthy and no earlier command changed them.

## Step 3: Start infrastructure services

```bash
$COMPOSE up -d --wait postgres redis
```

This ensures PostgreSQL and Redis are running before the application is updated.

- `-d`: Runs containers in the background.
- `--wait`: Waits for services to become running or healthy, depending on their health-check configuration.

On subsequent deployments, these services may already be running.

The command relies on suitable Compose health checks and does not guarantee database readiness if those checks are missing or inadequate.

## Step 4: Back up PostgreSQL

Before applying migrations, the script creates a database backup.

A typical command is:

```bash
$COMPOSE exec -T postgres sh -c \
  'pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB"' \
  > "backups/pre-${IMAGE_TAG}.sql"
```

The exact command depends on how PostgreSQL credentials and database names are configured in the Compose file.

Important details:

- `exec`: Runs a command inside the running PostgreSQL container.
- `-T`: Disables pseudo-terminal allocation.
- `pg_dump`: Exports the database.
- `>`: Writes the dump to a file on the EC2 host.

The single quotes around the inner shell command ensure that `$POSTGRES_USER` and `$POSTGRES_DB` are expanded inside the container, where those variables are available.

The backup directory must exist before running the command.

### Backup retention

The deployment script can retain the five newest backups and remove older ones.

However, retention should be implemented carefully so that it sorts by the intended timestamp or naming convention and never deletes the only usable backup.

A local EC2 backup protects against some deployment failures, but it does not protect against loss of the instance or its storage. For stronger recovery, copy backups to a separate storage location such as Amazon S3.

## Step 5: Run database migrations

```bash
$COMPOSE run --rm --no-deps nexus-api <migration-command>
```

This starts a temporary container using the new API image, executes the migration command, and removes the container afterward.

- `--rm`: Removes the temporary container after execution.
- `--no-deps`: Does not start linked dependency services.
- `nexus-api`: Uses the API image and service configuration.

Replace `<migration-command>` with the actual migration command used by Nexus.

For example, if your production migration script is named `db:migrate`, the exact invocation will depend on how your Docker image exposes the package scripts and which workspace owns the migration command.

**Important:** A failed migration may have already changed the database. Some database migrations are transactional; others are not. A backup exists for recovery, but restoring it requires a deliberate recovery procedure.

## Step 6: Cut over to the new application version

```bash
$COMPOSE up -d nexus-api nexus-worker nexus-web
```

Docker Compose compares the desired image tags and service configuration with the existing containers, then recreates services when needed.

This updates the application containers to the newly deployed version.

The application is not necessarily zero-downtime. With a simple Compose deployment, replacing containers can briefly interrupt requests while the new containers start.

The database has already been migrated, so application and schema compatibility must be considered when planning this step.

## Step 7: Check application health

The script checks the API and Web endpoints repeatedly, with a maximum of 20 attempts and approximately three seconds between attempts.

```bash
curl -sf <api-health-url>
curl -sf <web-health-url>
```

- `-s`: Runs silently.
- `-f`: Returns a failure status for HTTP error responses.

The API health URL should point to the actual health endpoint, such as `/health`, and the Web URL should return a successful response.

If both services become healthy:

1. The script records the new image tag in `.current_tag`.
2. It removes unused Docker images older than the chosen retention period, such as seven days.
3. It exits successfully.

The state file now identifies the version that passed the deployment health checks.

**Important:** An HTTP 200 response confirms that an endpoint responded successfully; it does not necessarily prove that every dependency or critical application flow works correctly.

## Step 8: Roll back if health checks fail

If the new version fails to become healthy within the retry window, the script attempts to restore the previous application version.

Conceptually, it:

1. Restores `IMAGE_TAG` to `PREV_TAG`.
2. Exports the previous tag for Docker Compose.
3. Recreates the application containers using the old image tags.
4. Exits with status `1` so GitHub Actions reports the deployment failure.

For the first deployment, no previous tag exists. The rollback logic must handle that case explicitly rather than attempting to deploy an empty image tag.

**Database limitation:** Rolling back the application containers does not reverse database migrations. If the new schema is incompatible with the old application version, restoring the old images alone may not restore service.

For this reason, prefer backward-compatible, expand-and-contract database migrations whenever possible.

---

# What Happens When a Step Fails?

| Failure point                | Expected application status                                                     | Database status                                           |
| ---------------------------- | ------------------------------------------------------------------------------- | --------------------------------------------------------- |
| Step 1: ECR login            | Existing application remains running                                            | Unchanged                                                 |
| Step 2: Pull images          | Existing application remains running                                            | Unchanged                                                 |
| Step 3: Start infrastructure | Existing application is generally untouched, but infrastructure may be affected | May be unavailable if infrastructure startup fails        |
| Step 4: Database backup      | Existing application remains running                                            | No migration has run; backup may be incomplete or missing |
| Step 5: Migration            | Old application generally remains running                                       | Migration may have partially applied changes              |
| Step 6: Cutover              | Application may be partially updated or temporarily unavailable                 | New schema is already applied                             |
| Step 7: Health check         | Rollback is attempted if the script is written to handle this failure           | Migrations remain applied                                 |
| Step 8: Rollback             | Previous application version may be restored, but rollback can also fail        | Migrations remain applied                                 |

The key idea is to **pull first, back up the database, migrate, and only then replace the running application containers**.

This ordering reduces risk, but it does not make every failure completely safe. In particular, migrations and application cutover require compatibility planning and reliable recovery procedures.

---

# A Complete Deployment: Start to Finish

Suppose the commit SHA begins with:

```text
a1b2c3d4e5f6
```

The deployment proceeds as follows:

1. You push code to `main`.
2. GitHub Actions starts the workflow.
3. The build job checks out the repository.
4. GitHub authenticates to AWS using OIDC.
5. Docker builds the API and Web images.
6. Both images are pushed to Amazon ECR with the tag `a1b2c3d4e5f6`.
7. The deploy job starts after the build succeeds.
8. The deploy job copies the Compose file, deployment script, and PostgreSQL initialization SQL file to EC2.
9. The workflow connects to EC2 over SSH.
10. EC2 authenticates with ECR and pulls the new images.
11. PostgreSQL and Redis are started and checked.
12. The database is backed up.
13. The migration command runs using the new API image.
14. Docker Compose replaces the application containers.
15. The API and Web health checks run.
16. If healthy, `.current_tag` is updated to `a1b2c3d4e5f6`.
17. If unhealthy, the script attempts to restore the previous application version and the GitHub Actions run fails.

The image tag makes it possible to identify which code version was deployed without relying on a mutable `latest` tag.

---

# Troubleshooting

## GitHub Actions

Open your GitHub repository and navigate to:

**Actions → Select the workflow run → Select the failed job → Open the failed step**

Each step's logs help identify whether the issue is related to:

- Repository checkout or workflow configuration.
- AWS OIDC or IAM permissions.
- ECR authentication or image pushes.
- SSH authentication or file synchronization.
- Remote deployment commands.
- Application health checks.

## EC2: Inspect running containers

```bash
docker ps
```

Shows currently running containers.

To include stopped containers:

```bash
docker ps -a
```

## EC2: Inspect application logs

From `/opt/nexus`, run:

```bash
docker compose -f docker-compose.prod.yml logs --tail 100 nexus-api
```

For the Web service:

```bash
docker compose -f docker-compose.prod.yml logs --tail 100 nexus-web
```

For the worker:

```bash
docker compose -f docker-compose.prod.yml logs --tail 100 nexus-worker
```

Replace the service name with the service you need to inspect.

## EC2: Check the deployed version

```bash
cat /opt/nexus/.current_tag
```

This displays the last successfully recorded image tag, provided the deployment script writes the state file only after health checks succeed.

## EC2: Inspect the deployment configuration

```bash
cd /opt/nexus

docker compose -f docker-compose.prod.yml config
```

This renders the resolved Compose configuration. Be careful when sharing its output because resolved environment variables may contain secrets.

## EC2: Inspect available database backups

```bash
ls -lh /opt/nexus/backups/
```

Check that the expected backup exists before attempting a restore.

---

# Final Architecture Summary

| Component          | Responsibility                                      |
| ------------------ | --------------------------------------------------- |
| GitHub Actions     | Orchestrates CI/CD                                  |
| GitHub OIDC        | Provides short-lived AWS identity                   |
| AWS IAM            | Controls access to AWS resources                    |
| Amazon ECR         | Stores versioned Docker images                      |
| SSH                | Connects the runner to EC2                          |
| Docker Compose     | Manages production containers                       |
| `remote-deploy.sh` | Coordinates deployment, health checks, and rollback |
| PostgreSQL         | Stores application data                             |
| Redis              | Provides caching and queue infrastructure           |
| `.current_tag`     | Records the last successful application version     |
| Database backups   | Support recovery from data and migration problems   |

The GitHub runner builds and distributes the application images. The EC2 instance pulls those images, applies database changes, replaces the running containers, and verifies the new version.

This gives Nexus a straightforward CI/CD foundation without needing Kubernetes or a more complex deployment platform.
