#!/bin/bash
# demarrer.sh — Lance BIOTECH en arrière-plan (SSH friendly)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

PID_FILE="$SCRIPT_DIR/app.pid"
LOG_FILE="$SCRIPT_DIR/server.log"
HOST_FILE="$SCRIPT_DIR/.last_host"
CURRENT_HOST=$(hostname)

# ─── Stop old processes ──────────────────────────────────────────────────────
echo "🛑 Arrêt des anciens processus..."
if [ -f "$PID_FILE" ]; then
    OLD_PID=$(cat "$PID_FILE")
    kill "$OLD_PID" 2>/dev/null && echo "   Ancien processus ($OLD_PID) arrêté."
    rm -f "$PID_FILE"
fi
pkill -9 -f "node start-local.js" 2>/dev/null || true
pkill -9 -f "vite" 2>/dev/null || true
sleep 2

# ─── Detect new machine → clear incompatible MongoDB data ────────────────────
if [ -f "$HOST_FILE" ]; then
    LAST_HOST=$(cat "$HOST_FILE")
    if [ "$LAST_HOST" != "$CURRENT_HOST" ]; then
        echo "🆕 Nouveau serveur détecté ($CURRENT_HOST ≠ $LAST_HOST)"
        echo "   Suppression des données MongoDB incompatibles..."
        rm -rf data/db
        mkdir -p data/db
        echo "   ✅ Données réinitialisées."
    fi
else
    # First run on this machine
    echo "🆕 Première exécution sur ce serveur — réinitialisation MongoDB..."
    rm -rf data/db
    mkdir -p data/db
fi
echo "$CURRENT_HOST" > "$HOST_FILE"

# ─── Clean MongoDB locks ─────────────────────────────────────────────────────
rm -f data/db/mongod.lock data/db/WiredTiger.lock 2>/dev/null || true

# ─── Install dependencies if needed ─────────────────────────────────────────
if [ ! -d "node_modules" ] || [ ! -d "node_modules/@whiskeysockets" ]; then
    echo "📦 Installation des dépendances (npm install)..."
    npm install
    echo "✅ Dépendances installées."
fi

# ─── Start in background ─────────────────────────────────────────────────────
echo "🚀 Démarrage de BIOTECH en arrière-plan..."
nohup node start-local.js > "$LOG_FILE" 2>&1 &
APP_PID=$!
echo $APP_PID > "$PID_FILE"

echo ""
echo "✅ BIOTECH lancé en arrière-plan !"
echo "   PID          : $APP_PID"
echo "   Logs         : ./logs.sh"
echo "   Arrêter      : ./arreter.sh"
echo ""
echo "   Frontend → http://$(hostname -I | awk '{print $1}'):5173"
echo "   Backend  → http://$(hostname -I | awk '{print $1}'):5000"
echo ""
