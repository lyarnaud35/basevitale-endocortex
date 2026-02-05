#!/usr/bin/env bash
#
# Test du contrat de transport SSE - ScribeMachine
#
# Terminal 1 : ./scripts/test-scribe-sse.sh stream
# Terminal 2 : ./scripts/test-scribe-sse.sh send-start
#
# Victoire : Terminal 1 affiche l'état RECORDING après le POST START.

set -e
BASE_URL="${BASE_URL:-http://localhost:3000}"
SESSION_ID="${SESSION_ID:-default}"
API_KEY="${INTERNAL_API_KEY:-}"

# Header optionnel si clé API configurée
if [ -n "$API_KEY" ]; then
  CURL_AUTH="-H \"X-INTERNAL-API-KEY: $API_KEY\""
else
  CURL_AUTH=""
fi

_jq() { if command -v jq >/dev/null 2>&1; then jq "$@"; else cat; fi; }

case "${1:-}" in
  stream)
    echo "=== Terminal 1 : Stream SSE (Ctrl+C pour arrêter) ==="
    echo "URL: $BASE_URL/api/ghost-scribe/stream/$SESSION_ID"
    echo ">>> Victoire : vous devez voir apparaître value:\"RECORDING\" après le POST START (Terminal 2)."
    echo ""
    curl -N -H "Accept: text/event-stream" "$BASE_URL/api/ghost-scribe/stream/$SESSION_ID"
    ;;
  send-start)
    echo "=== Terminal 2 : Envoyer START ==="
    echo "URL: $BASE_URL/api/ghost-scribe/events/$SESSION_ID"
    curl -s -X POST \
      -H "Content-Type: application/json" \
      "$BASE_URL/api/ghost-scribe/events/$SESSION_ID" \
      -d '{"type":"START","payload":{"patientId":"patient-123"}}' \
      | _jq '.'
    echo ""
    echo ">>> Si le stream (Terminal 1) affiche value: \"RECORDING\", le backend est prouvé."
    ;;
  send-stop)
    echo "=== Envoyer STOP (transcript) ==="
    curl -s -X POST \
      -H "Content-Type: application/json" \
      "$BASE_URL/api/ghost-scribe/events/$SESSION_ID" \
      -d '{"type":"STOP","payload":{"transcript":"Le patient a une fièvre et une toux."}}' \
      | _jq '.'
    ;;
  state)
    echo "=== État actuel ==="
    curl -s "$BASE_URL/api/ghost-scribe/state/$SESSION_ID" | _jq '.'
    ;;
  reset)
    echo "=== Reset machine ==="
    curl -s -X POST "$BASE_URL/api/ghost-scribe/reset/$SESSION_ID" | _jq '.'
    ;;
  ping)
    echo "=== Ping Ghost controller ==="
    curl -s "$BASE_URL/api/ghost-scribe/ping" | _jq '.'
    ;;
  *)
    echo "Usage: $0 stream | send-start | send-stop | state | reset | ping"
    echo ""
    echo "  stream      Écouter le flux SSE (Terminal 1)"
    echo "  send-start  Envoyer START (Terminal 2) - Victoire si stream affiche RECORDING"
    echo "  send-stop   Envoyer STOP avec transcript"
    echo "  state       Afficher l'état actuel"
    echo "  reset       Réinitialiser la machine"
    echo "  ping        Vérifier que le controller Ghost répond"
    echo ""
    echo "Variables: BASE_URL=$BASE_URL SESSION_ID=$SESSION_ID"
    exit 1
    ;;
esac
