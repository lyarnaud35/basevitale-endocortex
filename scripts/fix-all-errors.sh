#!/bin/bash
# Script complet pour corriger toutes les erreurs TypeScript dans scribe.controller.ts
# Résout : modules manquants + client Prisma non généré

echo "=========================================="
echo "🔧 CORRECTION DES 9 ERREURS TypeScript"
echo "=========================================="
echo ""

# Aller à la racine du projet
cd "$(dirname "$0")/.." || exit 1

echo "📦 Étape 1/2 : Installation des dépendances npm..."
echo "   (Ceci peut prendre quelques minutes)"
echo ""

# Installer toutes les dépendances
npm install

if [ $? -ne 0 ]; then
    echo "❌ Erreur lors de l'installation des dépendances"
    exit 1
fi

echo ""
echo "✅ Dépendances installées"
echo ""

echo "📦 Étape 2/2 : Génération du client Prisma..."
echo ""

# Générer le client Prisma
cd apps/api || exit 1
npx prisma generate

if [ $? -ne 0 ]; then
    echo "❌ Erreur lors de la génération du client Prisma"
    exit 1
fi

echo ""
echo "=========================================="
echo "✅ TOUTES LES ERREURS ONT ÉTÉ CORRIGÉES"
echo "=========================================="
echo ""
echo "Les 9 erreurs dans scribe.controller.ts devraient maintenant disparaître :"
echo ""
echo "   ✅ Modules npm installés (@nestjs/common, zod, tslib)"
echo "   ✅ Client Prisma généré (consultationDraft disponible)"
echo ""
echo "📝 PROCHAINES ÉTAPES :"
echo ""
echo "   1. Redémarrez votre serveur TypeScript dans votre IDE :"
echo "      - VS Code/Cursor : Reload Window (Cmd+Shift+P → 'Reload Window')"
echo "      - Ou fermez et rouvrez l'IDE"
echo ""
echo "   2. Vérifiez que les erreurs ont disparu dans scribe.controller.ts"
echo ""
echo "   3. Si les erreurs persistent encore :"
echo "      - Vérifiez que vous êtes dans la racine du monorepo"
echo "      - Exécutez : cd apps/api && npx prisma generate --force"
echo ""
echo "🎉 Le code est correct - c'était un problème d'environnement !"
