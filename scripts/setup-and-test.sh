#!/bin/bash

# Script de setup et test complet pour BaseVitale
# Version Cabinet - Sprint 1 & 2

set -e

COLOR_GREEN='\033[0;32m'
COLOR_BLUE='\033[0;34m'
COLOR_YELLOW='\033[1;33m'
COLOR_RED='\033[0;31m'
COLOR_RESET='\033[0m'

echo -e "${COLOR_BLUE}=== BaseVitale - Setup & Test ===${COLOR_RESET}"
echo ""

# Vérifier les prérequis
echo "Vérification des prérequis..."
command -v docker >/dev/null 2>&1 || { echo -e "${COLOR_RED}❌ Docker n'est pas installé${COLOR_RESET}"; exit 1; }
command -v docker-compose >/dev/null 2>&1 || { echo -e "${COLOR_RED}❌ Docker Compose n'est pas installé${COLOR_RESET}"; exit 1; }
command -v npm >/dev/null 2>&1 || { echo -e "${COLOR_RED}❌ npm n'est pas installé${COLOR_RESET}"; exit 1; }
command -v npx >/dev/null 2>&1 || { echo -e "${COLOR_RED}❌ npx n'est pas installé${COLOR_RESET}"; exit 1; }
echo -e "${COLOR_GREEN}✅ Prérequis OK${COLOR_RESET}"
echo ""

# Démarrer Docker
echo -e "${COLOR_BLUE}Démarrage des services Docker...${COLOR_RESET}"
docker-compose up -d
echo -e "${COLOR_GREEN}✅ Services Docker démarrés${COLOR_RESET}"
echo ""

# Attendre que PostgreSQL soit prêt
echo "Attente que PostgreSQL soit prêt..."
sleep 5
for i in {1..30}; do
    if docker exec basevitale-postgres pg_isready -U postgres >/dev/null 2>&1; then
        echo -e "${COLOR_GREEN}✅ PostgreSQL prêt${COLOR_RESET}"
        break
    fi
    if [ $i -eq 30 ]; then
        echo -e "${COLOR_RED}❌ Timeout: PostgreSQL n'est pas prêt${COLOR_RESET}"
        exit 1
    fi
    sleep 1
done
echo ""

# Installer les dépendances (si nécessaire)
if [ ! -d "node_modules" ]; then
    echo -e "${COLOR_BLUE}Installation des dépendances npm...${COLOR_RESET}"
    npm install
    echo -e "${COLOR_GREEN}✅ Dépendances installées${COLOR_RESET}"
    echo ""
fi

# Générer le client Prisma
echo -e "${COLOR_BLUE}Génération du client Prisma...${COLOR_RESET}"
npx prisma generate
echo -e "${COLOR_GREEN}✅ Client Prisma généré${COLOR_RESET}"
echo ""

# Créer les migrations
echo -e "${COLOR_BLUE}Création des migrations...${COLOR_RESET}"
npx prisma migrate dev --name init_sprint1_foundation || {
    echo -e "${COLOR_YELLOW}⚠️  Les migrations existent peut-être déjà. Continue...${COLOR_RESET}"
}
echo -e "${COLOR_GREEN}✅ Migrations appliquées${COLOR_RESET}"
echo ""

# Vérifier que l'extension pgvector est active
echo -e "${COLOR_BLUE}Vérification de l'extension pgvector...${COLOR_RESET}"
PGVECTOR_CHECK=$(docker exec basevitale-postgres psql -U postgres -d basevitale -tAc "SELECT 1 FROM pg_extension WHERE extname='vector'" 2>/dev/null || echo "0")
if [ "$PGVECTOR_CHECK" = "1" ]; then
    echo -e "${COLOR_GREEN}✅ Extension pgvector active${COLOR_RESET}"
else
    echo -e "${COLOR_YELLOW}⚠️  Extension pgvector non trouvée, création...${COLOR_RESET}"
    docker exec basevitale-postgres psql -U postgres -d basevitale -c "CREATE EXTENSION IF NOT EXISTS vector;" || true
    echo -e "${COLOR_GREEN}✅ Extension pgvector créée${COLOR_RESET}"
fi
echo ""

echo -e "${COLOR_GREEN}=== Setup terminé avec succès ! ===${COLOR_RESET}"
echo ""
echo "Prochaines étapes:"
echo "  1. Lancer l'API: ${COLOR_YELLOW}npm run dev${COLOR_RESET}"
echo "  2. Tester le système: ${COLOR_YELLOW}./scripts/test-sprint2.sh${COLOR_RESET}"
echo "  3. Ouvrir Prisma Studio: ${COLOR_YELLOW}npx prisma studio${COLOR_RESET}"
echo ""
