# RAPPORT DE DIAGNOSTIC CRASH
**Date:** 2026-01-23  
**Ingénieur SRE:** Analyse Système BaseVitale  
**Module:** Intégration Neuro-Symbiotique (Scribe + AI Cortex)

---

## 1. ÉTAT DE L'IMPLÉMENTATION

### 1.1 Fichiers Clés Créés/Modifiés

#### Backend (NestJS)
- ✅ `apps/api/src/scribe/scribe.service.ts` (839 lignes)
  - Méthode `analyze()` implémentée avec support MOCK/CLOUD/LOCAL
  - Mode LOCAL : Appel à `/process-generic` via `HttpService`
  - Conversion Zod → JSON Schema via `zodToJsonSchema`
  - Gestion d'erreurs avec `ServiceUnavailableException`
  
- ✅ `apps/api/src/scribe/scribe.controller.ts` (751 lignes)
  - Endpoint `POST /api/scribe/analyze` avec `@Timeout(120000)`
  - Validation Zod via `ZodValidationPipe`
  - Sanitization des inputs
  
- ✅ `apps/api/src/scribe/scribe.module.ts` (48 lignes)
  - `HttpModule.register({ timeout: 120000 })` configuré
  - `CommonModule` importé pour `ConfigService`
  - `BullModule` configuré pour traitement asynchrone

#### Frontend (Next.js)
- ✅ `apps/web/app/scribe/page.tsx` (837 lignes)
  - Interface complète avec états de chargement
  - Appel à `/scribe/process-dictation` (pas `/analyze`)
  - Gestion d'erreurs avec `formatApiError`
  - Health check du module Scribe
  
- ✅ `apps/web/lib/api/client.ts` (172 lignes)
  - `API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'`
  - `API_BASE = ${API_URL}/api`
  - Gestion d'erreurs 503 avec message spécifique pour AI Service Unavailable

#### Configuration
- ✅ `docker-compose.yml`
  - Service `ai-cortex` sur port 8000
  - Variables: `OLLAMA_BASE_URL`, `OLLAMA_MODEL`, `LLM_PROVIDER`
  
- ✅ `env.example`
  - `AI_MODE=LOCAL`
  - `AI_SERVICE_URL=http://ai-cortex:8000` (Docker) ou `http://localhost:8000` (local)
  - `OLLAMA_BASE_URL=http://host.docker.internal:11434/v1`
  - `OLLAMA_MODEL=llama3`

#### Base de Données
- ✅ `apps/api/prisma/schema.prisma`
  - Modèle `ConsultationDraft` avec `structuredData Json?`
  - Modèle `Consultation` (si présent)

### 1.2 Vérification des Imports (Analyse Statique)

#### Backend
- ✅ `@basevitale/shared` : `ConsultationSchema`, `zodToJsonSchema` importés
- ✅ `@nestjs/axios` : `HttpService` importé
- ✅ `@nestjs/common` : `ServiceUnavailableException` importé
- ✅ `rxjs` : `firstValueFrom` importé

#### Frontend
- ✅ `../../lib/api/client` : `API_BASE`, `formatApiError` importés
- ✅ `next/link` : `Link` importé (utilisé dans page.tsx ligne 4)

**⚠️ POINT D'ATTENTION :**
- Frontend appelle `/scribe/process-dictation` mais le Controller expose aussi `/scribe/analyze`
- Vérifier la cohérence des endpoints utilisés

---

## 2. POINTS DE FRICTION POTENTIELS (Analyse Statique)

### 2.1 Conflits de Ports

| Service | Port Configuré | Port Utilisé | Statut |
|---------|---------------|--------------|--------|
| API NestJS | 3000 (ConfigService) | 3000 | ✅ OK |
| Frontend Next.js | 4200 (par défaut Nx) | ? | ⚠️ À vérifier |
| AI Cortex | 8000 (docker-compose) | 8000 | ✅ OK |
| PostgreSQL | 5432 | 5432 | ✅ OK |
| Redis | 6379 | 6379 | ✅ OK |

**⚠️ RISQUE :** Si Next.js tourne sur 4200 et que le frontend pointe vers `localhost:3000`, pas de conflit. Mais vérifier que `NEXT_PUBLIC_API_URL` est bien défini.

### 2.2 Variables d'Environnement Requises

#### Backend (NestJS)
| Variable | Source | Défaut | Statut |
|----------|--------|--------|--------|
| `AI_MODE` | `env.example:11` | `MOCK` | ✅ Défini (`LOCAL`) |
| `AI_SERVICE_URL` | `env.example:20` | `http://ai-cortex:8000` | ⚠️ **CRITIQUE** : Doit être `http://localhost:8000` si API tourne en local |
| `AI_CORTEX_TIMEOUT_MS` | `env.example:24` | `60000` | ✅ Optionnel |
| `DATABASE_URL` | Prisma | Construit depuis POSTGRES_* | ✅ OK |
| `REDIS_HOST` | `env.example:43` | `localhost` | ✅ OK |
| `REDIS_PORT` | `env.example:44` | `6379` | ✅ OK |
| `OLLAMA_BASE_URL` | `env.example:30` | `http://host.docker.internal:11434/v1` | ✅ OK |
| `OLLAMA_MODEL` | `env.example:31` | `llama3` | ✅ OK |

#### Frontend (Next.js)
| Variable | Source | Défaut | Statut |
|----------|--------|--------|--------|
| `NEXT_PUBLIC_API_URL` | `client.ts:1` | `http://localhost:3000` | ⚠️ **À vérifier** dans `.env.local` |

**🔴 PROBLÈME IDENTIFIÉ :**
- `AI_SERVICE_URL` dans `env.example` = `http://ai-cortex:8000` (nom Docker)
- Si l'API NestJS tourne **en local** (pas dans Docker), elle ne peut pas résoudre `ai-cortex`
- **Solution attendue :** `AI_SERVICE_URL=http://localhost:8000` quand API en local

### 2.3 Configuration CORS

**Fichier:** `apps/api/src/main.ts` (lignes 28-32)

```typescript
app.enableCors({
  origin: configService.corsOrigin,
  credentials: true,
});
```

**ConfigService:** `corsOrigin` = `process.env.CORS_ORIGIN || '*'`

**✅ STATUT :** CORS configuré avec `origin: '*'` par défaut → Frontend peut communiquer avec Backend

**⚠️ RECOMMANDATION :** En production, restreindre `CORS_ORIGIN` à l'URL du frontend.

### 2.4 Timeouts et Intercepteurs

**Problème Potentiel Identifié :**

1. **TimeoutInterceptor Global** (`apps/api/src/common/interceptors/timeout.interceptor.ts`)
   - Défaut : `DEFAULT_TIMEOUT_MS = 30000` (30s)
   - **Risque :** Les appels AI Cortex peuvent prendre 20-30s → Timeout avant la fin

2. **Corrections Appliquées :**
   - ✅ `HttpModule.register({ timeout: 120000 })` dans `scribe.module.ts`
   - ✅ `@Timeout(120000)` sur endpoint `/analyze` dans `scribe.controller.ts`

**✅ STATUT :** Corrections appliquées, mais nécessitent un redémarrage de l'API.

### 2.5 Endpoints Incohérences

| Endpoint | Controller | Frontend | Statut |
|----------|-----------|----------|--------|
| `POST /api/scribe/analyze` | ✅ Existe | ❌ Non utilisé | ⚠️ Incohérence |
| `POST /api/scribe/process-dictation` | ✅ Existe | ✅ Utilisé | ✅ OK |

**⚠️ POINT D'ATTENTION :** Le frontend utilise `/process-dictation` qui nécessite un `patientId`, alors que `/analyze` ne nécessite que `text`. Vérifier la logique métier.

---

## 3. COMMANDES DE DIAGNOSTIC (Action Requise)

### 3.1 Extraction des Logs Docker

```bash
# Logs AI Cortex (dernières 100 lignes avec timestamps)
docker compose logs --tail=100 --timestamps ai-cortex

# Logs AI Cortex (filtrage erreurs uniquement)
docker compose logs --tail=200 ai-cortex | grep -E "(ERROR|Exception|Traceback|Failed)" | tail -50

# Logs tous services (vue d'ensemble)
docker compose logs --tail=50 --timestamps
```

### 3.2 Extraction des Logs NestJS

```bash
# Si l'API tourne en arrière-plan (fichier de log)
tail -100 /tmp/nx-serve-api-final.log

# Si l'API tourne dans un terminal, copier les logs depuis le terminal
# Rechercher les lignes contenant :
# - "ERROR"
# - "LOCAL"
# - "Service Python injoignable"
# - "Connection is closed"
# - "503"
```

### 3.3 Vérification de l'État des Services

```bash
# État des containers Docker
docker compose ps

# Santé des services
curl -s http://localhost:8000/health | jq .
curl -s http://localhost:3000/api/health | jq .

# Test de connectivité API → Cortex
curl -v http://localhost:8000/health 2>&1 | grep -E "(Connected|HTTP|200)"
```

---

## 4. ESPACE LOGS (Placeholder)

### LOGS TERMINAL

```
[Coller ici les logs d'erreur observés]
```

**Format attendu :**
- Logs Docker : `docker compose logs ai-cortex`
- Logs NestJS : Terminal où `nx serve api` tourne
- Erreurs frontend : Console navigateur (F12 → Console)

---

## 5. RÉSUMÉ DES PROBLÈMES IDENTIFIÉS

### 🔴 CRITIQUES

1. **Configuration `AI_SERVICE_URL`**
   - **Problème :** `env.example` définit `http://ai-cortex:8000` (nom Docker)
   - **Impact :** Si API NestJS tourne en local, elle ne peut pas résoudre `ai-cortex`
   - **Solution :** Utiliser `http://localhost:8000` quand API en local

2. **Timeout Global vs Timeout AI Cortex**
   - **Problème :** TimeoutInterceptor global (30s) peut couper les appels AI Cortex (20-30s)
   - **Solution :** ✅ Déjà corrigé avec `@Timeout(120000)` et `HttpModule` timeout

### 🟡 AVERTISSEMENTS

1. **Incohérence Endpoints**
   - Frontend utilise `/process-dictation` mais `/analyze` existe aussi
   - Vérifier la logique métier attendue

2. **Variable `NEXT_PUBLIC_API_URL`**
   - Non définie dans `env.example` (commentée)
   - Défaut : `http://localhost:3000` → OK si frontend et API sur même machine

3. **Port Frontend**
   - Next.js peut tourner sur 4200 (Nx) ou 3000 (Next.js)
   - Vérifier le port réel utilisé

### ✅ POINTS POSITIFS

1. ✅ CORS configuré correctement
2. ✅ Imports partagés (`@basevitale/shared`) corrects
3. ✅ Gestion d'erreurs robuste (503 avec messages explicites)
4. ✅ Timeouts configurés pour AI Cortex
5. ✅ Health checks disponibles

---

## 6. RECOMMANDATIONS IMMÉDIATES

1. **Vérifier `.env` actuel :**
   ```bash
   grep -E "^AI_SERVICE_URL|^AI_MODE|^NEXT_PUBLIC_API_URL" .env
   ```

2. **Redémarrer l'API NestJS** après les corrections de timeout

3. **Tester la connectivité :**
   ```bash
   # Depuis la machine hôte
   curl http://localhost:8000/health
   curl http://localhost:3000/api/health
   ```

4. **Vérifier les logs** avec les commandes de la section 3

---

**Rapport généré le :** 2026-01-23  
**Prochaine étape :** Coller les logs dans la section 4 pour analyse approfondie
