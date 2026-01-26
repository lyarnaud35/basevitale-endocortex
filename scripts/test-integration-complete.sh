#!/bin/bash
# Script de test d'intégration complète - BaseVitale
# Teste le flux complet : Front → NestJS → Python → Postgres → Neo4j

set -e

API_URL="http://localhost:3000"
PYTHON_URL="http://localhost:8000"
COLOR_GREEN='\033[0;32m'
COLOR_BLUE='\033[0;34m'
COLOR_YELLOW='\033[1;33m'
COLOR_RED='\033[0;31m'
COLOR_RESET='\033[0m'

PASSED=0
FAILED=0

print_test() {
    echo -e "${COLOR_BLUE}[TEST]${COLOR_RESET} $1"
}

print_pass() {
    echo -e "${COLOR_GREEN}✅ PASS${COLOR_RESET}: $1"
    ((PASSED++))
}

print_fail() {
    echo -e "${COLOR_RED}❌ FAIL${COLOR_RESET}: $1"
    ((FAILED++))
}

print_warn() {
    echo -e "${COLOR_YELLOW}⚠️  WARN${COLOR_RESET}: $1"
}

echo -e "${COLOR_BLUE}╔════════════════════════════════════════════════════════════╗${COLOR_RESET}"
echo -e "${COLOR_BLUE}║   BaseVitale - Test d'Intégration Complète                ║${COLOR_RESET}"
echo -e "${COLOR_BLUE}╚════════════════════════════════════════════════════════════╝${COLOR_RESET}"
echo ""

# 1. Vérifier que les services sont démarrés
print_test "Vérification des services..."
if curl -s -f "${API_URL}/api/health" > /dev/null 2>&1; then
    print_pass "API NestJS démarrée"
else
    print_fail "API NestJS non accessible"
    echo "   Lancez: npm run dev:api"
    exit 1
fi

if curl -s -f "${PYTHON_URL}/health" > /dev/null 2>&1; then
    print_pass "AI Cortex (Python) démarré"
else
    print_warn "AI Cortex non accessible - Mode MOCK sera utilisé"
    PYTHON_AVAILABLE=false
fi

echo ""

# 2. Test Health Check
print_test "Test Health Check API"
HEALTH_RESPONSE=$(curl -s "${API_URL}/api/health")
if echo "$HEALTH_RESPONSE" | grep -q '"status":"ok"'; then
    print_pass "Health check API"
else
    print_fail "Health check API"
fi

# 3. Test Health Check Python
if [ "$PYTHON_AVAILABLE" != "false" ]; then
    print_test "Test Health Check Python"
    PYTHON_HEALTH=$(curl -s "${PYTHON_URL}/health")
    if echo "$PYTHON_HEALTH" | grep -q '"status":"ok"'; then
        print_pass "Health check Python"
    else
        print_fail "Health check Python"
    fi
fi

echo ""

# 4. Test Mode MOCK
print_test "Test Mode MOCK - Création ConsultationDraft"
MOCK_RESPONSE=$(curl -s -X POST "${API_URL}/api/scribe/analyze" \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Patient tousse, fièvre 39"
  }')

if echo "$MOCK_RESPONSE" | grep -q '"symptoms"'; then
    MOCK_PATIENT_ID=$(echo "$MOCK_RESPONSE" | grep -o '"patientId":"[^"]*"' | head -1 | cut -d'"' -f4)
    print_pass "Mode MOCK - Consultation générée (patientId: $MOCK_PATIENT_ID)"
else
    print_fail "Mode MOCK - Consultation non générée"
    echo "   Réponse: $MOCK_RESPONSE"
fi

echo ""

# 5. Test Process Dictation
print_test "Test POST /scribe/process-dictation"
PROCESS_RESPONSE=$(curl -s -X POST "${API_URL}/api/scribe/process-dictation" \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Patient tousse depuis 3 jours, fièvre à 39°C, douleur à la gorge",
    "patientId": "patient_test_integration"
  }')

DRAFT_ID=$(echo "$PROCESS_RESPONSE" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)

if [ -n "$DRAFT_ID" ]; then
    print_pass "Process Dictation - Draft créé (ID: $DRAFT_ID)"
else
    print_fail "Process Dictation - Draft non créé"
    echo "   Réponse: $PROCESS_RESPONSE"
fi

echo ""

# 6. Test Get Draft
if [ -n "$DRAFT_ID" ]; then
    print_test "Test GET /scribe/draft/:id"
    GET_DRAFT_RESPONSE=$(curl -s "${API_URL}/api/scribe/draft/${DRAFT_ID}")
    
    if echo "$GET_DRAFT_RESPONSE" | grep -q '"success":true'; then
        print_pass "Get Draft - Draft récupéré"
    else
        print_fail "Get Draft - Échec"
    fi
fi

echo ""

# 7. Test Validate Draft
if [ -n "$DRAFT_ID" ]; then
    print_test "Test PUT /scribe/validate/:id"
    VALIDATE_RESPONSE=$(curl -s -X PUT "${API_URL}/api/scribe/validate/${DRAFT_ID}" \
      -H "Content-Type: application/json")
    
    if echo "$VALIDATE_RESPONSE" | grep -q '"status":"VALIDATED"'; then
        NODES_CREATED=$(echo "$VALIDATE_RESPONSE" | grep -o '"nodesCreated":[0-9]*' | grep -o '[0-9]*')
        print_pass "Validate Draft - Validé (${NODES_CREATED} nœuds créés)"
    else
        print_fail "Validate Draft - Échec"
        echo "   Réponse: $VALIDATE_RESPONSE"
    fi
fi

echo ""

# 8. Test Mode LOCAL (si Python disponible)
if [ "$PYTHON_AVAILABLE" != "false" ]; then
    print_test "Test Mode LOCAL - Appel Python Sidecar"
    
    # Définir AI_MODE=LOCAL temporairement (via variable d'env dans la requête si supporté)
    # Pour ce test, on suppose que AI_MODE est déjà configuré à LOCAL
    print_warn "Pour tester LOCAL, configurez AI_MODE=LOCAL dans .env"
    
    # Test direct du sidecar Python
    PYTHON_TEST_RESPONSE=$(curl -s -X POST "${PYTHON_URL}/process-generic" \
      -H "Content-Type: application/json" \
      -d '{
        "text": "Patient avec fièvre et toux",
        "schema": {
          "type": "object",
          "properties": {
            "symptoms": {
              "type": "array",
              "items": {"type": "string"}
            }
          },
          "required": ["symptoms"]
        }
      }')
    
    if echo "$PYTHON_TEST_RESPONSE" | grep -q '"data"'; then
        print_pass "Python Sidecar - Appel direct réussi"
    else
        print_fail "Python Sidecar - Appel direct échoué"
        echo "   Réponse: $PYTHON_TEST_RESPONSE"
    fi
fi

echo ""

# 9. Test Scribe Health
print_test "Test GET /scribe/health"
SCRIBE_HEALTH=$(curl -s "${API_URL}/api/scribe/health")
if echo "$SCRIBE_HEALTH" | grep -q '"status"'; then
    print_pass "Scribe Health Check"
else
    print_fail "Scribe Health Check"
fi

# 10. Test Scribe Stats
print_test "Test GET /scribe/stats"
SCRIBE_STATS=$(curl -s "${API_URL}/api/scribe/stats")
if echo "$SCRIBE_STATS" | grep -q '"totalDrafts"'; then
    print_pass "Scribe Stats"
else
    print_fail "Scribe Stats"
fi

echo ""

# Résumé
echo -e "${COLOR_BLUE}╔════════════════════════════════════════════════════════════╗${COLOR_RESET}"
echo -e "${COLOR_BLUE}║                    RÉSUMÉ DES TESTS                       ║${COLOR_RESET}"
echo -e "${COLOR_BLUE}╚════════════════════════════════════════════════════════════╝${COLOR_RESET}"
echo ""
echo -e "Tests réussis: ${COLOR_GREEN}${PASSED}${COLOR_RESET}"
echo -e "Tests échoués: ${COLOR_RED}${FAILED}${COLOR_RESET}"
echo ""

echo ""
print_test "Autres tests utiles"
echo "   Tracer Bullet (MOCK) : npm run test:tracer-bullet"
echo "   Phase C (LOCAL)      : npm run test:phase-c (AI_MODE=LOCAL + Cortex up)"
echo "   E2E (API+Prisma)     : npm run test:e2e (Postgres + Redis requis)"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${COLOR_GREEN}✅ Tous les tests d'intégration sont passés !${COLOR_RESET}"
    exit 0
else
    echo -e "${COLOR_RED}❌ Certains tests ont échoué${COLOR_RESET}"
    exit 1
fi
