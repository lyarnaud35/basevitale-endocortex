FROM python:3.11-slim

WORKDIR /app

# Installer les dépendances système
RUN apt-get update && apt-get install -y \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copier les fichiers requirements
COPY requirements.txt .

# Installer les dépendances Python
RUN pip install --no-cache-dir -r requirements.txt

# Copier le code source
COPY main.py .

# Créer un script de démarrage pour meilleure gestion des variables d'environnement
RUN echo '#!/bin/bash\n\
set -e\n\
\n\
export PORT=${PORT:-8000}\n\
export HOST=${HOST:-0.0.0.0}\n\
export LLM_PROVIDER=${LLM_PROVIDER:-ollama}\n\
export OLLAMA_BASE_URL=${OLLAMA_BASE_URL:-http://host.docker.internal:11434/v1}\n\
\n\
echo "Starting AI Cortex (Universal Worker)..."\n\
echo "  Port: $PORT | Host: $HOST"\n\
echo "  LLM: $LLM_PROVIDER | OLLAMA_BASE_URL: $OLLAMA_BASE_URL"\n\
\n\
exec uvicorn main:app --host "$HOST" --port "$PORT" --log-level info\n\
' > /app/start.sh && chmod +x /app/start.sh

# Exposer le port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:8000/health || exit 1

# Commande de démarrage
CMD ["/app/start.sh"]
