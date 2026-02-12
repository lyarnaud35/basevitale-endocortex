#!/usr/bin/env bash
# Phase 1 – Vérification : le projet exige Node 20 LTS (Orval, NestJS, Next.js).
# Usage : ./scripts/check-node-20.sh  ou  npm run check:node20
set -e
V="$(node -v 2>/dev/null || echo 'none')"
if [[ "$V" =~ ^v20\. ]]; then
  echo "OK: Node $V (LTS 20)"
  exit 0
fi
echo "ERREUR: Node 20 requis, trouvé: $V"
echo "→ nvm use 20   OU   conda activate endocortex-env   puis relancer."
echo "→ Voir docs/NODE20-SETUP.md"
exit 1
