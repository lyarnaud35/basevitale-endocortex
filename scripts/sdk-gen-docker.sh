#!/usr/bin/env bash
# GHOST PROTOCOL - Génération du SDK avec Orval sous Node 20 (Docker).
# Utiliser ce script si tu n'as pas nvm : Orval/Spectral ne tournent pas sous Node 24.
# Prérequis : Docker, et openapi/base-vitale.json (lancer avant : npm run openapi:fetch).
set -e
cd "$(dirname "$0")/.."
echo "Génération du SDK avec Orval (Node 20 dans Docker)..."
docker run --rm \
  -v "$(pwd)":/app \
  -w /app \
  node:20-alpine \
  sh -c "npm install --no-audit --no-fund && npx orval --project baseVitaleFromFile"
echo "OK. Fichiers dans libs/ghost-sdk/src/lib/generated/"
