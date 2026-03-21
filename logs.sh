#!/bin/bash
# logs.sh — Affiche les logs de BIOTECH en temps réel
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG_FILE="$SCRIPT_DIR/server.log"

if [ ! -f "$LOG_FILE" ]; then
    echo "⚠️  Aucun log trouvé. Lancez d'abord ./demarrer.sh"
    exit 1
fi

echo "📋 Logs BIOTECH (Ctrl+C pour quitter)"
echo "─────────────────────────────────────"
tail -f "$LOG_FILE"
