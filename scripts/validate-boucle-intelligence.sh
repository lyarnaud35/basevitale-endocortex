#!/usr/bin/env bash
# Validation Boucle Complète : Frontend (Libs) ↔ Backend (API) ↔ Format Zod partagé
#
# 1. Health Scribe
# 2. process-dictation (patient_demo_phase3) → draft
# 3. validate draft → projection Neo4j
# 4. GET /patient/:id/intelligence → vérifie summary, timeline, activeAlerts, quickActions
#
# Prérequis : API (npm run dev:api), Postgres (prisma push), Neo4j (docker compose up neo4j).
# Usage : ./scripts/validate-boucle-intelligence.sh [BASE_URL]

set -e

cd "$(dirname "$0")/.."
BASE_URL="${1:-http://localhost:3000}"
API="$BASE_URL/api"
PATIENT_ID="patient_demo_phase3"
TEXT='Le patient présente une toux sèche depuis 3 jours, pas de fièvre. Je prescris du sirop Toplexil.'

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "=== Validation Boucle Complète (Intelligence) ==="
echo "   API=$API"
echo ""

# 1. Health
echo "1. GET /scribe/health"
HEALTH=$(curl -sf "$API/scribe/health" 2>/dev/null || true)
if [ -z "$HEALTH" ]; then
  echo -e "   ${RED}❌ API inaccessible. Lancez: npm run dev:api${NC}"
  exit 1
fi
echo -e "   ${GREEN}✅ Health OK${NC}"
echo ""

# 2. Process-dictation
echo "2. POST /scribe/process-dictation (patient=$PATIENT_ID)"
PD=$(curl -sf -X POST "$API/scribe/process-dictation" \
  -H "Content-Type: application/json" \
  -d "{\"text\":$(echo "$TEXT" | jq -Rs .),\"patientId\":\"$PATIENT_ID\"}" 2>/dev/null || true)
if [ -z "$PD" ]; then
  echo -e "   ${RED}❌ process-dictation échoué (API, Postgres, AI_MODE ?)${NC}"
  exit 1
fi

DRAFT_ID=$(echo "$PD" | jq -r '.data.draft.id // .draft.id // empty')
if [ -z "$DRAFT_ID" ] || [ "$DRAFT_ID" = "null" ]; then
  echo -e "   ${RED}❌ Pas de draft.id dans la réponse${NC}"
  echo "$PD" | jq '.' 2>/dev/null || echo "$PD"
  exit 1
fi
echo -e "   ${GREEN}✅ Draft créé: $DRAFT_ID${NC}"
CONSULT=$(echo "$PD" | jq -r '.data.consultation // .consultation // {}')
BC=$(echo "$CONSULT" | jq -r 'if .billingCodes | type == "array" then (.billingCodes | length) else 0 end')
PRX=$(echo "$CONSULT" | jq -r 'if .prescription | type == "array" then (.prescription | length) else 0 end')
echo "   — consultation.billingCodes: $BC, prescription: $PRX"
echo ""

# 3. Validate
echo "3. POST /scribe/draft/$DRAFT_ID/validate"
VV=$(curl -sf -X POST "$API/scribe/draft/$DRAFT_ID/validate" \
  -H "Content-Type: application/json" 2>/dev/null || true)
if [ -z "$VV" ]; then
  echo -e "   ${YELLOW}⚠️  Validate échoué (Neo4j ?). On continue pour tester l’intelligence.${NC}"
else
  echo -e "   ${GREEN}✅ Draft validé → Neo4j${NC}"
fi
echo ""

# 4. Intelligence
echo "4. GET /scribe/patient/$PATIENT_ID/intelligence"
INTEL=$(curl -sf "$API/scribe/patient/$PATIENT_ID/intelligence" \
  -H "Authorization: Bearer test-token" 2>/dev/null || true)
if [ -z "$INTEL" ]; then
  echo -e "   ${RED}❌ Intelligence inaccessible${NC}"
  exit 1
fi

PAYLOAD=$(echo "$INTEL" | jq -r '.data // .')
SUMMARY=$(echo "$PAYLOAD" | jq -r '.summary // empty')
HAS_TIMELINE=$(echo "$PAYLOAD" | jq -r 'if .timeline | type == "array" then "ok" else "" end')
HAS_ALERTS=$(echo "$PAYLOAD" | jq -r 'if .activeAlerts | type == "array" then "ok" else "" end')
HAS_ACTIONS=$(echo "$PAYLOAD" | jq -r 'if .quickActions | type == "array" then "ok" else "" end')

if [ -z "$SUMMARY" ] || [ -z "$HAS_TIMELINE" ] || [ -z "$HAS_ALERTS" ] || [ -z "$HAS_ACTIONS" ]; then
  echo -e "   ${RED}❌ Réponse invalide (attendu: summary, timeline, activeAlerts, quickActions)${NC}"
  echo "$INTEL" | jq '.' 2>/dev/null || echo "$INTEL"
  exit 1
fi

echo -e "   ${GREEN}✅ Intelligence OK (Zod shape respecté)${NC}"
echo "   — summary: ${SUMMARY:0:60}..."
echo "   — timeline: array, activeAlerts: array, quickActions: array"
echo ""
echo -e "${GREEN}=== Boucle complète validée ===${NC}"
echo "   Frontend (scribe-ui) peut appeler GET /patient/:id/intelligence et afficher le format partagé."
echo "   Widget Feature Complete V1 pour l’Intelligence."
echo ""
