#!/usr/bin/env bash
# Phase 2 - Vérification de la vérité : Dashboard unifié (Oracle READY + Security DEFCON_3)
# Prérequis : API démarrée (ex: PORT=3001 npm run dev:api)
# Usage: ./scripts/validate-dashboard-state.sh [port]

set -e
PORT="${1:-3000}"
BASE="http://localhost:${PORT}/api"
PATIENT_ID="patient-dashboard-test"

echo "=== Phase 2: Vérification Dashboard State ==="
echo "Base URL: $BASE"
echo ""

echo "1. Déclenchement Oracle (POST /oracle/${PATIENT_ID}/start)..."
curl -s -X POST "${BASE}/oracle/${PATIENT_ID}/start" | jq . || true
echo ""

echo "2. Attente 2s (mock READY + SecurityGuard DEFCON_3)..."
sleep 2

echo "3. GET /patient/${PATIENT_ID}/dashboard-state (coding peut être encore ANALYZING)"
curl -s "${BASE}/patient/${PATIENT_ID}/dashboard-state" | jq .
echo ""

echo "4. Attente 2s supplémentaires (CodingAssistant mock → SUGGESTING)..."
sleep 2
echo "5. GET /patient/${PATIENT_ID}/dashboard-state (coding attendu: SUGGESTING)"
curl -s "${BASE}/patient/${PATIENT_ID}/dashboard-state" | jq .

echo ""
echo "Attendu: oracle.state === \"READY\", security.status === \"DEFCON_3\", coding.status === \"SUGGESTING\" (après 4s)"
