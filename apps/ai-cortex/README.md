# AI Cortex - Universal Worker

**Version :** 2.0.0  
**Phase :** C - Activation du Sidecar IA  
**Architecture :** Law III - Universal Worker

---

## 🎯 Objectif

Service FastAPI générique pour structurer les réponses LLM via `instructor`.  
**AUCUNE logique métier** - Pur proxy de structuration.

---

## 📋 Endpoints

### `POST /process-generic` ⭐ **PRINCIPAL**

Endpoint universel pour structurer du texte selon un schéma JSON.

**Request:**
```json
{
  "text": "Patient tousse, fièvre 39, douleur gorge",
  "schema": {
    "type": "object",
    "properties": {
      "patientId": {"type": "string"},
      "transcript": {"type": "string"},
      "symptoms": {
        "type": "array",
        "items": {"type": "string"}
      },
      "diagnosis": {
        "type": "array",
        "items": {
          "type": "object",
          "properties": {
            "code": {"type": "string"},
            "label": {"type": "string"},
            "confidence": {"type": "number"}
          },
          "required": ["code", "label", "confidence"]
        }
      }
    },
    "required": ["patientId", "transcript", "symptoms", "diagnosis"]
  },
  "system_prompt": "Tu es un assistant médical...",  // Optionnel
  "llm_provider": "openai",  // Optionnel: "openai" ou "ollama"
  "llm_model": "gpt-4o-mini",  // Optionnel
  "base_url": "https://api.openai.com/v1"  // Optionnel
}
```

**Response:**
```json
{
  "data": {
    "patientId": "patient_123",
    "transcript": "Patient tousse, fièvre 39, douleur gorge",
    "symptoms": ["Toux", "Fièvre", "Douleur gorge"],
    "diagnosis": [
      {
        "code": "J11.1",
        "label": "Grippe saisonnière",
        "confidence": 0.85
      }
    ]
  }
}
```

---

### `POST /structure` (Alias)

Alias pour compatibilité avec le backend existant.

**Request:**
```json
{
  "text": "Patient tousse...",
  "json_schema": { ... }
}
```

---

### `GET /health`

Health check du service.

---

## 🔧 Configuration

### Variables d'environnement

```bash
# Provider LLM (défaut: ollama pour Universal Worker local)
LLM_PROVIDER=ollama   # ou "openai"
LLM_MODEL=gpt-4o-mini # ou "llama3.2" pour Ollama

# Ollama (LLM local) — utilisé quand LLM_PROVIDER=ollama
# Mac + Docker : host.docker.internal pour accéder à Ollama sur la machine hôte
# docker-compose avec service ollama : http://ollama:11434/v1
OLLAMA_BASE_URL=http://host.docker.internal:11434/v1
OLLAMA_MODEL=llama3.2

# OpenAI (si provider=openai)
OPENAI_API_KEY=sk-...
LLM_BASE_URL=https://api.openai.com/v1

# Serveur
PORT=8000
HOST=0.0.0.0
```

### Démarrage

```bash
# Installation des dépendances
pip install -r requirements.txt

# Démarrage
python main.py

# Ou avec uvicorn directement
uvicorn main:app --host 0.0.0.0 --port 8000
```

---

## 🏗️ Architecture

### Law III: Universal Worker

1. **Stateless** : Aucun état interne
2. **Générique** : Pas de logique métier hardcodée
3. **Construction dynamique** : Modèles Pydantic créés à la volée depuis JSON Schema
4. **Provider agnostic** : Support OpenAI et Ollama

### Fonctionnement

```
NestJS (TypeScript)
    ↓
    Convertit Zod Schema → JSON Schema (via zodToJsonSchema)
    ↓
    POST /process-generic
    ↓
AI Cortex (Python)
    ↓
    JSON Schema → Modèle Pydantic dynamique (json_schema_to_pydantic_model)
    ↓
    Instructor + LLM → Réponse structurée
    ↓
    Retour JSON structuré
    ↓
NestJS
    ↓
    Validation avec Zod Schema
```

---

## 🧪 Tests

### Test avec curl

```bash
curl -X POST http://localhost:8000/process-generic \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Patient tousse, fièvre 39",
    "schema": {
      "type": "object",
      "properties": {
        "symptoms": {
          "type": "array",
          "items": {"type": "string"}
        }
      },
      "required": ["symptoms"]
    }
  }'
```

### Test avec ConsultationSchema

Le backend NestJS convertit automatiquement le Zod Schema en JSON Schema et appelle cet endpoint.

---

## 📦 Dépendances

- `fastapi` : Framework web
- `uvicorn` : Serveur ASGI
- `pydantic` : Validation et modèles dynamiques
- `instructor` : Structuration LLM
- `openai` : Client OpenAI compatible (OpenAI + Ollama)

---

## ⚠️ Notes Importantes

1. **Construction dynamique** : Les modèles Pydantic sont créés à la volée - **pas de hardcoding**
2. **JSON Schema standard** : Le schéma doit être au format JSON Schema (compatible avec OpenAPI3)
3. **Provider support** : OpenAI et Ollama supportés
4. **Stateless** : Chaque requête est indépendante

---

*AI Cortex - Universal Worker V2.0.0*
