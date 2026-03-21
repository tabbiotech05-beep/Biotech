#!/bin/bash
# demarrer.sh — Lance BIOTECH en arrière-plan (SSH friendly)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

PID_FILE="$SCRIPT_DIR/app.pid"
LOG_FILE="$SCRIPT_DIR/server.log"

# ─── Kill ALL related processes (including orphan children) ──────────────────
echo "🛑 Arrêt complet des anciens processus..."

# Kill by saved PID
if [ -f "$PID_FILE" ]; then
    OLD_PID=$(cat "$PID_FILE")
    kill -TERM "$OLD_PID" 2>/dev/null || true
    rm -f "$PID_FILE"
fi

# Kill all related node/vite processes by name
pkill -TERM -f "node start-local.js"  2>/dev/null || true
pkill -TERM -f "node server/index.js" 2>/dev/null || true
pkill -TERM -f "mongod-x64-kali"      2>/dev/null || true
pkill -TERM -f "vite"                  2>/dev/null || true
sleep 3

# Force-kill anything still on ports 5000 / 5173
fuser -k 5000/tcp 2>/dev/null || true
fuser -k 5173/tcp 2>/dev/null || true

# Hard kill any survivors
pkill -9 -f "node start-local.js"  2>/dev/null || true
pkill -9 -f "node server/index.js" 2>/dev/null || true
pkill -9 -f "mongod-x64-kali"      2>/dev/null || true
sleep 2

# ─── Clean MongoDB lock ───────────────────────────────────────────────────────
echo "🔓 Suppression du verrou mongod (si présent)..."
rm -f data/db/mongod.lock 2>/dev/null || true

# ─── Install dependencies if needed ──────────────────────────────────────────
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
echo "   Arrêter      : ./arreter.sh"
echo "   Voir logs    : ./logs.sh"
echo ""
echo "   Frontend → http://localhost:5173"
echo "   Backend  → http://localhost:5000"
echo ""
