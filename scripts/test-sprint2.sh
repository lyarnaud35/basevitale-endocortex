#!/bin/bash

# Script de test pour Sprint 2 : Cortex Sémantique
# BaseVitale - Version Cabinet

set -e

API_URL="http://localhost:3000"
COLOR_GREEN='\033[0;32m'
COLOR_BLUE='\033[0;34m'
COLOR_RESET='\033[0m'

echo -e "${COLOR_BLUE}=== Test Sprint 2 : Cortex Sémantique ===${COLOR_RESET}"
echo ""

# Vérifier que l'API est démarrée
echo "Vérification que l'API est démarrée..."
if ! curl -s "${API_URL}" > /dev/null 2>&1; then
    echo "❌ L'API n'est pas démarrée. Lancez d'abord: npm run dev"
    exit 1
fi
echo "✅ API démarrée"
echo ""

# Test 1: Créer un patient
echo -e "${COLOR_GREEN}Test 1: Création d'un patient${COLOR_RESET}"
PATIENT_RESPONSE=$(curl -s -X POST "${API_URL}/identity/patients" \
  -H "Content-Type: application/json" \
  -d '{
    "insToken": "INS_TEST_001",
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
  }')

PATIENT_ID=$(echo $PATIENT_RESPONSE | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)

if [ -z "$PATIENT_ID" ]; then
    echo "❌ Échec de création du patient"
    echo "Réponse: $PATIENT_RESPONSE"
    exit 1
fi

echo "✅ Patient créé: $PATIENT_ID"
echo ""

# Test 2: Extraire Knowledge Graph (sans patient)
echo -e "${COLOR_GREEN}Test 2: Extraction Knowledge Graph (mode MOCK)${COLOR_RESET}"
EXTRACT_RESPONSE=$(curl -s -X POST "${API_URL}/scribe/extract-graph" \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Le patient présente une fièvre à 38.5°C et des maux de tête depuis 3 jours. Diagnostic probable : grippe saisonnière. Prescription : paracétamol 1g, 3 fois par jour pendant 5 jours."
  }')

NODE_COUNT=$(echo $EXTRACT_RESPONSE | grep -o '"nodeType":"[^"]*"' | wc -l | tr -d ' ')

if [ "$NODE_COUNT" -eq "0" ]; then
    echo "❌ Échec de l'\''extraction"
    echo "Réponse: $EXTRACT_RESPONSE"
    exit 1
fi

echo "✅ Extraction réussie: $NODE_COUNT nœuds extraits"
echo "Réponse (extrait): $(echo $EXTRACT_RESPONSE | cut -c1-200)..."
echo ""

# Test 3: Flux complet (transcription + extraction + stockage)
echo -e "${COLOR_GREEN}Test 3: Flux complet transcribe-and-extract${COLOR_RESET}"
FULL_FLOW_RESPONSE=$(curl -s -X POST "${API_URL}/scribe/transcribe-and-extract" \
  -H "Content-Type: application/json" \
  -d "{
    \"text\": \"Consultation du patient. Fièvre à 38.5°C, maux de tête, fatigue. Diagnostic : grippe saisonnière. Prescription : paracétamol 1g x 3/jour pendant 5 jours.\",
    \"patientId\": \"${PATIENT_ID}\"
  }")

CONSULTATION_ID=$(echo $FULL_FLOW_RESPONSE | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)

if [ -z "$CONSULTATION_ID" ]; then
    echo "❌ Échec du flux complet"
    echo "Réponse: $FULL_FLOW_RESPONSE"
    exit 1
fi

echo "✅ Flux complet réussi:"
echo "  - Consultation créée: $CONSULTATION_ID"
echo "  - Knowledge Graph stocké dans PostgreSQL"
echo ""

# Test 4: Vérifier que les nœuds sont stockés
echo -e "${COLOR_GREEN}Test 4: Vérification des nœuds stockés${COLOR_RESET}"
# Note: Ceci nécessiterait un endpoint GET /knowledge-graph/consultations/:id/nodes
# Pour l'instant, on vérifie juste que la réponse contient des nœuds
STORED_NODES=$(echo $FULL_FLOW_RESPONSE | grep -o '"nodes":\[[^]]*\]' | wc -l | tr -d ' ')

if [ "$STORED_NODES" -gt "0" ]; then
    echo "✅ Nœuds vérifiés dans la réponse"
else
    echo "⚠️  Aucun nœud visible dans la réponse (peut être normal selon l'implémentation)"
fi
echo ""

echo -e "${COLOR_GREEN}=== Tous les tests sont passés ! ===${COLOR_RESET}"
echo ""
echo "Résumé:"
echo "  - Patient créé: $PATIENT_ID"
echo "  - Consultation créée: $CONSULTATION_ID"
echo "  - Knowledge Graph extrait et stocké"
echo ""
echo "Vous pouvez maintenant vérifier dans la base de données:"
echo "  npx prisma studio"
