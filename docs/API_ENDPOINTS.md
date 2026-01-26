# BaseVitale API - Documentation Complète des Endpoints

## 🎯 Base URL

```
http://localhost:3000/api
```

---

## 📋 Endpoints par Module

### 🏥 Health

#### GET /api/health
Health check simple

**Route publique** : Oui

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

#### GET /api/health/db
Health check avec vérification base de données

**Route publique** : Oui

---

### 🛡️ Module C+ : Identité (Patients)

#### POST /api/identity/patients
Créer un nouveau patient

**Body** :
```json
{
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
}
```

**Réponse** : 201 Created
```json
{
  "success": true,
  "data": {
    "id": "clx...",
    "insToken": "INS123456789",
    "firstName": "Jean",
    ...
  }
}
```

**Erreurs** :
- `409 Conflict` : Patient avec cet INS existe déjà

---

#### GET /api/identity/patients/:id
Obtenir un patient par ID

**Réponse** : 200 OK

---

#### GET /api/identity/patients/by-ins/:insToken
Rechercher un patient par token INS

**Réponse** : 200 OK (ou null si non trouvé)

---

#### GET /api/identity/patients/search
Rechercher des patients

**Query Parameters** :
- `firstName` (optionnel)
- `lastName` (optionnel)
- `birthDate` (optionnel, format ISO)
- `insToken` (optionnel)

**Exemple** :
```
GET /api/identity/patients/search?lastName=Dupont&firstName=Jean
```

**Réponse** : 200 OK (array de patients, max 50)

---

### ✍️ Module S : Scribe (Cortex Sémantique)

#### POST /api/scribe/extract-graph
Extraire un Knowledge Graph depuis un texte

**Body** :
```json
{
  "text": "Le patient présente une fièvre...",
  "patientId": "clx..." // optionnel
}
```

**Réponse** : 200 OK
```json
{
  "success": true,
  "data": {
    "nodes": [...],
    "relations": [...]
  }
}
```

---

#### POST /api/scribe/transcribe-and-extract
Flux complet : Transcription + Extraction + Stockage

**Body** :
```json
{
  "text": "Consultation du patient...",
  "patientId": "clx...",
  "consultationDate": "2024-01-15" // optionnel
}
```

**Réponse** : 201 Created
```json
{
  "success": true,
  "data": {
    "consultation": {
      "id": "...",
      "status": "DRAFT",
      ...
    },
    "knowledgeGraph": {
      "nodes": [...],
      "relations": [...]
    }
  }
}
```

---

### 📊 Module E+ : Facturation

#### POST /api/billing/events
Créer un événement de facturation

**Body** :
```json
{
  "consultationId": "clx...",
  "actType": "CONSULTATION",
  "ghmCode": "02A01",
  "actCode": "ZCQP001",
  "evidence": {
    "nodeIds": ["node_id_1", "node_id_2"],
    "evidenceType": "CONSULTATION_NOTE"
  }
}
```

**Réponse** : 201 Created

**Erreurs** :
- `400 Bad Request` : Preuves cliniques manquantes
- `404 Not Found` : Consultation introuvable

**RÈGLE** : La facturation est bloquée si les preuves cliniques n'existent pas dans le Knowledge Graph.

---

#### POST /api/billing/events/:id/validate
Valider un événement de facturation

**Réponse** : 200 OK
- Change le statut de `PENDING` → `VALIDATED`

**Erreurs** :
- `400 Bad Request` : Statut incompatible ou preuves invalides

---

#### POST /api/billing/events/:id/transmit
Marquer un événement comme transmis

**Réponse** : 200 OK
- Change le statut de `VALIDATED` → `TRANSMITTED`

---

#### GET /api/billing/consultations/:consultationId/events
Lister tous les événements de facturation d'une consultation

**Réponse** : 200 OK (array d'événements)

---

#### GET /api/billing/events/:id
Obtenir un événement de facturation par ID

**Réponse** : 200 OK

---

### 🤖 Module B+ : Codage

#### POST /api/coding/suggest
Suggérer des codes CIM pour une consultation ou un texte

**Body** :
```json
{
  "consultationId": "clx...", // optionnel
  "patientId": "clx...", // optionnel
  "context": "texte libre" // OU
  "context": {
    "nodeIds": ["node_1", "node_2"]
  },
  "minConfidence": 0.5 // optionnel, défaut: 0.4
}
```

**Réponse** : 200 OK
```json
{
  "success": true,
  "data": {
    "suggestions": [
      {
        "code": "G44.2",
        "codeType": "CIM10",
        "label": "Céphalée de tension",
        "confidence": 0.85,
        "missingData": []
      }
    ],
    "warnings": [],
    "recommendedData": []
  }
}
```

---

#### GET /api/coding/consultations/:consultationId
Obtenir les codes CIM suggérés pour une consultation

**Query Parameters** :
- `minConfidence` (optionnel, défaut: 0.4)

**Exemple** :
```
GET /api/coding/consultations/clx123?minConfidence=0.6
```

---

## 📝 Format de Réponse Standard

### Succès
```json
{
  "success": true,
  "data": {...},
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

### Erreur
```json
{
  "success": false,
  "error": "Message d'erreur",
  "statusCode": 400,
  "timestamp": "2024-01-15T10:30:00.000Z",
  "path": "/api/endpoint",
  "details": {...} // optionnel
}
```

---

## 🔐 Authentification

Tous les endpoints (sauf `/health`) nécessitent une authentification.

**Mode développement** : Authentification permissive (utilisateur système)

**Mode production** : JWT Bearer token requis

```
Authorization: Bearer <token>
```

---

## ✅ Validation

Toutes les entrées sont validées automatiquement avec Zod :
- Erreurs de validation : `400 Bad Request`
- Messages d'erreur détaillés avec chemins

---

*Documentation API - BaseVitale Version Cabinet*
