# syntax=docker/dockerfile:1
# apps/web — Next.js 15.
# Build from the REPO ROOT:
#   docker build -f apps/web/Dockerfile -t nexus-web .

FROM oven/bun:1 AS base
WORKDIR /app

# ---- Build stage: install all dependencies ----
FROM base AS builder
COPY package.json bun.lock* turbo.json tsconfig.json ./
COPY apps ./apps
COPY packages ./packages

RUN bun install
RUN bun run build --filter=@nexus/web

# ---- Runtime stage ----
FROM oven/bun:1-slim
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Copy built standalone app and assets
COPY --from=builder /app/apps/web/.next/standalone ./
COPY --from=builder /app/apps/web/.next/static ./apps/web/.next/static
# COPY --from=builder /app/apps/web/public ./apps/web/public

EXPOSE 3000
ENV PORT=3000
CMD ["bun", "apps/web/server.js"]
