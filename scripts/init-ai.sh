#!/usr/bin/env bash
# Brain Loader – Lance Ollama, pull le modèle, affiche "Cerveau chargé avec succès".
# Usage: ./scripts/init-ai.sh [modèle]
#   Modèle : mistral (défaut), llama3, llama3.2, etc. Ou OLLAMA_MODEL dans .env.

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
COMPOSE_FILE="${ROOT_DIR}/docker-compose.prod.yml"
CONTAINER="basevitale-ollama"

# Modèle : arg > .env OLLAMA_MODEL > défaut mistral
if [ -n "$1" ]; then
  MODEL="$1"
elif [ -f "$ROOT_DIR/.env" ] && grep -q '^OLLAMA_MODEL=' "$ROOT_DIR/.env" 2>/dev/null; then
  MODEL="$(grep '^OLLAMA_MODEL=' "$ROOT_DIR/.env" | cut -d= -f2- | tr -d '"' | tr -d "'" | xargs)"
  [ -z "$MODEL" ] && MODEL="mistral"
else
  MODEL="${OLLAMA_MODEL:-mistral}"
fi

echo "Brain Loader: démarrage Ollama et pull du modèle ${MODEL}..."
cd "$ROOT_DIR"

docker compose -f "$COMPOSE_FILE" up -d ollama

# Attendre qu'Ollama réponde (port 11434 exposé)
echo "En attente d'Ollama..."
for i in $(seq 1 30); do
  if curl -sf http://localhost:11434/api/tags >/dev/null 2>&1; then
    break
  fi
  [ "$i" -eq 30 ] && { echo "Timeout: Ollama ne répond pas (port 11434)."; exit 1; }
  sleep 2
done

echo "Téléchargement du modèle ${MODEL}..."
docker exec "$CONTAINER" ollama pull "$MODEL"

echo "Cerveau chargé avec succès."
