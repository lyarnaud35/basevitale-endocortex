#!/bin/bash
# Script de synchronisation de l'environnement pour le mode LOCAL
# Usage: ./scripts/sync-env-local.sh

set -e

ENV_FILE=".env"
ENV_EXAMPLE="env.example"
ENV_SYNC=".env.sync"

echo "🔄 Synchronisation de l'environnement pour le mode LOCAL"
echo ""

# Vérifier si .env existe
if [ ! -f "$ENV_FILE" ]; then
  echo "⚠️  Fichier .env non trouvé. Création depuis env.example..."
  cp "$ENV_EXAMPLE" "$ENV_FILE"
  echo "✅ Fichier .env créé"
fi

# Variables à mettre à jour/ajouter
VARS=(
  "AI_MODE=LOCAL"
  "AI_SERVICE_URL=http://ai-cortex:8000"
  "OLLAMA_BASE_URL=http://host.docker.internal:11434/v1"
  "OLLAMA_MODEL=llama3.2"
)

echo "📝 Mise à jour des variables d'environnement..."

for var in "${VARS[@]}"; do
  key=$(echo "$var" | cut -d'=' -f1)
  value=$(echo "$var" | cut -d'=' -f2-)
  
  # Vérifier si la variable existe déjà
  if grep -q "^${key}=" "$ENV_FILE" 2>/dev/null; then
    # Mettre à jour la valeur existante
    if [[ "$OSTYPE" == "darwin"* ]]; then
      # macOS
      sed -i '' "s|^${key}=.*|${key}=${value}|" "$ENV_FILE"
    else
      # Linux
      sed -i "s|^${key}=.*|${key}=${value}|" "$ENV_FILE"
    fi
    echo "  ✅ ${key} mis à jour"
  else
    # Ajouter la variable à la fin du fichier
    echo "${key}=${value}" >> "$ENV_FILE"
    echo "  ✅ ${key} ajouté"
  fi
done

echo ""
echo "✅ Synchronisation terminée !"
echo ""
echo "📋 Variables configurées :"
echo "   - AI_MODE=LOCAL"
echo "   - AI_SERVICE_URL=http://ai-cortex:8000"
echo "   - OLLAMA_BASE_URL=http://host.docker.internal:11434/v1"
echo "   - OLLAMA_MODEL=llama3.2"
echo ""
echo "🚀 Prochaines étapes :"
echo "   1. Vérifiez que Ollama tourne sur votre machine : ollama serve"
echo "   2. Lancez les services Docker : docker compose up -d ai-cortex"
echo "   3. Testez l'API : curl -X POST http://localhost:3000/api/scribe/analyze -H 'Content-Type: application/json' -d '{\"text\": \"Patient avec fièvre et toux\"}'"
echo ""
