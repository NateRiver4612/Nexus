# syntax=docker/dockerfile:1
# apps/api — Hono on Bun.
# Build from the repo root:
#   docker build -f apps/api/Dockerfile -t nexus-api .

FROM oven/bun:1.3.14 AS base
WORKDIR /app

# ---- Build stage: install all dependencies ----
FROM base AS builder
# Copy the entire monorepo structure
COPY package.json bun.lock* turbo.json tsconfig.json ./
COPY apps ./apps
COPY packages ./packages

# Install all dependencies at once (respects workspaces)
RUN bun install

# ---- Runtime stage ----
FROM base
RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates && rm -rf /var/lib/apt/lists/*

# Copy installed node_modules and application code
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps ./apps
COPY --from=builder /app/packages ./packages

EXPOSE 3001
ENV NODE_ENV=production

CMD ["bun", "run", "--cwd", "apps/api", "start"]
