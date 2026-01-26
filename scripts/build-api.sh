#!/usr/bin/env bash
# Build de l'API NestJS (Nx).
# Utilise le cache Nx par défaut → builds incrémentaux rapides.
# --clean : rebuild complet (--skip-nx-cache) pour dépannage cache.

set -e

cd "$(dirname "$0")/.."

CLEAN=""
for arg in "$@"; do
  case "$arg" in
    --clean) CLEAN="--skip-nx-cache" ;;
  esac
done

echo "🔨 Building API... $([ -n "$CLEAN" ] && echo '(clean, no cache)' || echo '(cache allowed)')"
if [ -n "$CLEAN" ]; then
  exec npx nx run api:build --skip-nx-cache
else
  exec npx nx run api:build
fi
