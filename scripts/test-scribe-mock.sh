#!/usr/bin/env bash
# Tracer Bullet — Module Scribe en mode MOCK
#
# Envoie un POST /api/scribe/analyze avec un payload texte basique,
# puis liste les derniers ConsultationDraft (GET /api/scribe/drafts).
#
# Prérequis:
#   1. DB prête: npm run prisma:push
#   2. API lancée: npm run dev:api (ou dev:api-only)
#      → Vous devez voir "ScribeService initialized with AI_MODE: MOCK"
#   3. Postgres (et Redis pour health) accessibles
#
# Usage: ./scripts/test-scribe-mock.sh [BASE_URL]

set -e

cd "$(dirname "$0")/.."
BASE_URL="${1:-http://localhost:3000}"
PAYLOAD='{"text": "Patient 45 ans, fièvre 38.5°C, toux sèche depuis 3 jours. Pas d''allergies connues."}'

echo "🎯 Tracer Bullet — Scribe MOCK"
echo "   BASE_URL=$BASE_URL"
echo ""

echo "1️⃣  Vérification health Scribe..."
if ! curl -sf "$BASE_URL/api/scribe/health" > /dev/null; then
  echo "   ❌ $BASE_URL/api/scribe/health inaccessible. Lancez l'API (npm run dev:api) puis réessayez."
  exit 1
fi
echo "   ✅ Scribe health OK"
echo ""

echo "2️⃣  POST /api/scribe/analyze"
echo "   Payload: $PAYLOAD"
RESP=$(curl -sf -X POST "$BASE_URL/api/scribe/analyze" \
  -H "Content-Type: application/json" \
  -d "$PAYLOAD")
if command -v jq >/dev/null 2>&1; then
  C=$(echo "$RESP" | jq -r '.data.data // .data')
  echo "   ✅ Réponse:" && echo "$RESP" | jq '.' 2>/dev/null || echo "$RESP"
  echo "   Symptoms: $(echo "$C" | jq '.symptoms | length' 2>/dev/null || echo "?") | Diagnostics: $(echo "$C" | jq '.diagnosis | length' 2>/dev/null || echo "?") | Medications: $(echo "$C" | jq '.medications | length' 2>/dev/null || echo "?")"
else
  echo "$RESP"
fi
echo ""

echo "3️⃣  GET /api/scribe/drafts (derniers)"
DRAFTS=$(curl -sf "$BASE_URL/api/scribe/drafts?limit=5")
ITEMS=$(echo "$DRAFTS" | jq -r '(.data.data.items // .data.items)[]? | "   - \(.id) | patientId=\(.patientId) | status=\(.status) | \(.createdAt)"' 2>/dev/null)
if [ -n "$ITEMS" ]; then
  echo "$ITEMS"
  TOTAL=$(echo "$DRAFTS" | jq -r '(.data.data.total // .data.total) // 0')
  echo "   Total drafts: $TOTAL"
else
  echo "$DRAFTS"
fi
echo ""
echo "✅ Tracer Bullet terminé. Vérifiez les logs API: 'ScribeService initialized with AI_MODE: MOCK' et '[MOCK] ConsultationDraft sauvegardé avec ID: ...'"
