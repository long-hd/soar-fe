# Stage 1: build
FROM docker.io/library/node:22-alpine AS build
WORKDIR /build

# Pin pnpm qua corepack (repo không có packageManager field)
RUN corepack enable && corepack prepare pnpm@9 --activate

# Cache layer: chỉ manifest trước
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# Source + build (tsc -b && vite build -> dist/)
COPY . .
RUN pnpm build

# Stage 2: runtime — nginx non-root, nghe 8081
FROM docker.io/nginxinc/nginx-unprivileged:1-alpine
LABEL org.opencontainers.image.source=https://github.com/long-hd/soar-fe
LABEL org.opencontainers.image.description="Soar admin platform frontend"
LABEL org.opencontainers.image.licenses=MIT

# Config riêng (image này đã chạy non-root user 'nginx' sẵn)
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /build/dist /usr/share/nginx/html

EXPOSE 8081
