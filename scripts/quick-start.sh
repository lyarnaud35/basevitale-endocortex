#!/bin/bash
# Script de démarrage ultra-rapide pour BaseVitale

echo "=========================================="
echo "⚡ BASEVITALE - QUICK START"
echo "=========================================="
echo ""

# Couleurs
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# 1. Infrastructure
echo -e "${BLUE}1️⃣  Infrastructure Docker...${NC}"
docker compose up -d > /dev/null 2>&1
echo -e "${GREEN}✅ Containers démarrés${NC}"
echo "   Attente 15 secondes pour initialisation..."
sleep 15
echo ""

# 2. Instructions
echo -e "${BLUE}2️⃣  Prochaines Étapes${NC}"
echo ""
echo "Terminal 1 - Backend:"
echo -e "  ${GREEN}cd apps/api && npm run start:dev${NC}"
echo ""
echo "Terminal 2 - Frontend:"
echo -e "  ${GREEN}cd apps/web && PORT=4200 npm run dev${NC}"
echo ""
echo -e "${YELLOW}🌐 URLs :${NC}"
echo "  - Frontend:     http://localhost:4200/scribe"
echo "  - Backend:      http://localhost:3000/api"
echo "  - Neo4j:        http://localhost:7474"
echo ""
echo -e "${GREEN}✅ Prêt !${NC}"
