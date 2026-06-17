FROM node:24-alpine AS builder
RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /build
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
RUN pnpm fetch

COPY . .
RUN pnpm install --offline
RUN pnpm build:full

WORKDIR /build/dist/assets
RUN gzip -k ../index.html *.js *.map *.css *.wasm *-app-*.json

FROM nginxinc/nginx-unprivileged:alpine-slim
LABEL org.opencontainers.image.source=https://github.com/shootie22/element-call
LABEL org.opencontainers.image.description="Element Call web app"
LABEL org.opencontainers.image.licenses="AGPL-3.0-only OR LicenseRef-Element-Commercial"
COPY --from=builder /build/dist /app
COPY config/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 8080
