FROM node:24-alpine AS builder
RUN corepack enable

WORKDIR /build
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
RUN pnpm fetch --frozen-lockfile

COPY . .
RUN pnpm install --offline --frozen-lockfile --ignore-pnpmfile
RUN pnpm build:full
RUN find dist -type f \( -name '*.html' -o -name '*.js' -o -name '*.map' -o -name '*.css' -o -name '*.wasm' -o -name '*-app-*.json' \) -exec gzip -k {} +

FROM nginxinc/nginx-unprivileged:alpine-slim AS runtime
LABEL org.opencontainers.image.source=https://github.com/shootie22/element-call
LABEL org.opencontainers.image.description="Element Call web app"
LABEL org.opencontainers.image.licenses="AGPL-3.0-only OR LicenseRef-Element-Commercial"
COPY config/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 8080

# CI builds JavaScript once, then packages that exact artifact for each CPU.
FROM runtime AS prebuilt
COPY dist /app

# Default target also supports a fresh checkout without a prebuilt dist/.
FROM runtime AS production
COPY --from=builder /build/dist /app
