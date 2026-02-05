#!/usr/bin/env bash
# Démarre l'écosystème pour tester /cabinet-demo et Intelligence.
# Prérequis : Docker (postgres, neo4j, redis, nats). API via node (contourne Nx project graph).

set -e
cd "$(dirname "$0")/.."

# Identifiants Postgres du conteneur (voir docker compose)
export DATABASE_URL="${DATABASE_URL:-postgresql://basevitale:basevitale_secure@localhost:5432/basevitale_db}"
export PORT="${PORT:-3001}"

echo "🐳 Docker : postgres, neo4j, redis, nats..."
docker compose up -d postgres neo4j redis nats 2>/dev/null || true

echo "📦 Prisma db push..."
DATABASE_URL="$DATABASE_URL" npx prisma db push --schema=apps/api/prisma/schema.prisma 2>/dev/null || true

echo "🔨 Build API (si nécessaire)..."
npx nx run api:build 2>/dev/null || true

echo "🚀 API sur http://localhost:$PORT (node dist)..."
lsof -ti :$PORT | xargs kill -9 2>/dev/null || true
# AI_MODE=MOCK : pas d'ai-cortex/Ollama dans ce script → process-dictation OK sans sidecar
DATABASE_URL="$DATABASE_URL" PORT=$PORT AI_MODE=MOCK node dist/apps/api/main.js &
API_PID=$!

echo "⏳ Attente API..."
for i in 1 2 3 4 5 6 7 8 9 10; do
  curl -sf "http://localhost:$PORT/api/scribe/health" >/dev/null && break
  sleep 3
done
curl -sf "http://localhost:$PORT/api/scribe/health" >/dev/null || { echo "❌ API non prête."; kill $API_PID 2>/dev/null; exit 1; }

echo "🌐 Web sur http://localhost:4200..."
lsof -ti :4200 | xargs kill -9 2>/dev/null || true
npx nx serve web &
WEB_PID=$!

echo ""
echo "✅ Prêt."
echo "   • Cabinet POC : http://localhost:4200/cabinet-demo (dictée → Fiche Résultat : ordonnance, codes actes, billingCodes/prescription)"
echo "   • API health  : http://localhost:$PORT/api/scribe/health"
echo "   • Validation  : ./scripts/validate-boucle-intelligence.sh http://localhost:$PORT"
echo "   • Arrêt       : kill $API_PID $WEB_PID"
echo ""
wait
