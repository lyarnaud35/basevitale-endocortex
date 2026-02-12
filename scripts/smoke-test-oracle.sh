#!/usr/bin/env bash
# Smoke Test Oracle (LIVE / Gemini)
# Prérequis : .env avec ORACLE_MODE=LIVE et GEMINI_API_KEY. API NestJS démarrée (ex. PORT=3001).
# Usage : ./scripts/smoke-test-oracle.sh [base_url]

BASE="${1:-http://localhost:3001}"

echo "=== Smoke Test Oracle (base: $BASE) ==="
echo ""
echo "1. Tir : POST start"
curl -s -X POST "$BASE/api/oracle/patient-123/start"
echo ""
echo ""
echo "2. Dans un autre terminal, lance : curl -N $BASE/api/oracle/patient-123/stream"
echo "   Attendu : INITIALIZING -> FETCHING_CONTEXT -> ANALYZING -> READY"
echo "   À READY : context.timeline et context.alertes en JSON structuré."
echo ""
echo "3. État actuel :"
curl -s "$BASE/api/oracle/patient-123/state" | jq . 2>/dev/null || curl -s "$BASE/api/oracle/patient-123/state"
echo ""
echo "=== Fin ==="
