# Production image for Fieldcut OS (used by Railway, works on any Docker host).
# Build:  docker build -t fieldcut-os .
# Run:    docker run -p 3000:3000 -v fieldcut-data:/data -e CONSOLE_PASSWORD=... fieldcut-os

FROM node:24-slim AS base
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm install -g pnpm@12.15.0
WORKDIR /app

# 1. Install dependencies (cached until a manifest or the lockfile changes)
FROM base AS build
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/web/package.json apps/web/
COPY packages/core/package.json packages/core/
RUN pnpm install --frozen-lockfile

# 2. Build the Next.js app
COPY . .
RUN pnpm --filter web build

# 3. Runtime: the database and generated signing key live on a volume mounted at /data
FROM base AS run
ENV NODE_ENV=production \
    FIELDCUT_DATA_DIR=/data \
    PORT=3000
COPY --from=build /app /app
WORKDIR /app/apps/web
EXPOSE 3000
CMD ["node_modules/.bin/next", "start"]
