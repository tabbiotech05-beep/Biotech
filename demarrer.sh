#!/bin/bash
# demarrer.sh — Lance BIOTECH + SALES-DASHBOARD en arrière-plan (SSH friendly)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

PID_FILE="$SCRIPT_DIR/app.pid"
SALES_PID_FILE="$SCRIPT_DIR/sales-dashboard.pid"
LOG_FILE="$SCRIPT_DIR/server.log"
SALES_LOG_FILE="$SCRIPT_DIR/dev.log"

# ─── Kill ALL related processes (including orphan children) ──────────────────
echo "🛑 Arrêt complet des anciens processus..."

# Kill by saved PID (main app)
if [ -f "$PID_FILE" ]; then
    OLD_PID=$(cat "$PID_FILE")
    kill -TERM "$OLD_PID" 2>/dev/null || true
    rm -f "$PID_FILE"
fi

# Kill by saved PID (sales-dashboard)
if [ -f "$SALES_PID_FILE" ]; then
    OLD_SALES_PID=$(cat "$SALES_PID_FILE")
    kill -TERM "$OLD_SALES_PID" 2>/dev/null || true
    rm -f "$SALES_PID_FILE"
fi

# Kill all related node/vite processes by name
pkill -TERM -f "node start-local.js"  2>/dev/null || true
pkill -TERM -f "node server/index.js" 2>/dev/null || true
pkill -TERM -f "mongod-x64-kali"      2>/dev/null || true
pkill -TERM -f "vite"                  2>/dev/null || true
sleep 3

# Force-kill anything still on ports 5000 / 5173 / 5174
fuser -k 5000/tcp 2>/dev/null || true
fuser -k 5173/tcp 2>/dev/null || true
fuser -k 5174/tcp 2>/dev/null || true

# Hard kill any survivors
pkill -9 -f "node start-local.js"  2>/dev/null || true
pkill -9 -f "node server/index.js" 2>/dev/null || true
pkill -9 -f "mongod-x64-kali"      2>/dev/null || true
sleep 2

# ─── Clean MongoDB lock ───────────────────────────────────────────────────────
echo "🔓 Suppression du verrou mongod (si présent)..."
rm -f data/db/mongod.lock 2>/dev/null || true

# ─── Install main app dependencies if needed ─────────────────────────────────
if [ ! -d "node_modules" ] || [ ! -d "node_modules/@whiskeysockets" ]; then
    echo "📦 Installation des dépendances (npm install)..."
    npm install
    echo "✅ Dépendances installées."
fi

# ─── Install sales-dashboard dependencies if needed ──────────────────────────
if [ ! -d "sales-dashboard/node_modules" ]; then
    echo "📦 Installation des dépendances sales-dashboard..."
    cd sales-dashboard
    npm install
    cd "$SCRIPT_DIR"
    echo "✅ Dépendances sales-dashboard installées."
fi

# ─── Start main app in background ────────────────────────────────────────────
echo "🚀 Démarrage de BIOTECH en arrière-plan..."
nohup node start-local.js > "$LOG_FILE" 2>&1 &
APP_PID=$!
echo $APP_PID > "$PID_FILE"

# ─── Start sales-dashboard in background ─────────────────────────────────────
echo "📊 Démarrage du SALES-DASHBOARD (port 5174) en arrière-plan..."
cd sales-dashboard
nohup npx vite --port 5174 --host 0.0.0.0 > "$SALES_LOG_FILE" 2>&1 &
SALES_PID=$!
echo $SALES_PID > "$SALES_PID_FILE"
cd "$SCRIPT_DIR"

echo ""
echo "✅ BIOTECH lancé en arrière-plan !"
echo "   PID main app     : $APP_PID"
echo "   PID sales-dash   : $SALES_PID"
echo ""
echo "   Arrêter          : ./arreter.sh"
echo "   Voir logs main   : ./logs.sh"
echo "   Voir logs sales  : tail -f dev.log"
echo ""
echo "   Frontend         → http://0.0.0.0:5173"
echo "   Sales Dashboard  → http://0.0.0.0:5174"
echo "   Backend          → http://0.0.0.0:5000"
echo ""
