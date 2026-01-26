#!/bin/bash
# Script de monitoring pour la Phase A - Suivi du démarrage des containers

echo "=========================================="
echo "PHASE A : MONITORING DES CONTAINERS"
echo "=========================================="
echo ""

MAX_ATTEMPTS=30
ATTEMPT=0

while [ $ATTEMPT -lt $MAX_ATTEMPTS ]; do
    ATTEMPT=$((ATTEMPT + 1))
    echo "🔄 Tentative $ATTEMPT/$MAX_ATTEMPTS - Vérification de l'état..."
    echo ""
    
    # Vérifier l'état des containers
    STATUS=$(docker compose ps 2>/dev/null | tail -n +3 | wc -l | tr -d ' ')
    
    if [ "$STATUS" -gt 0 ]; then
        echo "✅ Containers détectés !"
        docker compose ps
        echo ""
        break
    else
        echo "⏳ Aucun container démarré pour le moment..."
        echo "   (Le build de ai-cortex peut prendre 5-10 minutes)"
        echo ""
        sleep 10
    fi
done

if [ "$STATUS" -eq 0 ]; then
    echo "⚠️  Aucun container n'a démarré après $MAX_ATTEMPTS tentatives"
    echo ""
    echo "Vérifiez les logs :"
    echo "  docker compose logs"
    echo ""
    echo "Ou relancez manuellement :"
    echo "  docker compose up -d"
    exit 1
fi

echo "✅ Phase A - Containers démarrés"
echo ""
echo "Vérifiez maintenant les healthchecks :"
echo "  ./scripts/phase-a-healthcheck.sh"
