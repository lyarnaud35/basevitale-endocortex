#!/bin/bash
# Script de test pour la Phase C : Intelligence Réelle

echo "=========================================="
echo "🧪 TEST PHASE C : L'INTELLIGENCE RÉELLE"
echo "=========================================="
echo ""

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# 1. Vérifier Python Sidecar
echo "1️⃣  Vérification du Python Sidecar..."
if curl -s -f http://localhost:8000/health > /dev/null 2>&1; then
    echo -e "${GREEN}✅ AI Cortex accessible${NC}"
else
    echo -e "${RED}❌ AI Cortex non accessible${NC}"
    echo "   Vérifiez: docker compose ps | grep ai-cortex"
    exit 1
fi
echo ""

# 2. Vérifier Redis
echo "2️⃣  Vérification de Redis..."
if docker exec basevitale-redis redis-cli ping > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Redis accessible${NC}"
else
    echo -e "${RED}❌ Redis non accessible${NC}"
    exit 1
fi
echo ""

# 3. Test Python Sidecar avec instructor
echo "3️⃣  Test du Sidecar Python (instructor)..."
RESPONSE=$(curl -s -X POST http://localhost:8000/structure \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Patient présente fièvre modérée",
    "json_schema": {
      "type": "object",
      "properties": {
        "patientId": {"type": "string"},
        "transcript": {"type": "string"},
        "symptoms": {"type": "array", "items": {"type": "string"}},
        "diagnosis": {"type": "array"},
        "medications": {"type": "array"}
      },
      "required": ["patientId", "transcript", "symptoms", "diagnosis"]
    }
  }' 2>/dev/null)

if echo "$RESPONSE" | grep -q '"data"'; then
    echo -e "${GREEN}✅ Python Sidecar répond avec données structurées${NC}"
    echo "   Réponse: $(echo "$RESPONSE" | head -c 200)..."
else
    echo -e "${YELLOW}⚠️  Réponse Python Sidecar: ${RESPONSE}${NC}"
fi
echo ""

# 4. Instructions
echo "=========================================="
echo "📋 PROCHAINES ÉTAPES"
echo "=========================================="
echo ""
echo "1. Modifier .env :"
echo "   ${GREEN}AI_MODE=LOCAL${NC}"
echo "   ${GREEN}USE_REDIS_QUEUE=true${NC}"
echo ""
echo "2. Redémarrer le backend :"
echo "   ${GREEN}cd apps/api && npm run start:dev${NC}"
echo ""
echo "3. Tester depuis Frontend :"
echo "   ${GREEN}http://localhost:4200/scribe${NC}"
echo ""
echo "4. Vérifier les logs backend :"
echo "   - ${YELLOW}Job X added to queue${NC}"
echo "   - ${YELLOW}Job X completed successfully${NC}"
echo ""
