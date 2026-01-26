# Exemples Pratiques - BaseVitale API

## 🚀 Quick Start

### 1. Démarrer l'API

```bash
npm run dev
```

L'API sera disponible sur `http://localhost:3000/api`

### 2. Vérifier la santé

```bash
curl http://localhost:3000/api/health
```

**Réponse** :
```json
{
  "success": true,
  "data": {
    "status": "ok",
    "timestamp": "2024-01-15T10:30:00.000Z",
    "service": "BaseVitale API",
    "version": "1.0.0"
  },
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

---

## 📋 Exemples par Module

### Module C+ : Gestion des Patients

#### Créer un patient

```bash
curl -X POST http://localhost:3000/api/identity/patients \
  -H "Content-Type: application/json" \
  -d '{
    "insToken": "INS123456789",
    "firstName": "Jean",
    "lastName": "Dupont",
    "birthDate": "1980-01-15",
    "birthPlace": "Paris",
    "email": "jean.dupont@example.com",
    "phone": "+33123456789",
    "address": {
      "addressLine1": "123 Rue de la Paix",
      "city": "Paris",
      "postalCode": "75001",
      "country": "FR"
    }
  }'
```

**Réponse** :
```json
{
  "success": true,
  "data": {
    "id": "clx1234567890abcdef",
    "insToken": "INS123456789",
    "firstName": "Jean",
    "lastName": "Dupont",
    "birthDate": "1980-01-15T00:00:00.000Z",
    "createdAt": "2024-01-15T10:30:00.000Z",
    ...
  },
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

#### Rechercher un patient par INS

```bash
curl http://localhost:3000/api/identity/patients/by-ins/INS123456789
```

#### Rechercher des patients

```bash
curl "http://localhost:3000/api/identity/patients/search?lastName=Dupont&firstName=Jean"
```

---

### Module S : Cortex Sémantique

#### Extraire Knowledge Graph (MOCK)

```bash
curl -X POST http://localhost:3000/api/scribe/extract-graph \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Le patient présente une fièvre à 38.5°C et des maux de tête depuis 3 jours. Diagnostic probable : grippe saisonnière. Prescription : paracétamol 1g, 3 fois par jour pendant 5 jours."
  }'
```

**Réponse** :
```json
{
  "success": true,
  "data": {
    "nodes": [
      {
        "nodeType": "SYMPTOM",
        "label": "Fièvre",
        "value": 38.5,
        "unit": "°C",
        "confidence": 0.95
      },
      {
        "nodeType": "DIAGNOSIS",
        "label": "Grippe saisonnière",
        "cim10Code": "J11.1",
        "confidence": 0.85
      },
      {
        "nodeType": "MEDICATION",
        "label": "Paracétamol",
        "confidence": 0.9
      }
    ],
    "relations": []
  },
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

#### Flux complet : Transcription + Extraction + Stockage

```bash
curl -X POST http://localhost:3000/api/scribe/transcribe-and-extract \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Consultation du patient. Fièvre à 38.5°C, maux de tête, fatigue. Diagnostic : grippe saisonnière. Prescription : paracétamol 1g x 3/jour pendant 5 jours.",
    "patientId": "clx1234567890abcdef"
  }'
```

**Réponse** :
```json
{
  "success": true,
  "data": {
    "consultation": {
      "id": "clx9876543210fedcba",
      "patientId": "clx1234567890abcdef",
      "status": "DRAFT",
      "consultationDate": "2024-01-15T10:30:00.000Z",
      "createdAt": "2024-01-15T10:30:00.000Z"
    },
    "knowledgeGraph": {
      "nodes": [...],
      "relations": [...]
    }
  },
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

---

## 🔧 Exemples de Validation

### Erreur de validation (champ manquant)

```bash
curl -X POST http://localhost:3000/api/identity/patients \
  -H "Content-Type: application/json" \
  -d '{
    "insToken": "INS123456789",
    "firstName": "Jean"
    // lastName manquant
  }'
```

**Réponse** :
```json
{
  "success": false,
  "error": "Validation failed",
  "statusCode": 400,
  "timestamp": "2024-01-15T10:30:00.000Z",
  "path": "/api/identity/patients",
  "details": {
    "message": "Validation failed",
    "errors": [
      {
        "path": "lastName",
        "message": "Le nom est requis"
      }
    ]
  }
}
```

### Erreur de dédoublonnage INS

```bash
# Créer le même patient deux fois
curl -X POST http://localhost:3000/api/identity/patients \
  -H "Content-Type: application/json" \
  -d '{
    "insToken": "INS123456789",
    "firstName": "Jean",
    "lastName": "Dupont",
    "birthDate": "1980-01-15"
  }'
```

**Réponse** :
```json
{
  "success": false,
  "error": "Un patient avec ce token INS existe déjà. Utilisez la recherche pour le trouver.",
  "statusCode": 409,
  "timestamp": "2024-01-15T10:30:00.000Z",
  "path": "/api/identity/patients"
}
```

---

## 🎯 Workflow Complet

### 1. Créer un patient

```bash
PATIENT_RESPONSE=$(curl -s -X POST http://localhost:3000/api/identity/patients \
  -H "Content-Type: application/json" \
  -d '{
    "insToken": "INS_TEST_001",
    "firstName": "Marie",
    "lastName": "Martin",
    "birthDate": "1990-05-20"
  }')

PATIENT_ID=$(echo $PATIENT_RESPONSE | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
echo "Patient créé: $PATIENT_ID"
```

### 2. Traiter une consultation

```bash
curl -X POST http://localhost:3000/api/scribe/transcribe-and-extract \
  -H "Content-Type: application/json" \
  -d "{
    \"text\": \"Consultation de suivi. Patient se plaint de maux de tête persistants. Tension artérielle normale. Prescription renouvelée : paracétamol si nécessaire.\",
    \"patientId\": \"$PATIENT_ID\"
  }"
```

### 3. Vérifier le Knowledge Graph créé

```bash
# Les nœuds sont maintenant dans PostgreSQL
# Utiliser Prisma Studio pour visualiser
npx prisma studio
```

---

## 📊 Exemples avec différents modes AI

### Mode MOCK (par défaut)

```bash
# Aucune configuration nécessaire
curl -X POST http://localhost:3000/api/scribe/extract-graph \
  -H "Content-Type: application/json" \
  -d '{"text": "Fièvre et maux de tête"}'
```

### Mode CLOUD (OpenAI)

```bash
# Définir les variables
export AI_MODE=CLOUD
export OPENAI_API_KEY=votre_cle

# Redémarrer l'API et tester
curl -X POST http://localhost:3000/api/scribe/extract-graph \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Le patient présente une douleur thoracique avec dyspnée. Antécédents familiaux d\'infarctus. ECG montre des anomalies ST. Diagnostic probable : syndrome coronarien aigu."
  }'
```

---

## 🔍 Requêtes Utiles

### Lister tous les patients

```bash
# Via recherche sans critères (retournera les premiers patients)
curl "http://localhost:3000/api/identity/patients/search?firstName="
```

### Obtenir une consultation

```bash
# Via Prisma Studio ou requête SQL directe
docker exec -it basevitale-postgres psql -U postgres -d basevitale -c \
  "SELECT id, patient_id, status, consultation_date FROM consultations ORDER BY created_at DESC LIMIT 5;"
```

### Vérifier le Knowledge Graph d'une consultation

```bash
# Via Prisma Studio ou SQL
docker exec -it basevitale-postgres psql -U postgres -d basevitale -c \
  "SELECT node_type, label, confidence FROM semantic_nodes WHERE consultation_id = 'CONSULTATION_ID' ORDER BY created_at;"
```

---

## ✅ Checklist d'Utilisation

### Avant de commencer
- [ ] Docker Compose démarré (`docker-compose up -d`)
- [ ] Migrations Prisma appliquées (`npx prisma migrate dev`)
- [ ] API démarrée (`npm run dev`)

### Test du système
- [ ] Health check fonctionne (`/api/health`)
- [ ] Création patient fonctionne
- [ ] Recherche patient fonctionne
- [ ] Extraction Knowledge Graph fonctionne (MOCK)
- [ ] Flux complet fonctionne

### Vérifications
- [ ] Patient créé dans PostgreSQL
- [ ] Consultation créée avec status DRAFT
- [ ] Nœuds sémantiques stockés
- [ ] Relations créées (si présentes)

---

*Exemples Pratiques - BaseVitale API*
