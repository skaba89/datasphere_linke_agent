#!/bin/sh
# ============================================================
# DataSphere - Script de démarrage production (Render)
#
# Étapes :
#   1. Vérifier les env vars critiques
#   2. Attendre que PostgreSQL soit accessible (retry 60s)
#   3. Appliquer les migrations Prisma (avec retry)
#   4. Démarrer le serveur Next.js
#
# ⚠️ Ne JAMAIS faire `set -e` globalement : si les migrations
# échouent, on démarre quand même le serveur (Render healthcheck
# pourra retry). Sinon le container meurt et Render marque le
# service comme "failed" sans possibilité de récupération.
# ============================================================

echo "[DataSphere] Starting production server..."
echo "[DataSphere] CWD: $(pwd)"
echo "[DataSphere] Node version: $(node --version)"
echo "[DataSphere] Time: $(date -u +%Y-%m-%dT%H:%M:%SZ)"

# ─── Vérifications env vars ───
if [ -z "$DATABASE_URL" ]; then
  echo "[DataSphere] FATAL: DATABASE_URL not set"
  exit 1
fi
echo "[DataSphere] DATABASE_URL: ${DATABASE_URL#*@}"  # masque credentials

if [ -z "$DATASPHERE_AUTH_SECRET" ]; then
  echo "[DataSphere] WARNING: DATASPHERE_AUTH_SECRET not set, using insecure default"
fi

# ─── Fonction : attendre que la DB soit prête ───
wait_for_db() {
  echo "[DataSphere] Waiting for PostgreSQL to be ready..."
  MAX_RETRIES=30
  RETRY=0

  while [ $RETRY -lt $MAX_RETRIES ]; do
    # Tester la connexion via prisma db execute (requête SQL simple)
    PRISMA_BIN="./node_modules/prisma/build/index.js"
    if [ -f "$PRISMA_BIN" ]; then
      if echo "SELECT 1;" | node "$PRISMA_BIN" db execute --stdin 2>/dev/null; then
        echo "[DataSphere] PostgreSQL is ready! (attempt $((RETRY+1)))"
        return 0
      fi
    else
      # Fallback : ping avec psql si disponible
      if command -v psql >/dev/null 2>&1; then
        if psql "$DATABASE_URL" -c "SELECT 1;" >/dev/null 2>&1; then
          echo "[DataSphere] PostgreSQL is ready! (psql, attempt $((RETRY+1)))"
          return 0
        fi
      fi
    fi

    RETRY=$((RETRY+1))
    echo "[DataSphere] DB not ready, retry $RETRY/$MAX_RETRIES (waiting 2s)..."
    sleep 2
  done

  echo "[DataSphere] WARNING: DB not ready after $MAX_RETRIES attempts"
  return 1
}

# ─── Étape 1 : Attendre la DB ───
wait_for_db || echo "[DataSphere] Continuing despite DB not ready..."

# ─── Étape 2 : Appliquer les migrations Prisma ───
echo "[DataSphere] Applying Prisma migrations..."

PRISMA_BIN="./node_modules/prisma/build/index.js"
MIGRATION_SUCCESS=false

if [ -f "$PRISMA_BIN" ]; then
  echo "[DataSphere] Using Prisma binary: $PRISMA_BIN"

  # Retry 3 fois
  for attempt in 1 2 3; do
    if node "$PRISMA_BIN" migrate deploy 2>&1; then
      echo "[DataSphere] Migrations applied successfully (attempt $attempt)"
      MIGRATION_SUCCESS=true
      break
    else
      echo "[DataSphere] Migration attempt $attempt failed, retrying in 5s..."
      sleep 5
    fi
  done
else
  echo "[DataSphere] Prisma binary not found at $PRISMA_BIN"
  echo "[DataSphere] Listing node_modules/prisma:"
  ls -la node_modules/prisma/ 2>/dev/null || echo "  node_modules/prisma not found"

  # Fallback npx
  echo "[DataSphere] Trying npx prisma as fallback..."
  for attempt in 1 2 3; do
    if npx prisma migrate deploy 2>&1; then
      echo "[DataSphere] Migrations applied via npx (attempt $attempt)"
      MIGRATION_SUCCESS=true
      break
    else
      echo "[DataSphere] npx attempt $attempt failed, retrying in 5s..."
      sleep 5
    fi
  done
fi

if [ "$MIGRATION_SUCCESS" = "false" ]; then
  echo "[DataSphere] WARNING: Migrations failed after retries."
  echo "[DataSphere] Starting server anyway (DB may be out of sync)."
  echo "[DataSphere] Manual fix: render ssh → npx prisma migrate deploy"
fi

# ─── Étape 3 : Démarrer le serveur Next.js ───
echo "[DataSphere] Starting Next.js server on port ${PORT:-10000}..."
echo "[DataSphere] Hostname: ${HOSTNAME:-0.0.0.0}"
exec node server.js
