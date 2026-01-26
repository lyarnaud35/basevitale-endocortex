#!/bin/bash

# Script pour démarrer tous les serveurs de développement
# Backend API + Frontend Web

echo "=========================================="
echo "🚀 DÉMARRAGE BASEVITALE - MODE DÉVELOPPEMENT"
echo "=========================================="
echo ""

# Vérifier que nous sommes à la racine du projet
if [ ! -f "package.json" ]; then
    echo "❌ Erreur : Ce script doit être exécuté depuis la racine du projet"
    exit 1
fi

# Vérifier que node_modules existe
if [ ! -d "node_modules" ]; then
    echo "📦 Installation des dépendances npm..."
    npm install
fi

echo "🔍 Vérification de l'environnement..."
echo ""

# Vérifier que Docker est démarré
if ! docker ps > /dev/null 2>&1; then
    echo "⚠️  Docker ne semble pas être démarré"
    echo "   Veuillez démarrer Docker Desktop"
    exit 1
fi

# Démarrer les services Docker si nécessaire
if ! docker ps | grep -q "postgres"; then
    echo "🐳 Démarrage des services Docker..."
    docker-compose up -d
    echo "⏳ Attente de PostgreSQL (10 secondes)..."
    sleep 10
fi

echo ""
echo "✅ Services Docker opérationnels"
echo ""

# Vérifier que Prisma client est généré
if [ ! -d "apps/api/src/prisma/client" ]; then
    echo "🔧 Génération du client Prisma..."
    cd apps/api
    npx prisma generate
    cd ../..
fi

echo ""
echo "=========================================="
echo "🎯 DÉMARRAGE DES SERVEURS"
echo "=========================================="
echo ""
echo "📡 Backend API : http://localhost:3000"
echo "🌐 Frontend Web : http://localhost:4200"
echo ""
echo "⚠️  Les serveurs vont démarrer dans des terminaux séparés"
echo ""
echo "Pour démarrer manuellement :"
echo "  Terminal 1 (API)   : npm run dev:api"
echo "  Terminal 2 (Web)   : npm run dev:web"
echo ""
echo "Ou utilisez les commandes suivantes :"
echo "  npm run dev        # API seulement"
echo "  npm run dev:api    # API seulement"
echo "  npm run dev:web    # Web seulement"
echo ""

# Démarrer le backend (en arrière-plan)
echo "🚀 Démarrage du backend API..."
npm run dev:api &
API_PID=$!

# Attendre un peu que l'API démarre
sleep 3

# Démarrer le frontend
echo "🚀 Démarrage du frontend Web..."
npm run dev:web &
WEB_PID=$!

echo ""
echo "✅ Serveurs démarrés !"
echo ""
echo "📡 Backend API : http://localhost:3000/api"
echo "🌐 Frontend Web : http://localhost:4200"
echo ""
echo "Pour arrêter : Ctrl+C ou tuer les processus $API_PID et $WEB_PID"
echo ""

# Attendre que l'utilisateur arrête
wait
