# Phase C : Activation du Sidecar IA

**Date :** 2026-01-21  
**Version :** BaseVitale V162+  
**Status :** ✅ **ACTIVÉ**

---

## 🎯 Objectif

Implémenter le **Generic Universal Worker** dans le sidecar Python pour permettre le mode `LOCAL` avec structuration IA.

---

## ✅ Implémentation Complétée

### 1. Generic Universal Worker (`apps/ai-cortex/main.py`)

**Fonctionnalités :**

#### **Endpoint Principal : `POST /process-generic`**
- ✅ Construction dynamique de modèles Pydantic depuis JSON Schema
- ✅ **Aucun hardcoding** - Modèles créés à la volée
- ✅ Support multi-provider (OpenAI, Ollama)
- ✅ Gestion complète des types complexes (arrays, objets imbriqués)

#### **Endpoint Alias : `POST /structure`**
- ✅ Compatible avec le backend NestJS existant
- ✅ Délègue vers `/process-generic` en interne
- ✅ Format de requête préservé

#### **Fonctionnalités Techniques :**

**Construction Dynamique Pydantic :**
```python
def json_schema_to_pydantic_model(schema: Dict[str, Any]) -> type[BaseModel]:
    """
    Convertit un JSON Schema en modèle Pydantic dynamique.
    CRITIQUE: Pas de hardcoding - construction dynamique uniquement.
    """
    # Construction récursive pour objets imbriqués
    # Support arrays, unions, optionals
    # Gestion des champs requis/optionnels
```

**Support Multi-Provider :**
```python
# OpenAI (défaut)
LLM_PROVIDER=openai
OPENAI_API_KEY=sk-...

# Ollama (local)
LLM_PROVIDER=ollama
OLLAMA_BASE_URL=http://localhost:11434/v1
OLLAMA_MODEL=llama2
```

---

## 🔄 Flux Complet

```
┌─────────────────────────────────────────────────────────────┐
│  NestJS (TypeScript)                                         │
│                                                              │
│  1. ConsultationSchema (Zod)                                 │
│     ↓                                                         │
│  2. zodToJsonSchema() → JSON Schema                          │
│     ↓                                                         │
│  3. POST /structure (ou /process-generic)                    │
│     { text, json_schema }                                    │
└─────────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────┐
│  AI Cortex (Python)                                          │
│                                                              │
│  4. JSON Schema → Modèle Pydantic dynamique                  │
│     (json_schema_to_pydantic_model)                          │
│     ↓                                                         │
│  5. Instructor + LLM → Structuration                         │
│     (response_model=DynamicModel)                            │
│     ↓                                                         │
│  6. Retour JSON structuré                                    │
│     { data: {...} }                                          │
└─────────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────┐
│  NestJS (TypeScript)                                         │
│                                                              │
│  7. Validation Zod (ConsultationSchema.parse)                │
│     ↓                                                         │
│  8. Retour Consultation structurée                           │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔧 Configuration

### Variables d'Environnement

**Backend NestJS :**
```env
AI_MODE=LOCAL
AI_CORTEX_URL=http://localhost:8000
```

**AI Cortex (Python) :**
```env
# Provider
LLM_PROVIDER=openai  # ou "ollama"

# OpenAI
OPENAI_API_KEY=sk-...
OPENAI_BASE_URL=https://api.openai.com/v1
LLM_MODEL=gpt-4o-mini

# Ollama (alternative)
OLLAMA_BASE_URL=http://localhost:11434/v1
OLLAMA_MODEL=llama2

# Serveur
PORT=8000
HOST=0.0.0.0
```

---

## 🐳 Docker

Le service est configuré dans `docker-compose.yml` :

```yaml
ai-cortex:
  build:
    context: ./apps/ai-cortex
    dockerfile: Dockerfile
  ports:
    - "8000:8000"
  environment:
    - LLM_PROVIDER=${LLM_PROVIDER:-openai}
    - OPENAI_API_KEY=${OPENAI_API_KEY:-}
    - OLLAMA_BASE_URL=${OLLAMA_BASE_URL:-...}
  healthcheck:
    test: ["CMD", "curl", "-f", "http://localhost:8000/health"]
```

**Démarrage :**
```bash
docker-compose up -d ai-cortex
```

---

## 🧪 Tests

### Test Manuel avec curl

```bash
# Health check
curl http://localhost:8000/health

# Test structure
curl -X POST http://localhost:8000/structure \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Patient tousse, fièvre 39",
    "json_schema": {
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

### Test d'Intégration

```bash
# Lancer le script de test
cd apps/ai-cortex
python test_integration.py

# Ou sans test LLM
python test_integration.py --skip-llm
```

---

## 📊 Architecture Respectée

### Law III: Universal Worker ✅

1. **Stateless** : Aucun état interne
2. **Générique** : Aucune logique métier hardcodée
3. **Construction dynamique** : Modèles Pydantic créés à la volée
4. **Provider agnostic** : Support OpenAI et Ollama

### Law I: Contract-First Intelligence ✅

1. **Schéma Zod** = Source de vérité unique (TypeScript)
2. **JSON Schema** = Format d'échange (TypeScript → Python)
3. **Modèle Pydantic** = Structuration (Python)
4. **Validation Zod** = Vérification finale (TypeScript)

---

## 🚀 Utilisation

### Mode LOCAL avec Backend

```typescript
// Le backend appelle automatiquement le sidecar en mode LOCAL
const consultation = await scribeService.analyzeConsultation(
  "Patient tousse, fièvre 39",
  "patient_123"
);

// Le flux :
// 1. ConsultationSchema → JSON Schema (zodToJsonSchema)
// 2. POST /structure { text, json_schema }
// 3. Python structure via LLM
// 4. Validation Zod en retour
```

### Fallback Automatique

Si le sidecar n'est pas disponible, le backend **fallback automatiquement vers MOCK** :

```typescript
// Dans scribe.service.ts
try {
  return await this.analyzeConsultationLocal(text);
} catch (error) {
  // Fallback vers MOCK
  return this.analyzeConsultationMock(text);
}
```

---

## 📈 Métriques

Le backend track les métriques suivantes :

- `scribe.extractions.local.direct` - Appels directs réussis
- `scribe.extractions.local.queue` - Appels via queue réussis
- `scribe.extractions.local.error` - Erreurs sidecar
- `scribe.extractions.local.fallback` - Fallbacks vers MOCK

---

## ✅ Checklist Phase C

- [x] Endpoint `/process-generic` implémenté
- [x] Construction dynamique Pydantic
- [x] Support multi-provider (OpenAI, Ollama)
- [x] Endpoint `/structure` (alias)
- [x] Health check endpoint
- [x] Configuration Docker
- [x] Script de test d'intégration
- [x] Documentation complète
- [x] Compatibilité backend NestJS
- [x] Gestion d'erreurs robuste

---

## 🎯 Prochaines Étapes

1. **Tests E2E** : Tester le flux complet NestJS → Python → NestJS
2. **Optimisation** : Cache des modèles Pydantic dynamiques si possible
3. **Monitoring** : Métriques détaillées côté Python
4. **Retry Logic** : Implémenter retry avec backoff

---

*Phase C : Activation du Sidecar IA - BaseVitale V162+*
