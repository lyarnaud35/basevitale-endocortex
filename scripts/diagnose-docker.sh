#!/bin/bash
# Script de diagnostic Docker pour macOS

echo "=========================================="
echo "DIAGNOSTIC DOCKER - macOS"
echo "=========================================="
echo ""

# 1. Vérifier si Docker Desktop est installé
echo "1️⃣  Vérification de l'installation Docker..."
if command -v docker &> /dev/null; then
    docker --version
else
    echo "❌ Docker CLI non trouvé dans le PATH"
    exit 1
fi
echo ""

# 2. Vérifier les processus Docker
echo "2️⃣  Processus Docker en cours d'exécution..."
if pgrep -f "Docker Desktop" > /dev/null; then
    echo "✅ Docker Desktop process détecté"
    ps aux | grep -i "Docker Desktop" | grep -v grep | head -3
else
    echo "❌ Aucun processus Docker Desktop détecté"
    echo "💡 Essayez de redémarrer Docker Desktop"
fi
echo ""

# 3. Vérifier les emplacements possibles du socket
echo "3️⃣  Recherche du socket Docker..."
SOCKET_LOCATIONS=(
    "/var/run/docker.sock"
    "$HOME/.docker/run/docker.sock"
    "/Users/$USER/.docker/run/docker.sock"
    "$HOME/Library/Containers/com.docker.docker/Data/docker.sock"
)

FOUND_SOCKET=""
for socket in "${SOCKET_LOCATIONS[@]}"; do
    if [ -S "$socket" ] 2>/dev/null; then
        echo "✅ Socket trouvé : $socket"
        ls -la "$socket"
        FOUND_SOCKET="$socket"
        break
    else
        echo "  ❌ $socket (non trouvé)"
    fi
done
echo ""

# 4. Tester la connexion Docker avec différents sockets
echo "4️⃣  Test de connexion Docker..."
if [ -n "$FOUND_SOCKET" ]; then
    echo "Tentative avec socket trouvé : $FOUND_SOCKET"
    DOCKER_HOST="unix://$FOUND_SOCKET" docker ps 2>&1 | head -3
else
    echo "⚠️  Aucun socket trouvé. Tentative avec socket par défaut..."
    docker ps 2>&1 | head -3
fi
echo ""

# 5. Vérifier Docker Compose
echo "5️⃣  Vérification Docker Compose..."
if command -v docker-compose &> /dev/null; then
    docker-compose --version
elif docker compose version &> /dev/null 2>&1; then
    docker compose version
else
    echo "❌ Docker Compose non trouvé"
fi
echo ""

# 6. Recommandations
echo "=========================================="
echo "RECOMMANDATIONS"
echo "=========================================="
echo ""

if [ -z "$FOUND_SOCKET" ]; then
    echo "🔧 Actions à effectuer :"
    echo ""
    echo "1. Dans Docker Desktop :"
    echo "   - Menu Docker Desktop > Settings > General"
    echo "   - Vérifiez 'Use the new Virtualization framework' (si disponible)"
    echo "   - Cliquez sur 'Apply & Restart'"
    echo ""
    echo "2. Redémarrer Docker Desktop :"
    echo "   - Menu Docker Desktop > Quit Docker Desktop"
    echo "   - Relancer Docker Desktop depuis Applications"
    echo "   - Attendre que l'icône soit verte"
    echo ""
    echo "3. Vérifier les permissions :"
    echo "   - Settings > Resources > File Sharing"
    echo "   - Assurez-vous que le dossier du projet est partagé"
    echo ""
    echo "4. Si le problème persiste :"
    echo "   - Réinstaller Docker Desktop"
    echo "   - Vérifier que macOS est à jour"
fi

echo ""
echo "Pour tester après redémarrage :"
echo "  docker ps"
echo "  docker compose ps"
