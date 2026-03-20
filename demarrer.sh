#!/bin/bash
# demarrer.sh — Lance le serveur BioXtenshi proprement
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "🛑 Arrêt des anciens processus..."
pkill -9 -f "mongod-x64-kali" 2>/dev/null || true
pkill -9 -f "node server/index.js" 2>/dev/null || true
pkill -9 -f "node start-local.js" 2>/dev/null || true
sleep 3

echo "🔓 Suppression des fichiers de verrou MongoDB..."
rm -f data/db/mongod.lock data/db/WiredTiger.lock 2>/dev/null || true

echo "🚀 Démarrage de BioXtenshi..."
node start-local.js
