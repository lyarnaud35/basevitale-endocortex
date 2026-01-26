# Workflow Complet - BaseVitale

## 🔄 Flux de Données End-to-End

### Scénario : Consultation Complète d'un Patient

Ce guide montre comment tous les modules fonctionnent ensemble dans un workflow complet.

---

## 📋 Workflow : Consultation → Facturation → Codage

### Étape 1 : Créer un Patient (Module C+)

```bash
curl -X POST http://localhost:3000/api/identity/patients \
  -H "Content-Type: application/json" \
  -d '{
    "insToken": "INS_PATIENT_001",
    "firstName": "Marie",
    "lastName": "Martin",
    "birthDate": "1985-03-15",
    "email": "marie.martin@example.com"
  }'
```

**Résultat** : Patient créé avec ID unique

---

### Étape 2 : Traiter une Consultation (Module S)

Le médecin dicte ou saisit une consultation :

```bash
curl -X POST http://localhost:3000/api/scribe/transcribe-and-extract \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Consultation de suivi. Patient se plaint de maux de tête persistants depuis 5 jours. Tension artérielle mesurée : 140/90 mmHg. Diagnostic : céphalée de tension. Prescription : paracétamol 1g si douleur, repos conseillé.",
    "patientId": "ID_PATIENT_CRÉÉ"
  }'
```

**Ce qui se passe** :
1. ✅ Le texte est analysé par l'IA (MOCK/CLOUD/LOCAL)
2. ✅ Un Knowledge Graph est extrait (nœuds + relations)
3. ✅ Une Consultation est créée (status: DRAFT)
4. ✅ Le Knowledge Graph est stocké dans PostgreSQL

**Résultat** :
```json
{
  "success": true,
  "data": {
    "consultation": {
      "id": "consultation_123",
      "patientId": "...",
      "status": "DRAFT"
    },
    "knowledgeGraph": {
      "nodes": [
        {
          "id": "node_1",
          "nodeType": "SYMPTOM",
          "label": "Maux de tête",
          "confidence": 0.95
        },
        {
          "id": "node_2",
          "nodeType": "CONSTANT",
          "label": "Tension artérielle",
          "value": {"systolic": 140, "diastolic": 90}
        },
        {
          "id": "node_3",
          "nodeType": "DIAGNOSIS",
          "label": "Céphalée de tension",
          "cim10Code": "G44.2",
          "confidence": 0.85
        },
        {
          "id": "node_4",
          "nodeType": "MEDICATION",
          "label": "Paracétamol"
        }
      ],
      "relations": [...]
    }
  }
}
```

---

### Étape 3 : Obtenir les Codes CIM (Module B+)

Le système suggère automatiquement des codes :

```bash
curl http://localhost:3000/api/coding/consultations/consultation_123?minConfidence=0.6
```

**Résultat** :
```json
{
  "success": true,
  "data": {
    "suggestions": [
      {
        "code": "G44.2",
        "codeType": "CIM10",
        "label": "Céphalée de tension",
        "confidence": 0.85
      }
    ],
    "warnings": [],
    "recommendedData": []
  }
}
```

---

### Étape 4 : Valider la Consultation

Le médecin valide la consultation. Le statut passe à VALIDATED et les nœuds sont synchronisés vers Neo4j.

```typescript
// Dans le service (à implémenter)
await consultationService.validate(consultationId);
// → Status: DRAFT → VALIDATED
// → Écriture Neo4j (transaction synchrone)
```

---

### Étape 5 : Facturer (Module E+)

**AVANT** : Le système vérifie automatiquement les preuves cliniques.

```bash
curl -X POST http://localhost:3000/api/billing/events \
  -H "Content-Type: application/json" \
  -d '{
    "consultationId": "consultation_123",
    "actType": "CONSULTATION",
    "ghmCode": "02A01",
    "evidence": {
      "nodeIds": ["node_1", "node_2", "node_3"],
      "evidenceType": "CONSULTATION_NOTE"
    }
  }'
```

**Ce qui se passe** :
1. ✅ `BillingValidationService` vérifie que les nœuds existent
2. ✅ Vérifie que les nœuds appartiennent à la consultation
3. ✅ Valide le type de preuve selon les règles métier
4. ✅ Si tout est OK → Création de l'événement (status: PENDING)
5. ✅ Sinon → Erreur 400 avec détails

**Résultat si succès** :
```json
{
  "success": true,
  "data": {
    "id": "billing_event_123",
    "consultationId": "consultation_123",
    "status": "PENDING",
    "ghmCode": "02A01",
    "evidence": {...}
  }
}
```

**Résultat si échec** :
```json
{
  "success": false,
  "error": "Impossible de créer l'événement de facturation",
  "statusCode": 400,
  "details": {
    "reason": "Preuves cliniques manquantes dans le Knowledge Graph: 1 nœud(s) introuvable(s)",
    "missingEvidence": ["node_inexistant"]
  }
}
```

---

### Étape 6 : Valider la Facturation

```bash
curl -X POST http://localhost:3000/api/billing/events/billing_event_123/validate
```

**Ce qui se passe** :
1. ✅ Vérification à nouveau des preuves (elles peuvent avoir changé)
2. ✅ Si OK → Status: PENDING → VALIDATED
3. ✅ Sinon → Erreur

---

### Étape 7 : Transmettre (Télétransmission)

```bash
curl -X POST http://localhost:3000/api/billing/events/billing_event_123/transmit
```

**Ce qui se passe** :
1. ✅ Status: VALIDATED → TRANSMITTED
2. ✅ Timestamp de transmission enregistré
3. ✅ Prêt pour télétransmission à l'Assurance Maladie

---

## 🎯 Points Clés du Workflow

### Sécurité par Construction

1. **INS Unique** : Un patient = Un token unique (Module C+)
2. **Pas de Texte Mort** : Tout est transformé en nœuds sémantiques (Module S)
3. **Pas de Preuve = Pas de Facture** : Vérification automatique (Module E+)
4. **Confiance Calibrée** : Codes avec scores de confiance (Module B+)

### Automatisation

- ✅ Extraction automatique depuis texte
- ✅ Codage automatique depuis Knowledge Graph
- ✅ Validation automatique des preuves
- ✅ Workflow guidé

---

## 🔍 Exemple Complet en Script

```bash
#!/bin/bash

# 1. Créer patient
PATIENT=$(curl -s -X POST http://localhost:3000/api/identity/patients \
  -H "Content-Type: application/json" \
  -d '{
    "insToken": "INS_TEST_001",
    "firstName": "Test",
    "lastName": "Patient",
    "birthDate": "1990-01-01"
  }')

PATIENT_ID=$(echo $PATIENT | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)

# 2. Traiter consultation
CONSULTATION=$(curl -s -X POST http://localhost:3000/api/scribe/transcribe-and-extract \
  -H "Content-Type: application/json" \
  -d "{
    \"text\": \"Consultation. Diagnostic : grippe. Prescription : paracétamol.\",
    \"patientId\": \"$PATIENT_ID\"
  }")

CONSULTATION_ID=$(echo $CONSULTATION | grep -o '"consultation".*"id":"[^"]*"' | grep -o '"id":"[^"]*"' | cut -d'"' -f4)
NODE_IDS=$(echo $CONSULTATION | grep -o '"nodes":\[.*\]' | grep -o '"id":"[^"]*"' | cut -d'"' -f4 | head -3 | sed 's/^/"/;s/$/"/' | tr '\n' ',' | sed 's/,$//')

# 3. Obtenir codes CIM
curl -s http://localhost:3000/api/coding/consultations/$CONSULTATION_ID

# 4. Facturer
curl -s -X POST http://localhost:3000/api/billing/events \
  -H "Content-Type: application/json" \
  -d "{
    \"consultationId\": \"$CONSULTATION_ID\",
    \"actType\": \"CONSULTATION\",
    \"evidence\": {
      \"nodeIds\": [$NODE_IDS],
      \"evidenceType\": \"CONSULTATION_NOTE\"
    }
  }"
```

---

## ✅ Avantages du Workflow

1. **Automatique** : Pas de saisie manuelle redondante
2. **Sécurisé** : Validation à chaque étape
3. **Traçable** : Chaque action est enregistrée
4. **Cohérent** : Pas de contradictions possibles
5. **Efficace** : Workflow fluide pour le médecin

---

*Workflow Complet - Tous les modules intégrés*
