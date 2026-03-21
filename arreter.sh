#!/bin/bash
# arreter.sh — Arrête BIOTECH proprement (graceful shutdown)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PID_FILE="$SCRIPT_DIR/app.pid"

echo "🛑 Arrêt de BIOTECH..."

if [ -f "$PID_FILE" ]; then
    PID=$(cat "$PID_FILE")
    if kill -0 "$PID" 2>/dev/null; then
        echo "   Envoi SIGTERM au processus $PID (arrêt propre de MongoDB)..."
        kill -TERM "$PID" 2>/dev/null

        # Wait up to 15 seconds for clean shutdown
        for i in $(seq 1 15); do
            if ! kill -0 "$PID" 2>/dev/null; then
                echo "   ✅ Processus arrêté proprement."
                break
            fi
            sleep 1
        done

        # Force kill only if still running after timeout
        if kill -0 "$PID" 2>/dev/null; then
            echo "   ⚠️  Timeout — force kill du processus..."
            kill -9 "$PID" 2>/dev/null
            sleep 2
        fi
    else
        echo "   Processus $PID déjà arrêté."
    fi
    rm -f "$PID_FILE"
fi

# Clean up any orphan processes (but NOT with -9 to avoid data corruption)
pkill -TERM -f "node start-local.js" 2>/dev/null || true
sleep 3
# Final force-kill only if still running
pkill -9 -f "node start-local.js" 2>/dev/null || true
pkill -9 -f "mongod-x64-kali" 2>/dev/null || true
pkill -9 -f "vite" 2>/dev/null || true

echo "✅ BIOTECH arrêté."
