#!/bin/bash
# Script de test pour AI Cortex

set -e

echo "🧪 Testing AI Cortex Integration"
echo "================================"
echo ""

# Vérifier que le service est démarré
echo "📡 Checking AI Cortex health..."
if curl -f -s http://localhost:8000/health > /dev/null 2>&1; then
    echo "✅ AI Cortex is running"
else
    echo "❌ AI Cortex is not running"
    echo "   Start it with: docker-compose up -d ai-cortex"
    echo "   Or manually: cd apps/ai-cortex && python main.py"
    exit 1
fi

echo ""
echo "📋 Running integration tests..."
echo ""

# Lancer les tests Python
cd apps/ai-cortex

if command -v python3 &> /dev/null; then
    python3 test_integration.py "$@"
elif command -v python &> /dev/null; then
    python test_integration.py "$@"
else
    echo "❌ Python not found"
    exit 1
fi
