FROM node:24-alpine AS build
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm build

FROM node:24-alpine
WORKDIR /app
ENV NODE_ENV=production
ENV NUXT_DATABASE_PATH=/data/bingosync.db
ENV NUXT_MIGRATIONS_DIR=/app/server/db/migrations
ENV NUXT_GENERATORS_DIR=/app/generators
COPY --from=build /app/.output ./.output
# Generators and migrations are read from disk at runtime, not bundled.
COPY --from=build /app/generators ./generators
COPY --from=build /app/server/db/migrations ./server/db/migrations
RUN mkdir -p /data && chown node:node /data
USER node
VOLUME ["/data"]
EXPOSE 3000
CMD ["node", ".output/server/index.mjs"]
