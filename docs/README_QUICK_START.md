# BaseVitale - Quick Start Guide

## 🚀 Démarrage rapide

### 1. Prérequis
- Node.js 18+
- Docker & Docker Compose
- npm ou yarn

### 2. Installation

```bash
# Cloner et installer
npm install

# Démarrer les services Docker
docker-compose up -d

# Générer le client Prisma
npx prisma generate

# Créer et appliquer les migrations
npx prisma migrate dev --name init_sprint1_foundation
```

### 3. Configuration

Créer un fichier `.env` à la racine :

```env
# Database
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/basevitale?schema=public"

# AI Configuration
AI_MODE=MOCK  # MOCK, CLOUD, or LOCAL
OPENAI_API_KEY=your_key_here  # Si AI_MODE=CLOUD

# Python Sidecar (si AI_MODE=LOCAL)
AI_CORTEX_URL=http://localhost:8000
OLLAMA_BASE_URL=http://localhost:11434/v1
OLLAMA_MODEL=llama2
```

### 4. Lancer l'API

```bash
npm run dev
```

L'API sera disponible sur `http://localhost:3000`

## 📋 Endpoints disponibles

### Module C+ (Identité/INS)

#### Créer un patient
```bash
POST /identity/patients
```

#### Rechercher un patient par INS
```bash
GET /identity/patients/by-ins/:insToken
```

#### Rechercher des patients
```bash
GET /identity/patients/search?lastName=Dupont&firstName=Jean
```

### Module S (Scribe/Cortex Sémantique)

#### Extraire Knowledge Graph depuis texte
```bash
POST /scribe/extract-graph
Body: { "text": "...", "patientId": "optional" }
```

#### Traiter transcription complète (extraction + stockage)
```bash
POST /scribe/transcribe-and-extract
Body: { "text": "...", "patientId": "required" }
```

## 🧪 Test rapide

```bash
# 1. Créer un patient
curl -X POST http://localhost:3000/identity/patients \
  -H "Content-Type: application/json" \
  -d '{
    "insToken": "INS123456789",
    "firstName": "Jean",
    "lastName": "Dupont",
    "birthDate": "1980-01-15"
  }'

# 2. Extraire un Knowledge Graph (MOCK)
curl -X POST http://localhost:3000/scribe/extract-graph \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Le patient présente une fièvre à 38.5°C et des maux de tête. Diagnostic : grippe. Prescription : paracétamol."
  }'
```

## 📚 Documentation

- Architecture : `docs/CONTEXTE_ARCHITECTURE.md`
- Méthodologie : `docs/METHODOLOGIE_VERSION_CABINET.md`
- Progression : `docs/PROGRESSION.md`
- Sprint 1 : `docs/SPRINT1_COMPLETION.md`
- Sprint 2 : `docs/SPRINT2_COMPLETION.md`

## 🔧 Commandes utiles

```bash
# Voir les logs Docker
docker-compose logs -f

# Accéder à PostgreSQL
docker exec -it basevitale-postgres psql -U postgres -d basevitale

# Générer client Prisma après modification du schema
npx prisma generate

# Créer une nouvelle migration
npx prisma migrate dev --name nom_de_la_migration

# Ouvrir Prisma Studio (UI pour la DB)
npx prisma studio
```

## ⚙️ Modes AI

### MOCK (par défaut)
- Retourne des données générées par Faker
- Aucune dépendance externe
- Parfait pour le développement

### CLOUD
- Utilise OpenAI directement
- Requiert `OPENAI_API_KEY`
- Plus rapide que LOCAL

### LOCAL
- Utilise le sidecar Python (Ollama)
- Requiert Ollama lancé localement
- Souveraineté des données

## 🎯 Sprint actuel

**Sprint 2 : Cortex Sémantique** - ✅ Core implémenté

- ✅ Extraction Knowledge Graph fonctionnelle
- ✅ Stockage dans PostgreSQL
- ✅ Support MOCK, CLOUD, LOCAL
- ⏳ Transcription audio (Whisper) - à venir

---

*BaseVitale - Version Cabinet*
