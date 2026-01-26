#!/bin/bash
# Script pour générer le client Prisma et corriger les erreurs TypeScript

echo "=========================================="
echo "🔧 GÉNÉRATION CLIENT PRISMA"
echo "=========================================="
echo ""

cd "$(dirname "$0")/../apps/api" || exit 1

echo "📦 Génération du client Prisma..."
npx prisma generate

if [ $? -eq 0 ]; then
    echo "✅ Client Prisma généré avec succès"
    echo ""
    echo "Les erreurs TypeScript dans scribe.controller.ts devraient maintenant disparaître."
    echo ""
    echo "Si les erreurs persistent :"
    echo "1. Redémarrer le serveur TypeScript dans votre IDE"
    echo "2. Vérifier que node_modules est installé : npm install"
else
    echo "❌ Erreur lors de la génération du client Prisma"
    exit 1
fi
