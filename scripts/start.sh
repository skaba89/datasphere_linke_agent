#!/bin/sh
# ============================================================
# DataSphere - Script de démarrage production (Render)
#
# ⚠️ STRATÉGIE CRITIQUE POUR RENDER :
#   1. Démarrer le serveur Next.js EN PREMIER (port 10000)
#      → Render détecte le port → service marqué "live"
#   2. Lancer les migrations EN ARRIÈRE-PLAN (non bloquant)
#      → Si DB pas prête, retry automatique toutes les 10s
#      → Server reste up même si migrations échouent
#
# Pourquoi ? Render a un timeout (~5 min) pour détecter un port
# ouvert. Si on attend la DB avant de démarrer le serveur, le
# timeout explose et le service est marqué "failed".
# ============================================================

echo "[DataSphere] ============================================"
echo "[DataSphere] Starting DataSphere production server..."
echo "[DataSphere] CWD: $(pwd)"
echo "[DataSphere] Node: $(node --version)"
echo "[DataSphere] Time: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
echo "[DataSphere] ============================================"

# ─── Vérifications critiques ───
if [ -z "$DATABASE_URL" ]; then
  echo "[DataSphere] FATAL: DATABASE_URL not set"
  exit 1
fi
echo "[DataSphere] DATABASE_URL: ${DATABASE_URL#*@}"

if [ -z "$JWT_SECRET" ] && [ -z "$DATASPHERE_AUTH_SECRET" ]; then
  echo "[DataSphere] WARNING: No JWT_SECRET set - auth will be insecure!"
fi

# ============================================================
# Étape 1 : Lancer les migrations EN ARRIÈRE-PLAN (non bloquant)
# ============================================================
(
  echo "[DataSphere] [bg] Migration worker started"

  PRISMA_BIN="./node_modules/prisma/build/index.js"
  MAX_ATTEMPTS=30
  attempt=1

  while [ $attempt -le $MAX_ATTEMPTS ]; do
    echo "[DataSphere] [bg] Migration attempt $attempt/$MAX_ATTEMPTS..."

    if [ -f "$PRISMA_BIN" ]; then
      OUTPUT=$(node "$PRISMA_BIN" migrate deploy 2>&1)
      EXIT_CODE=$?
    else
      OUTPUT=$(npx prisma migrate deploy 2>&1)
      EXIT_CODE=$?
    fi

    if [ $EXIT_CODE -eq 0 ]; then
      echo "[DataSphere] [bg] ✅ Migrations applied successfully"
      echo "$OUTPUT" | head -5
      exit 0
    else
      echo "[DataSphere] [bg] Attempt $attempt failed (exit $EXIT_CODE), retrying in 10s..."
      echo "[DataSphere] [bg] Error: $(echo "$OUTPUT" | head -3)"
      sleep 10
      attempt=$((attempt + 1))
    fi
  done

  echo "[DataSphere] [bg] WARNING: Migrations failed after $MAX_ATTEMPTS attempts"
  echo "[DataSphere] [bg] Server is running but DB may be out of sync"
  echo "[DataSphere] [bg] Check /api/health for diagnostics"
) &
MIGRATION_PID=$!

# ============================================================
# Étape 2 : Démarrer le serveur Next.js IMMÉDIATEMENT
# (Render détecte le port 10000 → service marqué "live")
# ============================================================
echo "[DataSphere] Starting Next.js server on port ${PORT:-10000}..."
echo "[DataSphere] Migrations running in background (PID: $MIGRATION_PID)"
echo "[DataSphere] ============================================"

# exec remplace le shell courant par node → signaux properly forwardés
exec node server.js
