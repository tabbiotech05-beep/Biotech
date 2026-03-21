#!/bin/bash
# arreter.sh — Arrête BIOTECH proprement
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PID_FILE="$SCRIPT_DIR/app.pid"

echo "🛑 Arrêt de BIOTECH..."

if [ -f "$PID_FILE" ]; then
    PID=$(cat "$PID_FILE")
    kill "$PID" 2>/dev/null && echo "   Processus $PID arrêté." || echo "   Processus déjà arrêté."
    rm -f "$PID_FILE"
fi

pkill -9 -f "mongod-x64-kali" 2>/dev/null || true
pkill -9 -f "node start-local.js" 2>/dev/null || true
pkill -9 -f "vite" 2>/dev/null || true

echo "✅ BIOTECH arrêté."
