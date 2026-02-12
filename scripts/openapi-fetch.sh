#!/usr/bin/env bash
# GHOST PROTOCOL - Étape 1 : Extraction de la matière première (OpenAPI JSON)
# Prérequis : API démarrée (npm run dev:api). Enregistre le spec vers openapi/base-vitale.json.
set -e
PORT="${1:-3000}"
URL="http://localhost:${PORT}/api-json"
OUT_DIR="openapi"
OUT_FILE="${OUT_DIR}/base-vitale.json"
mkdir -p "$OUT_DIR"
echo "Fetching OpenAPI spec from ${URL}..."
curl -sS "$URL" -o "$OUT_FILE"
echo "Saved to ${OUT_FILE}"
if command -v jq >/dev/null 2>&1; then
  jq -e '.openapi and .paths' "$OUT_FILE" >/dev/null && echo "OK: Valid OpenAPI structure" || (echo "WARN: Check the file content"; exit 1)
else
  echo "OK: Spec saved (jq non installé, validation ignorée)"
fi
