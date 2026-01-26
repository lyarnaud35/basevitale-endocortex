#!/usr/bin/env bash
# E2E Scribe : flux complet API + JSON + Prisma (MOCK, puis LOCAL si Python dispo)
# Prérequis : Postgres (DATABASE_URL), Redis. Optionnel : Python :8000 pour LOCAL.

set -e

cd "$(dirname "$0")/.."

export AI_MODE="${AI_MODE:-MOCK}"
export REDIS_HOST="${REDIS_HOST:-localhost}"
export REDIS_PORT="${REDIS_PORT:-6379}"

echo "🔬 E2E Scribe (MOCK + LOCAL si Python up)"
echo "   AI_MODE=$AI_MODE REDIS=$REDIS_HOST:$REDIS_PORT"
echo ""

if [ ! -d "apps/api/src/prisma/client" ]; then
  echo "📦 Génération client Prisma..."
  npm run prisma:generate
fi

echo "🧪 Lancement des tests E2E..."
exec npx jest --config=apps/api/test/jest-e2e.json --runInBand
