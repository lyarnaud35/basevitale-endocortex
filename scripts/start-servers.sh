#!/bin/bash

# Script de démarrage simple pour BaseVitale
# Démarre Backend API (port 3000) et Frontend Web (port 4200)

echo "=========================================="
echo "🚀 DÉMARRAGE DES SERVEURS BASEVITALE"
echo "=========================================="
echo ""

# Couleurs
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Vérifier que nous sommes à la racine
if [ ! -f "package.json" ]; then
    echo -e "${RED}❌ Erreur : Exécutez ce script depuis la racine du projet${NC}"
    exit 1
fi

# Vérifier que node_modules existe
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}📦 Installation des dépendances...${NC}"
    npm install
fi

echo -e "${BLUE}📡 Démarrage du Backend API (port 3000)...${NC}"
echo ""

# Démarrer le backend en arrière-plan
npm run dev:api &
BACKEND_PID=$!

# Attendre 5 secondes pour que le backend démarre
sleep 5

echo ""
echo -e "${BLUE}🌐 Démarrage du Frontend Web (port 4200)...${NC}"
echo ""

# Démarrer le frontend en arrière-plan
npm run dev:web &
FRONTEND_PID=$!

# Attendre un peu
sleep 3

echo ""
echo "=========================================="
echo -e "${GREEN}✅ SERVEURS DÉMARRÉS${NC}"
echo "=========================================="
echo ""
echo -e "📡 ${GREEN}Backend API:${NC}   http://localhost:3000/api"
echo -e "🌐 ${GREEN}Frontend Web:${NC}  http://localhost:4200"
echo -e "🧪 ${GREEN}Page Test:${NC}     http://localhost:4200/scribe/test"
echo -e "🏥 ${GREEN}Health Check:${NC}  http://localhost:3000/api/health"
echo ""
echo -e "${YELLOW}⚠️  Les serveurs tournent en arrière-plan${NC}"
echo -e "${YELLOW}   PID Backend: $BACKEND_PID${NC}"
echo -e "${YELLOW}   PID Frontend: $FRONTEND_PID${NC}"
echo ""
echo -e "Pour arrêter :"
echo "   kill $BACKEND_PID $FRONTEND_PID"
echo ""
echo "Ou utilisez Ctrl+C dans les terminaux où vous avez lancé les serveurs"
echo ""
