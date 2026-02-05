#!/bin/bash
# Lance l'interface pour test (API + Web)
# Prérequis : nx reset + rm -rf apps/web/.next si erreur "project graph"

set -e
cd "$(dirname "$0")/.."

echo "🧹 Nettoyage cache (si nécessaire)..."
npx nx reset 2>/dev/null || true
rm -rf apps/web/.next 2>/dev/null || true

echo ""
echo "🚀 Démarrage API (port 3000)..."
echo "   Dans un premier terminal : npm run dev:api   OU   npx nx serve api"
echo ""
echo "🌐 Démarrage Web (port 4200)..."
echo "   Dans un second terminal : npm run dev:web   OU   npx nx serve web"
echo ""
echo "📋 URLs de test :"
echo "   • Frontend : http://localhost:4200"
echo "   • Scribe   : http://localhost:4200/scribe"
echo "   • Test IA  : http://localhost:4200/scribe/test"
echo "   • API health : http://localhost:3000/api/scribe/health"
echo ""
echo "⏳ Démarrage en arrière-plan (API puis Web)..."

export REDIS_HOST="${REDIS_HOST:-localhost}"
export AI_MODE="${AI_MODE:-MOCK}"

npx nx serve api &
API_PID=$!
sleep 3
npx nx serve web &
WEB_PID=$!

echo ""
echo "   API PID: $API_PID  |  Web PID: $WEB_PID"
echo "   Pour arrêter : kill $API_PID $WEB_PID"
echo ""
wait
