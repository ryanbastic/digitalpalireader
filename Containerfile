FROM docker.io/library/node:23.3-alpine AS frontend-builder
WORKDIR /usr/app
COPY . .
RUN corepack enable
RUN pnpm i --frozen-lockfile
RUN pnpm vite build

FROM docker.io/library/caddy:2.9
WORKDIR /dpr
COPY --from=frontend-builder /usr/app/dist /dpr
ENTRYPOINT ["caddy", "file-server", "--listen", ":8080"]
