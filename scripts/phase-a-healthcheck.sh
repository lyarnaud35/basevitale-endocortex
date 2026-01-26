#!/bin/bash
# PHASE A : VÉRIFICATION DES POULS (HEALTHCHECKS)
# Script de validation de l'infrastructure BaseVitale

set -e

echo "=========================================="
echo "PHASE A : VÉRIFICATION DES POULS"
echo "=========================================="
echo ""

ERROR_COUNT=0

# Fonction pour vérifier un service
check_service() {
    local SERVICE_NAME=$1
    local CHECK_COMMAND=$2
    local EXPECTED_OUTPUT=$3
    
    echo "🔍 Vérification de $SERVICE_NAME..."
    if eval "$CHECK_COMMAND" | grep -q "$EXPECTED_OUTPUT" 2>/dev/null; then
        echo "✅ $SERVICE_NAME : OPÉRATIONNEL"
        return 0
    else
        echo "❌ $SERVICE_NAME : ÉCHEC"
        ERROR_COUNT=$((ERROR_COUNT + 1))
        return 1
    fi
}

# 1. Vérification de Postgres
echo "1️⃣  Postgres (port 5432)..."
if docker exec basevitale-postgres pg_isready -U basevitale 2>/dev/null; then
    echo "✅ Postgres : ACCEPTE LES CONNEXIONS"
else
    echo "❌ Postgres : ÉCHEC (container non accessible ou pas prêt)"
    ERROR_COUNT=$((ERROR_COUNT + 1))
fi
echo ""

# 2. Vérification de Neo4j
echo "2️⃣  Neo4j (port 7474)..."
if curl -s -f http://localhost:7474 > /dev/null 2>&1; then
    echo "✅ Neo4j : ACCESSIBLE SUR localhost:7474"
else
    echo "❌ Neo4j : ÉCHEC (non accessible sur localhost:7474)"
    ERROR_COUNT=$((ERROR_COUNT + 1))
fi
echo ""

# 3. Vérification de Redis
echo "3️⃣  Redis (port 6379)..."
if docker exec basevitale-redis redis-cli ping 2>/dev/null | grep -q "PONG"; then
    echo "✅ Redis : RÉPOND (PONG reçu)"
else
    echo "❌ Redis : ÉCHEC (pas de réponse PONG)"
    ERROR_COUNT=$((ERROR_COUNT + 1))
fi
echo ""

# 4. Vérification du Sidecar Python (ai-cortex)
echo "4️⃣  AI Cortex (port 8000)..."
if curl -s -f http://localhost:8000/health > /dev/null 2>&1; then
    echo "✅ AI Cortex : RÉPOND SUR PORT 8000"
else
    echo "❌ AI Cortex : ÉCHEC (non accessible sur port 8000)"
    ERROR_COUNT=$((ERROR_COUNT + 1))
fi
echo ""

# 5. Vérification de MinIO
echo "5️⃣  MinIO (port 9000)..."
if curl -s -f http://localhost:9000/minio/health/live > /dev/null 2>&1; then
    echo "✅ MinIO : RÉPOND SUR PORT 9000"
else
    echo "⚠️  MinIO : Non critique pour Phase A, mais non accessible"
fi
echo ""

# 6. Vérification de NATS
echo "6️⃣  NATS (port 8222)..."
if curl -s -f http://localhost:8222/healthz > /dev/null 2>&1; then
    echo "✅ NATS : RÉPOND SUR PORT 8222"
else
    echo "⚠️  NATS : Non critique pour Phase A, mais non accessible"
fi
echo ""

# Résumé
echo "=========================================="
echo "RÉSUMÉ DES VÉRIFICATIONS"
echo "=========================================="
echo ""

if [ $ERROR_COUNT -eq 0 ]; then
    echo "✅ TOUS LES SERVICES CRITIQUES SONT OPÉRATIONNELS"
    echo ""
    echo "🎉 PHASE A : RÉUSSIE"
    exit 0
else
    echo "❌ $ERROR_COUNT SERVICE(S) EN ÉCHEC"
    echo ""
    echo "⚠️  PHASE A : ÉCHEC - RÉPARATION NÉCESSAIRE"
    echo ""
    echo "Commandes utiles pour diagnostiquer :"
    echo "  docker compose ps              # État des containers"
    echo "  docker compose logs <service>  # Logs d'un service"
    echo "  docker compose restart <service>  # Redémarrer un service"
    exit 1
fi
