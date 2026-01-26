#!/bin/bash
# PHASE A : ALLUMAGE PHYSIQUE (INFRASTRUCTURE)
# Script de démarrage et validation BaseVitale

set -e

echo "=========================================="
echo "PHASE A : L'ALLUMAGE PHYSIQUE"
echo "=========================================="
echo ""

# Étape 1 : Copie des variables d'environnement
echo "📋 Étape 1 : Activation des Variables..."
if [ -f .env.example ]; then
    if [ ! -f .env ]; then
        cp .env.example .env
        echo "✅ .env.example copié vers .env"
    else
        echo "⚠️  .env existe déjà (non écrasé)"
    fi
else
    echo "❌ ERREUR : .env.example introuvable"
    exit 1
fi
echo ""

# Étape 2 : Démarrage des containers
echo "🚀 Étape 2 : Démarrage du Cœur (Docker Compose)..."
if command -v docker &> /dev/null; then
    # Utiliser docker compose (v2) ou docker-compose (v1)
    if docker compose version &> /dev/null; then
        docker compose up -d
    elif docker-compose version &> /dev/null; then
        docker-compose up -d
    else
        echo "❌ ERREUR : Docker Compose non disponible"
        exit 1
    fi
    echo "✅ Docker Compose : Containers démarrés"
else
    echo "❌ ERREUR : Docker non installé ou non accessible"
    echo ""
    echo "💡 Solutions :"
    echo "   1. Installez Docker Desktop (macOS)"
    echo "   2. Vérifiez que Docker est démarré"
    echo "   3. Ajoutez Docker au PATH si nécessaire"
    exit 1
fi
echo ""

# Attendre que les services soient prêts
echo "⏳ Attente de l'initialisation des services (30 secondes)..."
sleep 30
echo ""

# Étape 3 : Vérification des healthchecks
echo "🔍 Étape 3 : Vérification des Pouls (Healthchecks)..."
echo ""

if [ -f scripts/phase-a-healthcheck.sh ]; then
    chmod +x scripts/phase-a-healthcheck.sh
    ./scripts/phase-a-healthcheck.sh
    EXIT_CODE=$?
    
    if [ $EXIT_CODE -eq 0 ]; then
        echo ""
        echo "✅ PHASE A : TERMINÉE AVEC SUCCÈS"
        echo ""
        echo "🎯 Prochaines étapes :"
        echo "   - Phase B : Vérification de la connexion NestJS -> Databases"
        echo "   - Phase C : Test du Module S (Scribe)"
    else
        echo ""
        echo "❌ PHASE A : ÉCHEC"
        echo ""
        echo "🛑 STOP : Infrastructure bancale détectée"
        echo "   Réparez Docker avant de continuer"
        exit 1
    fi
else
    echo "⚠️  Script de vérification introuvable, vérification manuelle requise"
    exit 1
fi
