#!/bin/bash
# arreter.sh — Arrête BIOTECH proprement (graceful shutdown)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PID_FILE="$SCRIPT_DIR/app.pid"

echo "🛑 Arrêt de BIOTECH..."

# Send SIGTERM to the main process (triggers clean MongoDB shutdown)
if [ -f "$PID_FILE" ]; then
    PID=$(cat "$PID_FILE")
    if kill -0 "$PID" 2>/dev/null; then
        echo "   Envoi SIGTERM au processus $PID..."
        kill -TERM "$PID" 2>/dev/null
        for i in $(seq 1 10); do
            kill -0 "$PID" 2>/dev/null || break
            sleep 1
        done
    fi
    rm -f "$PID_FILE"
fi

# Kill ALL child processes by name (including orphans)
pkill -TERM -f "node start-local.js"  2>/dev/null || true
pkill -TERM -f "node server/index.js" 2>/dev/null || true
pkill -TERM -f "mongod-x64-kali"      2>/dev/null || true
pkill -TERM -f "vite"                  2>/dev/null || true
sleep 3

# Free ports explicitly
fuser -k 5000/tcp 2>/dev/null || true
fuser -k 5173/tcp 2>/dev/null || true

# Hard kill any survivors
pkill -9 -f "node server/index.js" 2>/dev/null || true
pkill -9 -f "mongod-x64-kali"      2>/dev/null || true

echo "✅ BIOTECH arrêté."
