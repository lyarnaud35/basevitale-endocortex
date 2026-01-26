#!/bin/bash

# Script de validation des variables d'environnement

set -e

echo "🔍 Validation des variables d'environnement..."

# Variables optionnelles avec valeurs par défaut
NODE_ENV=${NODE_ENV:-development}
PORT=${PORT:-3000}
AI_MODE=${AI_MODE:-MOCK}
AI_CORTEX_URL=${AI_CORTEX_URL:-http://localhost:8000}
REDIS_HOST=${REDIS_HOST:-localhost}
REDIS_PORT=${REDIS_PORT:-6379}
GPU_LOCK_TTL_SECONDS=${GPU_LOCK_TTL_SECONDS:-120}
GPU_LOCK_MAX_WAIT_MS=${GPU_LOCK_MAX_WAIT_MS:-60000}

# Variables requises (pour production)
REQUIRED_VARS=()

if [ "$NODE_ENV" = "production" ]; then
    REQUIRED_VARS=(
        "DATABASE_URL"
        "JWT_SECRET"
    )
fi

# Vérifier les variables requises
MISSING_VARS=()
for var in "${REQUIRED_VARS[@]}"; do
    if [ -z "${!var}" ]; then
        MISSING_VARS+=("$var")
    fi
done

if [ ${#MISSING_VARS[@]} -ne 0 ]; then
    echo "❌ Variables d'environnement manquantes :"
    printf '   - %s\n' "${MISSING_VARS[@]}"
    exit 1
fi

echo "✅ Variables d'environnement validées"
echo "   NODE_ENV: $NODE_ENV"
echo "   PORT: $PORT"
echo "   AI_MODE: $AI_MODE"
AI_SERVICE_URL=${AI_SERVICE_URL:-http://ai-cortex:8000}
echo "   AI_SERVICE_URL: $AI_SERVICE_URL"
echo "   AI_CORTEX_URL: ${AI_CORTEX_URL:-http://localhost:8000}"
if [ "$AI_MODE" = "LOCAL" ]; then
    echo "   ℹ️  Mode LOCAL: AI Cortex (Python) requis — AI_SERVICE_URL=$AI_SERVICE_URL"
    OLLAMA_BASE_URL=${OLLAMA_BASE_URL:-http://host.docker.internal:11434/v1}
    OLLAMA_MODEL=${OLLAMA_MODEL:-llama3.2}
    echo "   Ollama: $OLLAMA_BASE_URL (modèle: $OLLAMA_MODEL)"
    echo "   Redis (sémaphore GPU): ${REDIS_HOST}:${REDIS_PORT} | TTL=${GPU_LOCK_TTL_SECONDS}s, maxWait=${GPU_LOCK_MAX_WAIT_MS}ms"
    echo "   Timeout HTTP Cortex: ${AI_CORTEX_TIMEOUT_MS:-60000}ms"
    if curl -sf "${AI_SERVICE_URL}/health" > /dev/null 2>&1; then
        echo "   ✅ Cortex reachable (${AI_SERVICE_URL}/health)"
    else
        echo "   ⚠️  Cortex non joignable — vérifiez: docker compose up -d ai-cortex"
    fi
fi
if [ -n "$NEXT_PUBLIC_API_URL" ]; then
    echo "   NEXT_PUBLIC_API_URL: $NEXT_PUBLIC_API_URL (frontend)"
else
    echo "   ℹ️  NEXT_PUBLIC_API_URL non défini → frontend utilisera http://localhost:3000"
fi
