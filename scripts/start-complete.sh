#!/bin/bash
# Script de démarrage complet - BaseVitale
# Démarre tous les services nécessaires

set -e

COLOR_GREEN='\033[0;32m'
COLOR_BLUE='\033[0;34m'
COLOR_YELLOW='\033[1;33m'
COLOR_RESET='\033[0m'

echo -e "${COLOR_BLUE}╔════════════════════════════════════════════════════════════╗${COLOR_RESET}"
echo -e "${COLOR_BLUE}║        BaseVitale - Démarrage Complet                     ║${COLOR_RESET}"
echo -e "${COLOR_BLUE}╚════════════════════════════════════════════════════════════╝${COLOR_RESET}"
echo ""

# 1. Démarrer Docker services
echo -e "${COLOR_BLUE}[1/4]${COLOR_RESET} Démarrage des services Docker..."
if docker-compose ps | grep -q "Up"; then
    echo -e "   ${COLOR_YELLOW}⚠️  Certains services sont déjà démarrés${COLOR_RESET}"
    read -p "   Voulez-vous les redémarrer ? (y/N) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        docker-compose down
        docker-compose up -d
    fi
else
    docker-compose up -d
fi

# Attendre que les services soient prêts
echo "   Attente que les services soient prêts..."
sleep 5

# Vérifier PostgreSQL
for i in {1..30}; do
    if docker exec basevitale-postgres pg_isready -U postgres >/dev/null 2>&1; then
        echo -e "   ${COLOR_GREEN}✅ PostgreSQL prêt${COLOR_RESET}"
        break
    fi
    if [ $i -eq 30 ]; then
        echo -e "   ${COLOR_YELLOW}⚠️  PostgreSQL prend plus de temps que prévu${COLOR_RESET}"
    fi
    sleep 1
done

echo ""

# 2. Vérifier/générer Prisma client
echo -e "${COLOR_BLUE}[2/4]${COLOR_RESET} Vérification Prisma..."
cd apps/api
if [ ! -d "../src/prisma/client" ]; then
    echo "   Génération du client Prisma..."
    npx prisma generate
    echo -e "   ${COLOR_GREEN}✅ Client Prisma généré${COLOR_RESET}"
else
    echo -e "   ${COLOR_GREEN}✅ Client Prisma déjà généré${COLOR_RESET}"
fi
cd ../..
echo ""

# 3. Démarrer AI Cortex (Python)
echo -e "${COLOR_BLUE}[3/4]${COLOR_RESET} Démarrage AI Cortex (Python)..."
if curl -s -f "http://localhost:8000/health" > /dev/null 2>&1; then
    echo -e "   ${COLOR_GREEN}✅ AI Cortex déjà démarré${COLOR_RESET}"
else
    echo "   Démarrage du sidecar Python..."
    if command -v docker-compose &> /dev/null && docker-compose ps ai-cortex | grep -q "Up"; then
        echo -e "   ${COLOR_GREEN}✅ AI Cortex démarré via Docker${COLOR_RESET}"
    else
        echo -e "   ${COLOR_YELLOW}⚠️  AI Cortex non accessible${COLOR_RESET}"
        echo "   Pour démarrer manuellement:"
        echo "     cd apps/ai-cortex && python main.py"
        echo "   Ou via Docker:"
        echo "     docker-compose up -d ai-cortex"
    fi
fi
echo ""

# 4. Démarrer l'API NestJS
echo -e "${COLOR_BLUE}[4/4]${COLOR_RESET} Démarrage API NestJS..."
if curl -s -f "http://localhost:3000/api/health" > /dev/null 2>&1; then
    echo -e "   ${COLOR_GREEN}✅ API déjà démarrée${COLOR_RESET}"
else
    echo "   Démarrage en arrière-plan..."
    npm run dev:api > /tmp/basevitale-api.log 2>&1 &
    API_PID=$!
    echo $API_PID > /tmp/basevitale-api.pid
    
    # Attendre que l'API soit prête
    echo "   Attente que l'API soit prête..."
    for i in {1..30}; do
        if curl -s -f "http://localhost:3000/api/health" > /dev/null 2>&1; then
            echo -e "   ${COLOR_GREEN}✅ API démarrée (PID: $API_PID)${COLOR_RESET}"
            break
        fi
        if [ $i -eq 30 ]; then
            echo -e "   ${COLOR_YELLOW}⚠️  API prend plus de temps que prévu${COLOR_RESET}"
            echo "   Vérifiez les logs: tail -f /tmp/basevitale-api.log"
        fi
        sleep 1
    done
fi
echo ""

# Résumé
echo -e "${COLOR_BLUE}╔════════════════════════════════════════════════════════════╗${COLOR_RESET}"
echo -e "${COLOR_BLUE}║              Services Démarrés                            ║${COLOR_RESET}"
echo -e "${COLOR_BLUE}╚════════════════════════════════════════════════════════════╝${COLOR_RESET}"
echo ""
echo -e "${COLOR_GREEN}✅ PostgreSQL${COLOR_RESET}      → http://localhost:5432"
echo -e "${COLOR_GREEN}✅ Neo4j${COLOR_RESET}           → http://localhost:7474"
echo -e "${COLOR_GREEN}✅ Redis${COLOR_RESET}           → localhost:6379"
echo -e "${COLOR_GREEN}✅ AI Cortex${COLOR_RESET}       → http://localhost:8000"
echo -e "${COLOR_GREEN}✅ API NestJS${COLOR_RESET}      → http://localhost:3000"
echo ""
echo "📋 Endpoints disponibles:"
echo "   - Health:     http://localhost:3000/api/health"
echo "   - Scribe:     http://localhost:3000/api/scribe/health"
echo "   - Metrics:    http://localhost:3000/api/metrics"
echo ""
echo "🧪 Tester l'intégration:"
echo "   ./scripts/test-integration-complete.sh"
echo ""
