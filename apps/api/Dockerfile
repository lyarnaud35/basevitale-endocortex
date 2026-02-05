# BaseVitale API – Image Docker pour livrable Ben
# Single-stage: build + runtime. Prisma généré dans le conteneur (CRITIQUE).
# Debian slim (pas Alpine) : Prisma + OpenSSL / moteur requièrent glibc.
# Build: docker build -f apps/api/Dockerfile .
# Run:   docker run --rm -e DATABASE_URL=... -p 3000:3000 basevitale-api

FROM node:20-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# 1. Package + config (Nx, ESLint requis pour le build)
COPY package.json package-lock.json* ./
COPY nx.json tsconfig.base.json jest.preset.js ./
COPY .eslintrc.json .eslintignore* ./

# 2. Schema Prisma AVANT npm install (génération in-container)
COPY apps/api/prisma ./apps/api/prisma

# 3. Dépendances
RUN npm ci --legacy-peer-deps

# 4. Reste de l’app + libs
COPY apps/api ./apps/api
COPY libs/shared ./libs/shared

# 5. Prisma generate (output: apps/api/src/prisma/client) – CRITIQUE
WORKDIR /app/apps/api
RUN npx prisma generate --schema=prisma/schema.prisma

# 6. Build API
WORKDIR /app
RUN npx nx run api:build --skip-nx-cache

# 7. Production only
RUN npm prune --omit=dev --legacy-peer-deps

# 8. Réinstaller Prisma CLI en prod (pour prisma migrate deploy au démarrage)
RUN npm install prisma --save --legacy-peer-deps

ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000

# Migrate puis start (migrations dans apps/api/prisma/migrations)
WORKDIR /app/apps/api
CMD ["sh", "-c", "npx prisma migrate deploy && cd /app && node dist/apps/api/main.js"]
