#!/usr/bin/env bash
# Tabula Rasa : purge Docker, relance data, applique les migrations.
# Usage : ./scripts/tabula-rasa.sh
# Puis : npm run dev:api (terminal 1), npm run dev:web (terminal 2), ouvrir /demo/billing-flow

set -e
cd "$(dirname "$0")/.."

echo "=== Tabula Rasa : arrêt et suppression des volumes ==="
docker compose down -v || true

echo ""
echo "=== Relance des services DATA uniquement (Postgres, Redis, Neo4j, MinIO, NATS) ==="
echo "    (API et Web à lancer en local : npm run dev:api puis npm run dev:web)"
docker compose up -d postgres redis neo4j minio nats

echo ""
echo "=== Attente santé Postgres (15s) ==="
sleep 15

echo ""
echo "=== Application des migrations Prisma sur la base fraîche ==="
cd apps/api && npx prisma migrate deploy && cd ../..

echo ""
echo "=== Tabula Rasa terminée. ==="
echo ""
echo "Pour le Test de vérité :"
echo "  1. Si l'API tourne dans Docker (port 3000) : configure le front pour pointer vers http://localhost:3000"
echo "  2. Sinon (mode hybride) : arrête le conteneur API puis lance :"
echo "       npm run dev:api    # terminal 1 (port 3001)"
echo "       npm run dev:web   # terminal 2 (port 4200)"
echo "  3. Ouvre http://localhost:4200/demo/billing-flow"
echo "  4. Crée une facture 0 € → le bouton Valider doit être absent."
echo ""
