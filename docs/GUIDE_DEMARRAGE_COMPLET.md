# 🚀 Guide de Démarrage Complet - BaseVitale

**Version :** BaseVitale V162+  
**Date :** 2026-01-21

---

## 📋 Vue d'Ensemble

Ce guide vous permet de démarrer l'ensemble du système BaseVitale avec tous ses composants :
- ✅ Backend NestJS
- ✅ Sidecar Python (AI Cortex)
- ✅ Services Docker (PostgreSQL, Neo4j, Redis, etc.)

---

## 🎯 Démarrage Rapide

### Option 1 : Script Automatique (Recommandé)

```bash
# Démarrage complet automatique
npm run start:complete

# Ou directement
./scripts/start-complete.sh
```

### Option 2 : Démarrage Manuel

```bash
# 1. Services Docker
docker-compose up -d

# 2. Sidecar Python
cd apps/ai-cortex
python main.py
# Ou via Docker:
docker-compose up -d ai-cortex

# 3. Backend NestJS
npm run dev:api
```

### Option 3 : API seule (sans Docker)

Lorsque Docker n’est pas disponible, l’API peut tourner en mode MOCK avec Redis local :

```bash
# REDIS_HOST=localhost par défaut, Prisma client généré si besoin
npm run dev:api-only
# Ou : ./scripts/start-api-only.sh
```

En mode MOCK, l’IA n’est pas appelée. En mode LOCAL, Redis doit être accessible (ex. install local) pour le **sémaphore GPU**.

---

## 🔧 Configuration

### Variables d'Environnement

Créer un fichier `.env` à la racine :

```env
# Mode IA
AI_MODE=LOCAL  # MOCK, CLOUD, ou LOCAL

# Backend
PORT=3000
NODE_ENV=development

# Base de données
DATABASE_URL=postgresql://basevitale:basevitale_secure@localhost:5432/basevitale_db

# AI Cortex (Python) — mode LOCAL
# En Docker : AI_SERVICE_URL=http://ai-cortex:8000 (défaut)
# Hors Docker : AI_SERVICE_URL=http://localhost:8000
AI_SERVICE_URL=http://ai-cortex:8000
AI_CORTEX_URL=http://localhost:8000
LLM_PROVIDER=openai  # ou ollama
OPENAI_API_KEY=sk-...  # Si provider=openai

# Neo4j
NEO4J_URI=bolt://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=neo4j

# Redis (Bull, cache, sémaphore GPU)
REDIS_HOST=localhost
REDIS_PORT=6379

# Sémaphore GPU (optionnel, valeurs par défaut)
# GPU_LOCK_TTL_SECONDS=120
# GPU_LOCK_MAX_WAIT_MS=60000
```

**Prisma :** Schéma et migrations dans `apps/api/prisma/`. L’API est le seul propriétaire de la DB. Génération du client : `npm run prisma:generate`.

**Sémaphore GPU** : en mode `AI_MODE=LOCAL`, les appels IA (Scribe, Transcription, PDF) sont régulés par un verrou Redis (`lock:gpu:1`) pour éviter la saturation. Voir `GpuLockService` et `/scribe/health` (champ `redis`).

### Frontend (Next.js)

Pour le frontend (`npm run dev:web`), les variables **publiques** sont lues au build :

```env
NEXT_PUBLIC_API_URL=http://localhost:3000
NEXT_PUBLIC_WS_URL=http://localhost:3000
```

À définir dans `.env` à la racine ou dans `apps/web/.env.local`. Si absentes, les défauts `http://localhost:3000` sont utilisés. `./scripts/validate-env.sh` affiche `NEXT_PUBLIC_API_URL` si défini.

### Étape 1 — Vérification visuelle (Tracer Bullet)

Valider que le **Front ↔ Back** fonctionne (CORS, ports, réseau) :

1. **Backend** : `AI_MODE=MOCK` dans `.env`, puis `npm run dev:api` (port 3000).
2. **Frontend** : `npm run dev:web` (port 4200). Si erreur project graph, voir *« Frontend : Could not create project graph »* (supprimer `apps/web/.next` puis relancer).
3. **Navigateur** : ouvrir [http://localhost:4200/scribe/test](http://localhost:4200/scribe/test).
4. **Action** : cliquer sur **« SIMULER CONSULTATION »**.
5. **Attendu** : le même JSON que le `curl` POST `/api/scribe/analyze` s’affiche (success, data avec symptoms, diagnosis, medications). Si c’est le cas, la communication Front ↔ Back est validée.

Lien direct depuis la page Scribe : **→ Page test (Tracer Bullet)**.

### Phase C — Activation du Cortex (LOCAL)

Une fois le flux MOCK validé, brancher le **sidecar Python** pour des réponses IA réelles :

1. **Vérifier que le container `ai-cortex` tourne :**
   ```bash
   docker compose ps ai-cortex
   curl -s http://localhost:8000/health
   ```
   Ou : `npm run test:ai-cortex` (vérifie le health puis lance les tests Python).
   Si le container n’est pas up : `docker compose up -d ai-cortex`.

2. **Configurer le mode LOCAL dans `.env` :**
   ```env
   AI_MODE=LOCAL
   AI_CORTEX_URL=http://localhost:8000
   # Optionnel : timeout HTTP (ms). Défaut 60000 (60s)
   # AI_CORTEX_TIMEOUT_MS=60000
   ```

3. **Redémarrer l’API** (pour prendre en compte `AI_MODE`) :
   ```bash
   npm run dev:api
   ```
   Vérifier dans les logs : `ScribeService initialized with AI_MODE: LOCAL`.

4. **Tester :** même flux qu’en MOCK (curl `POST /api/scribe/analyze` ou page [http://localhost:4200/scribe/test](http://localhost:4200/scribe/test)). Le JSON structuré provient du sidecar Python (`/process-generic`). En cas d’indisponibilité du Cortex, le service fait un **fallback automatique vers MOCK**.
   - **Smoke-test rapide :** `npm run test:phase-c` (vérifie Cortex + API + POST /analyze).

**Contrainte :** Les appels HTTP vers le Cortex ont un **timeout de 60s** par défaut (configurable via `AI_CORTEX_TIMEOUT_MS`), l’IA locale pouvant être lente.

---

## 🧪 Tests d'Intégration

### Test Complet

```bash
# Tester l'intégration complète
npm run test:integration

# Ou directement
./scripts/test-integration-complete.sh
```

**Ce script teste :**
- ✅ Health checks (API + Python)
- ✅ Mode MOCK
- ✅ Process Dictation
- ✅ Get/Validate Draft
- ✅ Mode LOCAL (si Python disponible)
- ✅ Scribe Health & Stats

### E2E Scribe (flux complet + Prisma)

```bash
npm run test:e2e
# Ou : ./scripts/test-e2e.sh
```

**Prérequis :** Postgres (`DATABASE_URL`), Redis. Optionnel : Python sur `:8000` pour les tests LOCAL.

**Ce que couvre l’E2E :**
- **MOCK :** `POST /api/scribe/analyze` → vérification du JSON (ConsultationSchema) → vérification de l’enregistrement en base (ConsultationDraft via Prisma).
- **LOCAL :** Même flux si le sidecar Python est accessible (skip sinon).

Les tests E2E bootstrapent l’app NestJS (AppModule), appellent l’API en processus, puis interrogent Prisma pour valider la persistance.

### Test AI Cortex Seul

```bash
# Tester uniquement le sidecar Python
npm run test:ai-cortex

# Ou directement
./scripts/test-ai-cortex.sh
```

---

## 📊 Vérification des Services

### Health Checks

```bash
# API NestJS
curl http://localhost:3000/api/health

# AI Cortex
curl http://localhost:8000/health

# Scribe Module
curl http://localhost:3000/api/scribe/health

# Scribe Stats
curl http://localhost:3000/api/scribe/stats
```

### Services Docker

```bash
# Vérifier les containers
docker ps

# Vérifier les logs
docker-compose logs -f

# Logs spécifiques
docker-compose logs -f ai-cortex
docker-compose logs -f postgres
```

---

## 🎯 Modes de Fonctionnement

### Mode MOCK (Par défaut)
```env
AI_MODE=MOCK
```
- ✅ Données générées par Faker
- ✅ Pas d'appel IA
- ✅ Instantané
- ✅ Idéal pour développement

### Mode LOCAL
```env
AI_MODE=LOCAL
AI_CORTEX_URL=http://localhost:8000
LLM_PROVIDER=openai  # ou ollama
```
- ✅ Utilise le sidecar Python
- ✅ Structuration via LLM
- ✅ 503 AI Service Unavailable si Cortex indisponible (pas de fallback MOCK)

### Mode CLOUD
```env
AI_MODE=CLOUD
OPENAI_API_KEY=sk-...
```
- ✅ OpenAI directement depuis NestJS
- ✅ Pas besoin de sidecar Python

---

## 🔍 Dépannage

### API ne démarre pas

```bash
# Vérifier les logs
tail -f /tmp/basevitale-api.log

# Vérifier le port
lsof -i :3000

# Tuer les processus existants
pkill -f "nx serve api"
```

### Python Sidecar non accessible

```bash
# Vérifier que le service tourne
curl http://localhost:8000/health

# Redémarrer
cd apps/ai-cortex
python main.py

# Ou via Docker
docker-compose restart ai-cortex
```

### Base de données non accessible

Le schéma Prisma est dans `apps/api/prisma/schema.prisma` (API = propriétaire DB).

```bash
# Vérifier PostgreSQL
docker exec basevitale-postgres pg_isready -U postgres

# Vérifier les migrations
cd apps/api
npx prisma migrate status

# Appliquer les migrations
npx prisma migrate deploy
```

### Frontend (Next.js) : « Could not create project graph »

Si `nx serve web` échoue avec une erreur de project graph ou `.next/types/package.json` :

```bash
npx nx reset
# Puis relancer
npm run dev:web
```

Si `apps/web/.next/types/package.json` est vide ou invalide, le définir à `{"type": "module"}` ou **supprimer `.next`** et relancer. Souvent le plus fiable :

```bash
rm -rf apps/web/.next
npm run dev:web
```

### Build API : timeout ou échec avec `| tail`

Ne **pas** utiliser `| tail -20` (ou équivalent) sur `nx run api:build` : la sortie est bufferisée, et un timeout (CI, IDE) peut tuer la commande avant la fin.

**À utiliser à la place :**

```bash
npm run build:api        # Build avec cache Nx (rapide après 1er run)
npm run build:api:clean  # Rebuild complet (--skip-nx-cache), si besoin
```

Ou directement `./scripts/build-api.sh` / `./scripts/build-api.sh --clean`. Sortie en flux continu, pas de `tail`.

---

## 📈 Monitoring

### Métriques API

```bash
curl http://localhost:3000/api/metrics
```

### Stats Scribe

```bash
curl http://localhost:3000/api/scribe/stats
```

### Health Complet

```bash
curl http://localhost:3000/api/health/all
```

---

## 🚀 Workflow Recommandé

### 1. Premier Démarrage

```bash
# Setup initial
npm install
npm run dev:setup

# Démarrer tous les services
npm run start:complete

# Tester
npm run test:integration
```

### 2. Développement Quotidien

```bash
# Démarrer services Docker (une seule fois)
docker-compose up -d

# Démarrer API + Python en développement
npm run dev:api &
cd apps/ai-cortex && python main.py &
```

### 3. Tests

```bash
# Tests unitaires
npm test

# Tests d'intégration
npm run test:integration

# Tests AI Cortex
npm run test:ai-cortex
```

---

## ✅ Checklist de Vérification

Avant de commencer à développer, vérifiez :

- [ ] Docker est démarré (`docker ps`)
- [ ] PostgreSQL accessible (`docker exec basevitale-postgres pg_isready`)
- [ ] Client Prisma généré (`ls apps/api/src/prisma/client`)
- [ ] Migrations appliquées (`npx prisma migrate status`)
- [ ] API accessible (`curl http://localhost:3000/api/health`)
- [ ] Python accessible (`curl http://localhost:8000/health`) - Optionnel
- [ ] Variables d'environnement configurées (`.env`)

---

## 📚 Ressources

- **Documentation Architecture :** `docs/CONTEXTE_ARCHITECTURE.md`
- **Guide Phase C :** `docs/PHASE_C_ACTIVATION.md`
- **Connexion Python :** `docs/CONNEXION_PYTHON_SIDECAR.md`
- **Tests :** `docs/TESTING.md`

---

**Guide de Démarrage Complet - BaseVitale V162+**
