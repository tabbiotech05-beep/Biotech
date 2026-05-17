#!/bin/bash
# arreter.sh — Arrête BIOTECH + SALES-DASHBOARD proprement (graceful shutdown)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PID_FILE="$SCRIPT_DIR/app.pid"
SALES_PID_FILE="$SCRIPT_DIR/sales-dashboard.pid"

echo "🛑 Arrêt de BIOTECH + SALES-DASHBOARD..."

# Send SIGTERM to main app
if [ -f "$PID_FILE" ]; then
    PID=$(cat "$PID_FILE")
    if kill -0 "$PID" 2>/dev/null; then
        echo "   Envoi SIGTERM au processus main $PID..."
        kill -TERM "$PID" 2>/dev/null
        for i in $(seq 1 10); do
            kill -0 "$PID" 2>/dev/null || break
            sleep 1
        done
    fi
    rm -f "$PID_FILE"
fi

# Send SIGTERM to sales-dashboard
if [ -f "$SALES_PID_FILE" ]; then
    SALES_PID=$(cat "$SALES_PID_FILE")
    if kill -0 "$SALES_PID" 2>/dev/null; then
        echo "   Envoi SIGTERM au processus sales-dashboard $SALES_PID..."
        kill -TERM "$SALES_PID" 2>/dev/null
    fi
    rm -f "$SALES_PID_FILE"
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
fuser -k 5174/tcp 2>/dev/null || true

# Hard kill any survivors
pkill -9 -f "node server/index.js" 2>/dev/null || true
pkill -9 -f "mongod-x64-kali"      2>/dev/null || true

echo "✅ BIOTECH + SALES-DASHBOARD arrêtés."
