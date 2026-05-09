# syntax=docker/dockerfile:1.7

FROM node:22-slim AS base
WORKDIR /app
ENV HUSKY=0

RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates openssl \
  && rm -rf /var/lib/apt/lists/*

FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci

FROM deps AS build
COPY tsconfig.json ./
COPY prisma ./prisma
COPY src ./src
RUN npx prisma generate
RUN npm run build

FROM deps AS production-deps
COPY prisma ./prisma
RUN npm prune --omit=dev
RUN npx prisma generate

FROM base AS runtime
ENV NODE_ENV=production

COPY --chown=node:node --from=production-deps /app/package.json ./package.json
COPY --chown=node:node --from=production-deps /app/package-lock.json ./package-lock.json
COPY --chown=node:node --from=production-deps /app/node_modules ./node_modules
COPY --chown=node:node --from=production-deps /app/prisma ./prisma
COPY --chown=node:node --from=build /app/dist ./dist

USER node
CMD ["node", "dist/index.js"]
