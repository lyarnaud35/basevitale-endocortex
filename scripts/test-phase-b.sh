#!/bin/bash
# Script de test rapide pour la Phase B

echo "=========================================="
echo "🧪 TEST PHASE B : LE FLUX SANGUIN"
echo "=========================================="
echo ""

# Couleurs pour output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

ERROR_COUNT=0

# Fonction pour tester un service
test_service() {
    local SERVICE_NAME=$1
    local CHECK_COMMAND=$2
    
    echo "🔍 Test: $SERVICE_NAME..."
    if eval "$CHECK_COMMAND" > /dev/null 2>&1; then
        echo -e "${GREEN}✅ $SERVICE_NAME : OK${NC}"
        return 0
    else
        echo -e "${RED}❌ $SERVICE_NAME : ÉCHEC${NC}"
        ERROR_COUNT=$((ERROR_COUNT + 1))
        return 1
    fi
}

# 1. Vérifier Docker
echo "1️⃣  Vérification de l'Infrastructure Docker..."
echo ""

test_service "Postgres" "docker exec basevitale-postgres pg_isready -U basevitale"
test_service "Neo4j" "curl -s -f http://localhost:7474 > /dev/null"
test_service "Redis" "docker exec basevitale-redis redis-cli ping | grep -q PONG"
test_service "AI Cortex" "curl -s -f http://localhost:8000/health > /dev/null"

echo ""

# 2. Vérifier le Backend
echo "2️⃣  Vérification du Backend..."
echo ""

if curl -s -f http://localhost:3000/health > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Backend : Accessible sur port 3000${NC}"
else
    echo -e "${YELLOW}⚠️  Backend : Non accessible (démarrez avec: cd apps/api && npm run start:dev)${NC}"
    ERROR_COUNT=$((ERROR_COUNT + 1))
fi

echo ""

# 3. Vérifier le Frontend
echo "3️⃣  Vérification du Frontend..."
echo ""

if curl -s -f http://localhost:4200 > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Frontend : Accessible sur port 4200${NC}"
else
    echo -e "${YELLOW}⚠️  Frontend : Non accessible (démarrez avec: cd apps/web && npm run dev)${NC}"
    ERROR_COUNT=$((ERROR_COUNT + 1))
fi

echo ""

# 4. Vérifier Neo4j Driver
echo "4️⃣  Vérification du Driver Neo4j..."
echo ""

if [ -f "apps/api/node_modules/neo4j-driver/package.json" ]; then
    echo -e "${GREEN}✅ Neo4j Driver : Installé${NC}"
else
    echo -e "${RED}❌ Neo4j Driver : Non installé${NC}"
    echo -e "${YELLOW}   Installer avec: cd apps/api && npm install neo4j-driver @types/neo4j-driver${NC}"
    ERROR_COUNT=$((ERROR_COUNT + 1))
fi

echo ""

# 5. Vérifier les Drafts dans Postgres
echo "5️⃣  Vérification des Drafts dans Postgres..."
echo ""

DRAFT_COUNT=$(docker exec basevitale-postgres psql -U basevitale -d basevitale_db -t -c \
  "SELECT COUNT(*) FROM consultation_drafts;" 2>/dev/null | tr -d ' ')

if [ -n "$DRAFT_COUNT" ]; then
    echo -e "${GREEN}✅ ConsultationDrafts trouvés : $DRAFT_COUNT${NC}"
else
    echo -e "${YELLOW}⚠️  Impossible de compter les drafts${NC}"
fi

echo ""

# 6. Vérifier les SemanticNodes
echo "6️⃣  Vérification des SemanticNodes dans Postgres..."
echo ""

NODE_COUNT=$(docker exec basevitale-postgres psql -U basevitale -d basevitale_db -t -c \
  "SELECT COUNT(*) FROM semantic_nodes;" 2>/dev/null | tr -d ' ')

if [ -n "$NODE_COUNT" ]; then
    echo -e "${GREEN}✅ SemanticNodes trouvés : $NODE_COUNT${NC}"
else
    echo -e "${YELLOW}⚠️  Impossible de compter les nœuds${NC}"
fi

echo ""

# 7. Vérifier Neo4j (nœuds)
echo "7️⃣  Vérification des Nœuds dans Neo4j..."
echo ""

# Note: Cette requête nécessite une connexion active au driver
echo -e "${YELLOW}⚠️  Vérification Neo4j : À faire manuellement dans Neo4j Browser${NC}"
echo "   Ouvrir: http://localhost:7474"
echo "   Requête: MATCH (n) RETURN count(n) as totalNodes"

echo ""

# Résumé
echo "=========================================="
echo "RÉSUMÉ DES TESTS"
echo "=========================================="
echo ""

if [ $ERROR_COUNT -eq 0 ]; then
    echo -e "${GREEN}✅ TOUS LES TESTS SONT PASSÉS${NC}"
    echo ""
    echo "🚀 Prêt pour tester le flux complet :"
    echo "   1. Ouvrir http://localhost:4200/scribe"
    echo "   2. Simuler une dictée"
    echo "   3. Valider le draft"
    echo "   4. Vérifier dans Neo4j Browser"
    exit 0
else
    echo -e "${RED}❌ $ERROR_COUNT ERREUR(S) DÉTECTÉE(S)${NC}"
    echo ""
    echo "🔧 Actions requises :"
    echo "   - Vérifier que Docker est démarré"
    echo "   - Démarrer le backend : cd apps/api && npm run start:dev"
    echo "   - Démarrer le frontend : cd apps/web && npm run dev"
    echo "   - Installer neo4j-driver si nécessaire"
    exit 1
fi
