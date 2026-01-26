#!/usr/bin/env bash
# Smoke-test Phase C — Scribe en mode LOCAL (Cortex Python)
#
# Vérifie : container ai-cortex (health) → API health → POST /scribe/analyze.
# Prérequis : AI_MODE=LOCAL dans .env, API redémarrée (npm run dev:api).
#
# Usage: ./scripts/test-phase-c-local.sh [API_BASE_URL] [CORTEX_URL]

set -e

cd "$(dirname "$0")/.."
API_URL="${1:-http://localhost:3000}"
CORTEX_URL="${2:-http://localhost:8000}"
PAYLOAD='{"text": "Patient 52 ans, douleur thoracique et essoufflement depuis 2 heures."}'

echo "🧪 Phase C — Smoke-test LOCAL (Cortex)"
echo "   API=$API_URL  Cortex=$CORTEX_URL"
echo ""

echo "1️⃣  Cortex (Python) health..."
if curl -sf "${CORTEX_URL}/health" > /dev/null; then
  echo "   ✅ Cortex reachable"
else
  echo "   ❌ Cortex inaccessible. Lancez: docker compose up -d ai-cortex"
  exit 1
fi

echo ""
echo "2️⃣  API Scribe health..."
if ! curl -sf "${API_URL}/api/scribe/health" > /dev/null; then
  echo "   ❌ API inaccessible. Lancez: npm run dev:api (avec AI_MODE=LOCAL)"
  exit 1
fi
echo "   ✅ API OK"
echo ""

echo "3️⃣  POST /api/scribe/analyze (mode LOCAL attendu)"
# Timeout 400s : API attend AI_CORTEX_TIMEOUT_MS (ex. 300s) puis fallback
RESP=$(curl -sf -m 400 -X POST "${API_URL}/api/scribe/analyze" \
  -H "Content-Type: application/json" \
  -d "$PAYLOAD")
if echo "$RESP" | grep -qE '"symptoms"|"diagnosis"'; then
  echo "   ✅ Analyse OK (Cortex ou fallback MOCK)"
  if command -v jq >/dev/null 2>&1; then
    echo "$RESP" | jq '.data.data // .data | {patientId, symptoms: (.symptoms | length), diagnosis: (.diagnosis | length), medications: (.medications | length)}' 2>/dev/null || true
  fi
else
  echo "   ❌ Réponse invalide"
  echo "$RESP" | head -c 500
  exit 1
fi
echo ""
echo "✅ Phase C smoke-test terminé. Vérifiez les logs API (LOCAL vs fallback MOCK)."
