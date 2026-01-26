# BaseVitale - Version Cabinet

**Architecture Neuro-Symbiotique pour la gestion hospitalière**

[![Version](https://img.shields.io/badge/version-Cabinet-blue)]()
[![Sprint](https://img.shields.io/badge/sprint-1%20%26%202-green)]()
[![Status](https://img.shields.io/badge/status-Core%20Implémenté-success)]()

## 🎯 Vue d'Ensemble

BaseVitale est un système de gestion hospitalière qui se définit par **ses modes de raisonnement** plutôt que par ses fonctionnalités. Il alterne dynamiquement entre **rigueur absolue (sécurité)** et **intuition assistée (diagnostic)**.

### Architecture Neuro-Symbiotique

- **🧠 Module O** : Orchestrateur Contextuel (pilotage central)
- **🛡️ Module C+** : Gardien de Sécurité (Identité/INS, 2FA)
- **📊 Module E+** : Verrou de Cohérence Factuelle (Facturation)
- **🤖 Module B+** : Éclaireur Bayésien (Codage/Diagnostic)
- **✍️ Module S** : Scribe Sémantique (Transcription → Knowledge Graph)
- **🔄 Module L** : Boucle d'Apprentissage (Feedback)

## 🚀 Démarrage Rapide

### Prérequis
- Node.js 18+
- Docker & Docker Compose
- npm ou yarn

### Installation

```bash
# Cloner et installer
npm install

# Valider l'environnement (optionnel)
./scripts/validate-env.sh

# Setup initial complet (optionnel, avec tests)
./scripts/setup-and-test.sh
```

### Démarrage

**Avec Docker** (stack complète) :

```bash
# Démarrage automatique (Docker + API + Python)
npm run start:complete
# Ou : ./scripts/start-complete.sh

# Ou manuellement
docker-compose up -d
npm run prisma:generate
npm run prisma:migrate
npm run dev:api
```

**Sans Docker** (API seule, mode MOCK) :

```bash
npm run dev:api-only
# REDIS_HOST=localhost par défaut ; Prisma client généré si besoin
```

**Frontend** : `npm run dev:web` (Next.js sur http://localhost:4200).

### Vérifications rapides

- Health API : http://localhost:3000/api/health  
- Health Scribe : http://localhost:3000/api/scribe/health  
- Métriques : http://localhost:3000/api/metrics  

### Build

```bash
npm run build:api       # Build API (cache Nx → rapide)
npm run build:api:clean # Rebuild complet sans cache (dépannage)
```

Éviter `| tail` sur les builds Nx : la sortie est bufferisée et un timeout peut tuer la commande avant la fin.

### Tests

```bash
npm run test:tracer-bullet         # Tracer Bullet Scribe (MOCK) — health + POST /analyze + drafts
npm run test:phase-c               # Smoke-test Phase C (LOCAL) — Cortex + API + /analyze (AI_MODE=LOCAL)
npm run test:ai-cortex             # Health Cortex + tests Python
npm run test:integration           # Intégration complète (curl)
npm run test:e2e                   # E2E Scribe (API + JSON + Prisma ; Postgres + Redis requis)
npm run test:scribe                # Tests unitaires Scribe (nx test api)
./scripts/test-sprint2.sh          # Tests sprint 2
```

## 📋 Fonctionnalités Implémentées

### ✅ Sprint 1 : Fondation Invariante

- **Module C+ (Identité/INS)** : Gestion complète des patients
  - Création avec validation INS
  - Dédoublonnage automatique
  - Recherche multi-critères
  - Sécurité par construction

### ✅ Sprint 2 : Cortex Sémantique (Core)

- **Module S (Scribe)** : Extraction Knowledge Graph
  - Extraction sémantique depuis texte
  - Support MOCK, CLOUD, LOCAL
  - Stockage atomique dans PostgreSQL
  - Flux complet : texte → graphe → stockage

- **Knowledge Graph** : Structure complète
  - Nœuds sémantiques (symptômes, diagnostics, etc.)
  - Relations entre nœuds
  - Support pgvector pour recherche sémantique

### ✅ Sprint 3 : Automatisme Déterministe - COMPLET

- **Module E+ (Facturation)** : Service complet avec validation
  - Règle "Pas de Preuve = Pas de Facture" implémentée
  - Workflow : PENDING → VALIDATED → TRANSMITTED
  - Endpoints REST complets

- **Module B+ (Codage)** : Service de codage automatique
  - Suggestion codes CIM-10/11 avec confiance
  - Filtrage par seuil de confiance
  - Warnings et recommandations

## 📁 Structure du Projet

```
BASEVITALE/
├── apps/
│   ├── api/                    # NestJS Backend
│   │   ├── src/
│   │   │   ├── identity/       # Module C+ (INS)
│   │   │   ├── knowledge-graph/# Knowledge Graph Service
│   │   │   ├── scribe/         # Module S (Extraction)
│   │   │   ├── billing/        # Module E+ (En préparation)
│   │   │   └── prisma/         # Prisma Service + client généré
│   │   └── prisma/
│   │       └── schema.prisma   # Schéma Prisma (API = propriétaire DB)
│   ├── web/                    # Next.js Frontend
│   └── ai-cortex/              # Python FastAPI Sidecar
├── libs/
│   └── shared/
│       └── src/
│           └── contracts/      # Schémas Zod (Single Source of Truth)
├── docs/                       # Documentation complète
├── scripts/                    # Scripts de test et setup
└── docker-compose.yml          # Infrastructure
```

## 🔧 Technologies

- **Backend** : NestJS (Modular Monolith)
- **Frontend** : Next.js 14+ (App Router), Tailwind, Shadcn/UI
- **Database** : PostgreSQL (Prisma) + pgvector, Neo4j, Redis
- **AI** : Python FastAPI (Ollama/Instructor), OpenAI
- **Validation** : Zod (Single Source of Truth)
- **Monorepo** : Nx

## 📚 Documentation

- **[Guide de démarrage complet](docs/GUIDE_DEMARRAGE_COMPLET.md)** - Docker, API seule, config, tests
- **[Architecture](docs/CONTEXTE_ARCHITECTURE.md)** - Architecture neuro-symbiotique
- **[Méthodologie](docs/METHODOLOGIE_VERSION_CABINET.md)** - Méthodologie géodésique
- **[Progression](docs/PROGRESSION.md)** - Suivi des sprints
- **[Testing](docs/TESTING.md)** - Guide de test
- **[Audit Deep Dive](docs/AUDIT_DEEP_DIVE_V3.md)** - Conformité Lone Wolf, Sémaphore GPU, Contract-First

## 🎯 Endpoints API

### Health & Monitoring
- `GET /api/health` - Health check simple
- `GET /api/health/db` - Health check avec vérification DB
- `GET /api/health/all` - Health check complet
- `GET /api/metrics` - Métriques (admin seulement)
- `GET /api/metrics/health` - Métriques de santé (public)

### Module C+ (Identité)
- `POST /api/identity/patients` - Créer un patient
- `GET /api/identity/patients/:id` - Obtenir un patient
- `GET /api/identity/patients/by-ins/:insToken` - Rechercher par INS
- `GET /api/identity/patients/search` - Recherche multi-critères

### Module S (Scribe) ⭐ Phase C Activée
- `POST /api/scribe/analyze` - Analyser consultation (MOCK/LOCAL/CLOUD)
- `POST /api/scribe/analyze-consultation` - Analyse avec données structurées
- `POST /api/scribe/process-dictation` - Traiter dictée → ConsultationDraft
- `GET /api/scribe/drafts` - Lister brouillons (pagination, filtre `patientId`)
- `GET /api/scribe/draft/:id` - Récupérer draft
- `PUT /api/scribe/draft/:id` - Mettre à jour draft
- `PUT /api/scribe/validate/:id` - Valider draft → Neo4j
- `GET /api/scribe/health` - Health check module (Postgres, Neo4j, Redis)
- `GET /api/scribe/stats` - Statistiques module
- `POST /api/scribe/extract-graph` - Extraire Knowledge Graph
- `POST /api/scribe/transcribe-and-extract` - Flux complet (extraction + stockage)

### Module E+ (Facturation)
- `POST /api/billing/events` - Créer événement de facturation
- `POST /api/billing/events/:id/validate` - Valider événement
- `POST /api/billing/events/:id/transmit` - Transmettre événement
- `GET /api/billing/consultations/:id/events` - Lister événements
- `GET /api/billing/events/:id` - Obtenir événement

### Module B+ (Codage)
- `POST /api/coding/suggest` - Suggérer codes CIM
- `GET /api/coding/consultations/:id` - Codes d'une consultation

### Module L (Feedback)
- `POST /api/feedback/events` - Créer événement de feedback
- `POST /api/feedback/coding` - Correction de codage
- `GET /api/feedback/entities/:id` - Feedbacks d'une entité
- `GET /api/feedback/stats` - Statistiques de feedback

## 🔐 Modes AI

- **MOCK** (par défaut) : Données générées par Faker
- **CLOUD** : OpenAI directement (GPT-4) via NestJS
- **LOCAL** : Sidecar Python (AI Cortex) avec Generic Universal Worker
  - Construction dynamique Pydantic depuis JSON Schema
  - Support OpenAI et Ollama
  - Fallback automatique vers MOCK si indisponible
  - **Sémaphore GPU** : verrou Redis pour réguler les appels IA (Scribe, Transcription, PDF)

Configurer via `AI_MODE` dans `.env`. En LOCAL, Redis est utilisé pour le sémaphore ; `./scripts/validate-env.sh` affiche les réglages.

## 📊 État d'Avancement

| Sprint | Status | Description |
|--------|--------|-------------|
| Sprint 1 | ✅ Complet | Fondation Invariante (Module C+) |
| Sprint 2 | ✅ Complet | Cortex Sémantique (Module S) |
| Sprint 3 | ✅ Complet | Automatisme Déterministe (E+, B+) |
| Sprint 4 | 🟡 Préparé | Feedback & Outpass (Module L) |

**Total** : **35+ endpoints REST opérationnels**

### ✨ Phase C : Activation Sidecar IA (V162+)
- ✅ Generic Universal Worker Python implémenté
- ✅ Connexion backend → Python opérationnelle
- ✅ Mode LOCAL fonctionnel avec fallback MOCK
- ✅ Tests d'intégration complets
- ✅ Monitoring et métriques détaillées

### ✨ Optimisations Enterprise
- ✅ **Sécurité** : Rate limiting, RBAC, Sanitization
- ✅ **Monitoring** : Logging, Métriques, Tracing, Health (Postgres, Neo4j, Redis)
- ✅ **Performance** : Cache, Optimisations DB, Timeout adaptatif, Sémaphore GPU (Redis)
- ✅ **Robustesse** : Gestion d'erreurs avancée, Validation multi-niveaux

## 🤝 Contribution

Ce projet suit la méthodologie "Lone Wolf" optimisée pour le développement solo/duo.

Consultez [`.cursorrules`](.cursorrules) pour les règles de développement.

## 📝 Licence

MIT

## 🙏 Remerciements

BaseVitale implémente l'architecture neuro-symbiotique pour une gestion hospitalière intelligente et sécurisée.

---

**Version Cabinet** - Système robuste où la saisie clinique alimente automatiquement la sécurité et la facturation sans redondance.
