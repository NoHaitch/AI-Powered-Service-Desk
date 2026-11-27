# syntax=docker/dockerfile:1
FROM oven/bun:1.4.4-alpine AS development
WORKDIR /app
RUN chown bun:bun /app
USER bun
COPY --chown=bun:bun package.json bun.lock ./
RUN --mount=type=cache,target=/home/bun/.bun/install/cache,uid=1000,gid=1000 bun install --frozen-lockfile
COPY --chown=bun:bun . .
EXPOSE 8443
CMD ["bun", "--bun", "run", "dev", "--host", "0.0.0.0", "--port", "8443", "--strictPort"]

FROM development AS build
RUN bun --bun run build

FROM nginxinc/nginx-unprivileged:1.30.0-alpine AS runtime
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 8443
