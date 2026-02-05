# Kit de Livraison Souverain (v121)

Mode **LOCAL** avec Ollama dans le compose. Aucun appel Cloud par défaut.

**Voir aussi :** `docs/INTEGRATION.md` (démarrage, init IA Brain Loader, intégration widget UI).

---

## 1. Services (docker-compose.prod.yml)

| Service | Rôle |
|--------|------|
| **api** | NestJS (buildée) |
| **ai-cortex** | Python Worker (structuration LLM) |
| **postgres** | PostgreSQL + pgvector |
| **neo4j** | Graphe |
| **redis** | Cache / queues |
| **ollama** | LLM local (`ollama/ollama`), volume `ollama_data:/root/.ollama` |
| **nats** | Messaging (requis pour le boot API via `NatsModule`) |

`ai-cortex` appelle `OLLAMA_BASE_URL=http://ollama:11434/v1`. Modèles persistés dans `ollama_data`.

---

## 2. Configuration (.env)

```bash
cp env.prod.example .env
# Ajuster si besoin (mots de passe, CORS, etc.)
```

Valeurs par défaut **LOCAL** :

```bash
AI_MODE=LOCAL
OLLAMA_BASE_URL=http://ollama:11434/v1
AI_MODEL_FAST=mistral
AI_MODEL_SMART=mistral
OLLAMA_MODEL=mistral
LLM_MODEL=mistral
```

---

## 3. Lancement

```bash
docker compose -f docker-compose.prod.yml up -d
```

---

## 4. Premier démarrage – Brain Loader (init-ai.sh)

Ollama démarre sans modèle. Utiliser le **Brain Loader** :

```bash
./scripts/init-ai.sh
```

Le script :
1. Lance le conteneur `ollama` (compose prod).
2. Attend qu’Ollama réponde.
3. Exécute `ollama pull mistral` (ou le modèle passé en argument / `OLLAMA_MODEL` dans `.env`).
4. Affiche **« Cerveau chargé avec succès »**.

Modèle personnalisé : `./scripts/init-ai.sh llama3` ou définir `OLLAMA_MODEL` dans `.env`.

---

## 5. Vérifications

- **Ollama** : `curl http://localhost:11434/api/tags` → liste des modèles.
- **ai-cortex** : `curl http://localhost:8000/health` → 200.
- **API** : `curl http://localhost:3000/api/scribe/health` → 200.
- **Swagger** : `http://localhost:3000/api-docs`.

---

## 6. GPU (optionnel)

Pour NVIDIA GPU, décommenter dans `docker-compose.prod.yml` sous le service `ollama` :

```yaml
deploy:
  resources:
    reservations:
      devices:
        - driver: nvidia
          count: all
          capabilities: [gpu]
```

Sans GPU, Ollama tourne en CPU.

---

## 7. Basculer en Cloud

Dans `.env` : `AI_MODE=CLOUD`, puis `GROQ_API_KEY` ou `OPENAI_API_KEY`. Voir `env.prod.example`.

---

## 8. Dépannage

- **Ollama lent / timeouts** : en CPU, les modèles peuvent être lents. Privilégier `mistral` ou `llama3` (plus légers) ou activer le GPU (voir §6).
