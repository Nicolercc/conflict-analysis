# API server — build from repository root.
# Build: docker build -t knowledge-nexus-api .
# Run:  docker run --rm -p 3001:3001 --env-file .env knowledge-nexus-api
FROM node:22-bookworm-slim AS build
WORKDIR /app
ENV CI=true
RUN corepack enable && corepack prepare pnpm@9.9.0 --activate
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY tsconfig.json tsconfig.base.json ./
COPY lib ./lib
COPY artifacts ./artifacts
COPY scripts ./scripts
RUN pnpm install --frozen-lockfile
RUN pnpm --filter @workspace/api-server run build

FROM node:22-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3001
COPY --from=build --chown=node:node /app/artifacts/api-server/dist ./dist
USER node
EXPOSE 3001
CMD ["node", "--enable-source-maps", "dist/index.mjs"]
