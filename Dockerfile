# Builds and runs apps/api (the AI-OS backend) from the monorepo root.
# apps/web is deployed separately (Vercel) - see DEPLOY.md.
#
# Build from the repo root:
#   docker build -t ai-os-api .

FROM node:22-bookworm-slim AS base
WORKDIR /app
# Match the npm version pinned in package.json's devEngines.
RUN npm install -g npm@11.4.2
# Prisma's query engine needs OpenSSL; bookworm-slim doesn't include it
# by default and Prisma otherwise silently guesses a version.
RUN apt-get update -y \
  && apt-get install -y --no-install-recommends openssl \
  && rm -rf /var/lib/apt/lists/*

# ---- deps: install once, cached as long as manifests don't change ----
FROM base AS deps
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/ai-llm/package.json packages/ai-llm/package.json
COPY packages/ai-runtime/package.json packages/ai-runtime/package.json
COPY packages/ai-tools/package.json packages/ai-tools/package.json
COPY packages/ai-planner/package.json packages/ai-planner/package.json
COPY packages/config/package.json packages/config/package.json
COPY packages/shared/package.json packages/shared/package.json
RUN npm ci

# ---- build: generate the Prisma client and compile every workspace ----
FROM deps AS build
COPY . .
# prisma generate only needs the schema file, not a live database -
# DATABASE_URL just has to be present and non-empty at this stage.
ENV DATABASE_URL="postgresql://placeholder:placeholder@localhost:5432/placeholder"
RUN npx prisma generate --schema apps/api/prisma/schema.prisma
RUN npx turbo run build --filter=ai-os-server

# ---- runtime ----
# Copy the whole tree rather than cherry-picking node_modules paths:
# npm's hoisting can nest a dependency under a specific workspace
# (e.g. apps/api/node_modules/helmet) instead of the root when
# versions conflict, and missing that nested copy means a working
# build that fails at runtime with a bare "Cannot find package" error.
FROM base AS runtime
ENV NODE_ENV=production
ENV PORT=3000

COPY --from=build /app ./

WORKDIR /app/apps/api
EXPOSE 3000

# Apply any pending migrations, then start the server. Safe to run on
# every boot - migrate deploy is a no-op when there's nothing pending.
CMD ["sh", "-c", "npx prisma migrate deploy --schema prisma/schema.prisma && node dist/index.js"]
