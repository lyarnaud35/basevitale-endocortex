#!/usr/bin/env bash
# Phase 2 : Clean slate – supprime node_modules et package-lock.json, réinstalle avec npm.
# À lancer dans un terminal où Node 20 est actif (conda activate + export PATH).
# Usage : npm run phase2:clean-install
set -e
cd "$(dirname "$0")/.."
echo "Phase 2 : Nettoyage radical..."
rm -rf node_modules package-lock.json
echo "Réinstallation alignée (npm install, legacy-peer-deps via .npmrc)..."
npm install
echo "OK. Tu peux lancer l’API (onglet 2) puis openapi:fetch + sdk:gen:file (onglet 1)."
