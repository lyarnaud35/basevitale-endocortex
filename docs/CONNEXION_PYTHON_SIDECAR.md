# 🔗 Connexion Python Sidecar - BaseVitale

**Date :** 2026-01-21  
**Version :** BaseVitale V162+  
**Status :** ✅ **CONNECTÉ**

---

## ✅ Implémentation Complétée

### Modification de `ScribeService.analyze()`

**Fichier :** `apps/api/src/scribe/scribe.service.ts`

**Changements :**

1. ✅ **Gestion mode LOCAL** : Appel direct du sidecar Python via `/process-generic`
2. ✅ **Conversion Zod → JSON Schema** : Utilise `zodToJsonSchema(ConsultationSchema)`
3. ✅ **Appel HTTP** : POST vers `http://localhost:8000/process-generic` (ou `http://ai-cortex:8000` en Docker)
4. ✅ **Payload** : `{ "text": string, "schema": JSON Schema }`
5. ✅ **Sauvegarde Postgres** : Même logique que MOCK
6. ✅ **Fallback MOCK** : Mode dégradé si Python indisponible

---

## 🔄 Flux Complet

### Mode LOCAL

```
┌─────────────────────────────────────────────────────────────┐
│  ScribeService.analyze(text)                                │
│  AI_MODE=LOCAL                                              │
└─────────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────┐
│  1. Conversion Zod → JSON Schema                            │
│     zodToJsonSchema(ConsultationSchema)                     │
└─────────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────┐
│  2. POST http://localhost:8000/process-generic              │
│     {                                                        │
│       "text": "Patient tousse, fièvre 39",                  │
│       "schema": { ... } // JSON Schema                      │
│     }                                                        │
└─────────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────┐
│  3. AI Cortex (Python)                                      │
│     - Construction modèle Pydantic dynamique                │
│     - Instructor + LLM → Structuration                      │
│     - Retour { data: {...} }                                │
└─────────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────┐
│  4. Validation Zod                                          │
│     ConsultationSchema.parse(structuredData)                │
└─────────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────┐
│  5. Sauvegarde Postgres                                     │
│     prisma.consultationDraft.create({                       │
│       patientId,                                            │
│       status: 'DRAFT',                                      │
│       structuredData: consultation                          │
│     })                                                       │
└─────────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────┐
│  6. Retour Consultation structurée                          │
└─────────────────────────────────────────────────────────────┘
```

### Fallback MOCK

Si le sidecar Python ne répond pas :

```
┌─────────────────────────────────────────────────────────────┐
│  Erreur sidecar Python                                      │
│  (Timeout, connexion refusée, etc.)                         │
└─────────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────┐
│  Log erreur + Métriques                                     │
│  - scribe.analyze.local.error                               │
│  - scribe.analyze.local.fallback_to_mock                    │
└─────────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────┐
│  Génération MOCK                                            │
│  - Données Faker                                            │
│  - Validation Zod                                           │
│  - Sauvegarde Postgres                                      │
└─────────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────┐
│  Retour Consultation MOCK                                   │
│  (Mode dégradé - Front ne plante pas)                       │
└─────────────────────────────────────────────────────────────┘
```

---

## 📊 Métriques

### Succès
- `scribe.analyze.local.success` - Appels réussis
- `scribe.analyze.local.saved` - Sauvegardes réussies
- `scribe.analyze.local.duration` - Durée traitement (timing)

### Erreurs
- `scribe.analyze.local.error` - Erreurs sidecar
- `scribe.analyze.local.validation_error` - Erreurs validation Zod
- `scribe.analyze.local.save_error` - Erreurs sauvegarde
- `scribe.analyze.local.fallback_to_mock` - Fallbacks activés

---

## 🔧 Configuration

### Variables d'Environnement

```env
# Mode IA
AI_MODE=LOCAL

# URL du sidecar Python
AI_CORTEX_URL=http://localhost:8000  # Development
# Ou en Docker:
AI_CORTEX_URL=http://ai-cortex:8000  # Production
```

### Détection Automatique

Le code détecte automatiquement l'environnement :

```typescript
const sidecarUrl = process.env.NODE_ENV === 'production' 
  ? `http://ai-cortex:8000`  // Nom du service Docker
  : this.pythonSidecarUrl;    // localhost:8000 par défaut
```

---

## 🧪 Test

### Test Manuel

```bash
# 1. Démarrer le sidecar Python
cd apps/ai-cortex
python main.py

# 2. Tester depuis le backend
curl -X POST http://localhost:3000/api/scribe/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Patient tousse, fièvre 39, douleur gorge"
  }'
```

### Test avec Docker

```bash
# Démarrer tous les services
docker-compose up -d

# Tester l'endpoint
curl -X POST http://localhost:3000/api/scribe/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Patient tousse, fièvre 39"
  }'
```

---

## ✅ Garanties

### Résilience
- ✅ **Fallback automatique** : MOCK si Python indisponible
- ✅ **Mode dégradé** : Le front continue de fonctionner
- ✅ **Logging détaillé** : Toutes les erreurs sont loggées

### Validation
- ✅ **Validation Zod stricte** : Garantit la structure des données
- ✅ **Contract-First** : JSON Schema → Pydantic → Zod

### Performance
- ✅ **Timeout 60s** : Évite les blocages
- ✅ **Métriques** : Tracking complet des performances

---

## 🎯 Comparaison des Modes

| Mode | Source | Temps | Qualité | Coût |
|------|--------|-------|---------|------|
| **MOCK** | Faker | <1ms | Basique | Gratuit |
| **LOCAL** | Python + LLM | 2-10s | Élevée | Variable |
| **CLOUD** | OpenAI direct | 1-5s | Élevée | Payant |

---

## 🔍 Points d'Attention

### 1. URL du Sidecar
- ✅ Détection automatique Docker/Development
- ✅ Configurable via `AI_CORTEX_URL`

### 2. Timeout
- ✅ 60 secondes (configurable)
- ✅ Suffisant pour LLM local ou cloud

### 3. Fallback
- ✅ Automatique si Python indisponible
- ✅ Logs explicites pour debugging
- ✅ Métriques pour monitoring

---

*Connexion Python Sidecar - BaseVitale V162+*
