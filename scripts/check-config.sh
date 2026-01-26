#!/bin/bash

# Script de vérification de la configuration
# BaseVitale - Vérifie que tout est correctement configuré

set -e

COLOR_GREEN='\033[0;32m'
COLOR_RED='\033[0;31m'
COLOR_YELLOW='\033[1;33m'
COLOR_BLUE='\033[0;34m'
COLOR_RESET='\033[0m'

echo -e "${COLOR_BLUE}=== Vérification de la Configuration BaseVitale ===${COLOR_RESET}"
echo ""

ERRORS=0

# 1. Vérifier les fichiers de configuration TypeScript
echo "1. Vérification des fichiers TypeScript..."

if [ ! -f "tsconfig.base.json" ]; then
    echo -e "${COLOR_RED}❌ tsconfig.base.json manquant${COLOR_RESET}"
    ERRORS=$((ERRORS + 1))
else
    echo -e "${COLOR_GREEN}✅ tsconfig.base.json trouvé${COLOR_RESET}"
    
    # Vérifier que le path mapping est présent
    if grep -q "@basevitale/shared" tsconfig.base.json; then
        echo -e "${COLOR_GREEN}✅ Path mapping @basevitale/shared configuré${COLOR_RESET}"
    else
        echo -e "${COLOR_RED}❌ Path mapping @basevitale/shared manquant${COLOR_RESET}"
        ERRORS=$((ERRORS + 1))
    fi
fi

if [ ! -f "apps/api/tsconfig.app.json" ]; then
    echo -e "${COLOR_RED}❌ apps/api/tsconfig.app.json manquant${COLOR_RESET}"
    ERRORS=$((ERRORS + 1))
else
    echo -e "${COLOR_GREEN}✅ apps/api/tsconfig.app.json trouvé${COLOR_RESET}"
    
    # Vérifier que les paths sont configurés
    if grep -q "@basevitale/shared" apps/api/tsconfig.app.json; then
        echo -e "${COLOR_GREEN}✅ Paths configurés dans tsconfig.app.json${COLOR_RESET}"
    else
        echo -e "${COLOR_YELLOW}⚠️  Paths non trouvés dans tsconfig.app.json${COLOR_RESET}"
    fi
fi

# 2. Vérifier les exports du module shared
echo ""
echo "2. Vérification du module shared..."

if [ ! -f "libs/shared/src/index.ts" ]; then
    echo -e "${COLOR_RED}❌ libs/shared/src/index.ts manquant${COLOR_RESET}"
    ERRORS=$((ERRORS + 1))
else
    echo -e "${COLOR_GREEN}✅ libs/shared/src/index.ts trouvé${COLOR_RESET}"
    
    # Vérifier les exports
    REQUIRED_EXPORTS=("consultation.schema" "patient.schema" "knowledge-graph.schema" "billing.schema" "coding.schema")
    for export_file in "${REQUIRED_EXPORTS[@]}"; do
        if grep -q "$export_file" libs/shared/src/index.ts; then
            echo -e "${COLOR_GREEN}  ✅ Export $export_file présent${COLOR_RESET}"
        else
            echo -e "${COLOR_YELLOW}  ⚠️  Export $export_file non trouvé${COLOR_RESET}"
        fi
    done
fi

# 3. Vérifier les modules NestJS
echo ""
echo "3. Vérification des modules NestJS..."

REQUIRED_MODULES=(
    "apps/api/src/prisma/prisma.module.ts"
    "apps/api/src/identity/identity.module.ts"
    "apps/api/src/knowledge-graph/knowledge-graph.module.ts"
    "apps/api/src/scribe/scribe.module.ts"
    "apps/api/src/billing/billing-validation.module.ts"
)

for module in "${REQUIRED_MODULES[@]}"; do
    if [ -f "$module" ]; then
        echo -e "${COLOR_GREEN}  ✅ $(basename $module) trouvé${COLOR_RESET}"
    else
        echo -e "${COLOR_RED}  ❌ $(basename $module) manquant${COLOR_RESET}"
        ERRORS=$((ERRORS + 1))
    fi
done

# 4. Vérifier AppModule
echo ""
echo "4. Vérification de AppModule..."

if [ -f "apps/api/src/app/app.module.ts" ]; then
    echo -e "${COLOR_GREEN}✅ app.module.ts trouvé${COLOR_RESET}"
    
    # Vérifier que les modules sont importés
    MODULES_IN_APP=("PrismaModule" "ScribeModule" "IdentityModule" "KnowledgeGraphModule" "BillingValidationModule")
    for module in "${MODULES_IN_APP[@]}"; do
        if grep -q "$module" apps/api/src/app/app.module.ts; then
            echo -e "${COLOR_GREEN}  ✅ $module importé${COLOR_RESET}"
        else
            echo -e "${COLOR_YELLOW}  ⚠️  $module non trouvé dans AppModule${COLOR_RESET}"
        fi
    done
else
    echo -e "${COLOR_RED}❌ app.module.ts manquant${COLOR_RESET}"
    ERRORS=$((ERRORS + 1))
fi

# 5. Vérifier Webpack config
echo ""
echo "5. Vérification de la configuration Webpack..."

if [ -f "apps/api/webpack.config.js" ]; then
    echo -e "${COLOR_GREEN}✅ webpack.config.js trouvé${COLOR_RESET}"
    
    if grep -q "@basevitale/shared" apps/api/webpack.config.js; then
        echo -e "${COLOR_GREEN}  ✅ Alias @basevitale/shared configuré${COLOR_RESET}"
    else
        echo -e "${COLOR_YELLOW}  ⚠️  Alias @basevitale/shared non trouvé${COLOR_RESET}"
    fi
else
    echo -e "${COLOR_RED}❌ webpack.config.js manquant${COLOR_RESET}"
    ERRORS=$((ERRORS + 1))
fi

# 6. Vérifier Prisma
echo ""
echo "6. Vérification de Prisma..."

if [ -f "apps/api/prisma/schema.prisma" ]; then
    echo -e "${COLOR_GREEN}✅ schema.prisma trouvé${COLOR_RESET}"
    
    # Vérifier que le client est généré (optionnel)
    if [ -d "apps/api/src/prisma/client" ]; then
        echo -e "${COLOR_GREEN}  ✅ Client Prisma généré${COLOR_RESET}"
    else
        echo -e "${COLOR_YELLOW}  ⚠️  Client Prisma non généré (exécutez: npx prisma generate)${COLOR_RESET}"
    fi
else
    echo -e "${COLOR_RED}❌ schema.prisma manquant${COLOR_RESET}"
    ERRORS=$((ERRORS + 1))
fi

# Résumé
echo ""
echo "=================================="
if [ $ERRORS -eq 0 ]; then
    echo -e "${COLOR_GREEN}✅ Configuration OK - Aucune erreur détectée${COLOR_RESET}"
    exit 0
else
    echo -e "${COLOR_RED}❌ $ERRORS erreur(s) détectée(s)${COLOR_RESET}"
    exit 1
fi
