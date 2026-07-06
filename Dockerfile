# syntax=docker/dockerfile:1
FROM node:20-slim AS builder
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@10.33.2 --activate
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
# Build-time placeholder only: client.ts reads DATABASE_URL at import time, but the
# build never opens a connection (postgres.js is lazy). The real value is injected at
# runtime via the container env. This ENV lives in the builder stage only.
ENV DATABASE_URL=postgres://build:build@localhost:5432/build
RUN pnpm build
RUN pnpm prune --prod

FROM node:20-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
COPY --from=builder /app/build ./build
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/drizzle ./drizzle
COPY --from=builder /app/scripts ./scripts
COPY --from=builder /app/docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x ./docker-entrypoint.sh
# Cached product images live here on a mounted volume. Create + own it as `node`
# BEFORE dropping privileges: Docker copies this dir's ownership onto a fresh
# named volume, so the non-root runtime user can actually write cached images.
RUN mkdir -p /data && chown node:node /data
USER node
EXPOSE 3000
ENTRYPOINT ["./docker-entrypoint.sh"]
