#!/bin/bash
# Démarrage API NestJS seul (sans Docker)
# Utilise REDIS_HOST=localhost par défaut pour le sémaphore GPU.

set -e

export REDIS_HOST="${REDIS_HOST:-localhost}"
export REDIS_PORT="${REDIS_PORT:-6379}"
export AI_MODE="${AI_MODE:-MOCK}"

echo "🔧 API-only mode (no Docker)"
echo "   REDIS_HOST=$REDIS_HOST REDIS_PORT=$REDIS_PORT AI_MODE=$AI_MODE"
echo ""

cd "$(dirname "$0")/.."
if [ ! -d "apps/api/src/prisma/client" ]; then
  echo "📦 Generating Prisma client..."
  npm run prisma:generate
fi
echo "🚀 Starting API..."
exec npx nx serve api
