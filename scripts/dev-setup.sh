#!/bin/bash

# Script de setup pour le développement

set -e

echo "🚀 Setup BaseVitale pour le développement..."

# Vérifier les prérequis
echo "📋 Vérification des prérequis..."
command -v node >/dev/null 2>&1 || { echo "❌ Node.js n'est pas installé"; exit 1; }
command -v docker >/dev/null 2>&1 || { echo "❌ Docker n'est pas installé"; exit 1; }
command -v npm >/dev/null 2>&1 || { echo "❌ npm n'est pas installé"; exit 1; }

# Vérifier la version de Node.js
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node.js 18+ requis, version actuelle: $(node -v)"
    exit 1
fi

echo "✅ Prérequis OK"

# Installer les dépendances
echo "📦 Installation des dépendances..."
npm install

# Démarrer Docker Compose
echo "🐳 Démarrage des services Docker..."
docker-compose up -d

# Attendre que PostgreSQL soit prêt
echo "⏳ Attente de PostgreSQL..."
sleep 5

# Générer le client Prisma
echo "🔧 Génération du client Prisma..."
cd apps/api
npx prisma generate
cd ../..

# Créer les migrations (si nécessaire)
echo "📝 Vérification des migrations..."
cd apps/api
if [ ! -d "prisma/migrations" ] || [ -z "$(ls -A prisma/migrations)" ]; then
    echo "📝 Création de la migration initiale..."
    npx prisma migrate dev --name init --create-only || true
fi
cd ../..

echo "✅ Setup terminé !"
echo ""
echo "Pour démarrer l'API :"
echo "  npm run dev"
echo ""
echo "Pour accéder à Prisma Studio :"
echo "  npm run prisma:studio"
