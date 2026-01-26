# Changelog - BaseVitale V162+

**Version :** 162+  
**Date :** 2026-01-21

---

## 🎉 Nouvelles Fonctionnalités

### Phase C : Activation du Sidecar IA

#### **Generic Universal Worker (Python)**
- ✅ Endpoint `/process-generic` - Construction dynamique Pydantic
- ✅ Endpoint `/structure` - Alias pour compatibilité
- ✅ Support multi-provider (OpenAI, Ollama)
- ✅ Health check endpoint

#### **Connexion Backend → Python**
- ✅ `ScribeService.analyze()` - Gestion mode LOCAL
- ✅ Conversion automatique Zod → JSON Schema
- ✅ Appel HTTP vers sidecar Python
- ✅ Fallback automatique vers MOCK

---

## 🔧 Améliorations

### Tests
- ✅ Tests unitaires `ScribeController` complets
- ✅ Script de test d'intégration complet
- ✅ Tests AI Cortex
- ✅ Scripts de test automatisés
- ✅ **E2E Scribe** : `npm run test:e2e` — flux complet `POST /scribe/analyze` (MOCK + LOCAL si Python) → vérif JSON (ConsultationSchema) → vérif persistance Prisma (ConsultationDraft) ; prérequis Postgres + Redis

### Robustesse
- ✅ Endpoint `/scribe/validate` amélioré
- ✅ Validation Zod multi-niveaux
- ✅ Gestion contraintes FK intelligente
- ✅ Métriques détaillées (7 compteurs + 2 timings)
- ✅ **Sémaphore GPU** : `GpuLockService` (verrou Redis `lock:gpu:1`), `runWithLock` avant tout appel IA ; Bull `concurrency: 1` sur `scribe-consultation` ; env `GPU_LOCK_TTL_SECONDS`, `GPU_LOCK_MAX_WAIT_MS`
- ✅ **GpuLock étendu** : Transcription (Whisper), PDF Extraction ; Scribe health inclut `redis` (ping GPU lock) ; script `dev:api-only` et doc GPU lock

### Monitoring
- ✅ Endpoint `/scribe/health` - Health check
- ✅ Endpoint `/scribe/stats` - Statistiques
- ✅ Métriques complètes tracking
- ✅ Performance monitoring

### Infrastructure
- ✅ Scripts de démarrage automatique
- ✅ Dockerfile optimisé
- ✅ Configuration variables d'environnement
- ✅ Health checks configurés

### Frontend réactif (Scribe)
- ✅ **Bouton Analyser** connecté au backend `POST /scribe/process-dictation`
- ✅ **États de chargement** : étapes « Envoi » → « Analyse IA en cours… (jusqu'à 30 s) » ; indicateur animé ; **Annuler** (AbortController) ; message « L'IA peut être lente… » ; **skeleton** pendant l'attente
- ✅ **Affichage JSON structuré** : résumé (X symptômes · Y diagnostics · Z médicaments), **Vue JSON** (toggle), barres de **confiance** par diagnostic ; formulaire éditable pour validation visuelle

---

## 🐛 Corrections

### Schémas Zod
- ✅ `patientId` et `consultationId` - Validation flexible (string au lieu de CUID)
- ✅ Support des identifiants externes

### Gestion Erreurs
- ✅ Gestion contraintes FK (patientId, consultationId)
- ✅ Mode LOCAL : 503 "AI Service Unavailable" si Cortex down/timeout (pas de fallback MOCK)
- ✅ Frontend : message explicite pour 503 (vérifier ai-cortex)
- ✅ Logging détaillé des erreurs

---

## 📚 Documentation

### Nouveaux Documents
- ✅ `GUIDE_DEMARRAGE_COMPLET.md`
- ✅ `PHASE_C_ACTIVATION.md`
- ✅ `CONNEXION_PYTHON_SIDECAR.md`
- ✅ `OPTIMISATIONS_FINALES_V162.md`
- ✅ `RESUME_PHASE_C.md`
- ✅ `INTEGRATION_PYTHON_COMPLETE.md`
- ✅ `RESUME_FINAL_V162.md`
- ✅ `CHANGELOG_V162.md`

### Documents Mis à Jour
- ✅ README AI Cortex
- ✅ Documentation architecture

---

## 🚀 Scripts

### Nouveaux Scripts
- ✅ `scripts/start-complete.sh` - Démarrage complet
- ✅ `scripts/test-integration-complete.sh` - Tests intégration
- ✅ `scripts/test-ai-cortex.sh` - Tests Python

### NPM Scripts
- ✅ `npm run start:complete` - Démarrage complet
- ✅ `npm run test:integration` - Tests intégration
- ✅ `npm run test:ai-cortex` - Tests AI Cortex
- ✅ `npm run test:tracer-bullet` - Tracer Bullet Scribe (MOCK) : health + POST /analyze + drafts
- ✅ `npm run test:phase-c` - Smoke-test Phase C (LOCAL) : Cortex + API + POST /analyze

### Optimisations récentes
- ✅ **docker-compose** : suppression `version` obsolète (warning)
- ✅ **validate-env** : en `AI_MODE=LOCAL`, vérification reachability Cortex (`curl /health`)
- ✅ **Script Phase C** : `scripts/test-phase-c-local.sh` — Cortex health → API health → POST /analyze
- ✅ **README** : section Tests (tracer-bullet, phase-c, ai-cortex), lien Phase C, Audit V3
- ✅ **Guide** : Phase C mentionne `npm run test:phase-c` ; intégration complète pointe vers tracer-bullet / phase-c / e2e
- ✅ **LOCAL** : plus de fallback MOCK → 503 "AI Service Unavailable" ; frontend (`formatApiError`) message explicite 503

---

## 📊 Métriques

### Nouvelles Métriques
- `scribe.analyze.local.success` - Succès LOCAL
- `scribe.analyze.local.error` - Erreurs LOCAL
- `scribe.analyze.local.fallback_to_mock` - Fallbacks
- `scribe.analyze.local.saved` - Sauvegardes LOCAL
- `scribe.analyze.local.duration` - Durée traitement LOCAL
- `scribe.validation.started` - Validations démarrées
- `scribe.validation.success` - Validations réussies
- `scribe.validation.nodes_created` - Nœuds créés
- `scribe.validation.neo4j_relations` - Relations Neo4j

---

## ⚙️ Configuration

### Variables d'Environnement
- ✅ `AI_CORTEX_URL` - URL du sidecar Python
- ✅ `LLM_PROVIDER` - Provider LLM (openai/ollama)
- ✅ `LLM_MODEL` - Modèle LLM
- ✅ `LLM_BASE_URL` - URL base LLM

### Docker
- ✅ Service `ai-cortex` configuré
- ✅ Health check AI Cortex
- ✅ Variables d'environnement complètes

---

## 🔄 Migration

### Pour migrer vers V162+

Aucune migration nécessaire. Le système est rétrocompatible.

**Recommandations :**
1. Mettre à jour `.env` avec nouvelles variables optionnelles
2. Démarrer AI Cortex si utilisation mode LOCAL
3. Vérifier les tests d'intégration

---

## 📈 Performance

### Améliorations
- ✅ Validation Draft optimisée
- ✅ Batch operations Knowledge Graph
- ✅ Timeout Cortex configurable (60s par défaut, `AI_CORTEX_TIMEOUT_MS`)

---

## 🎯 Prochaines Étapes

1. ⏭️ Tests E2E complets avec frontend
2. ⏭️ Optimisation cache modèles Pydantic
3. ⏭️ Métriques Prometheus
4. ⏭️ Retry mechanism Neo4j
5. ⏭️ Documentation Swagger

---

**Changelog V162+ - BaseVitale**
