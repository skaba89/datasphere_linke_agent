#!/bin/sh
# ============================================================
# DataSphere - Script de démarrage production
#
# 1. Attendre que PostgreSQL soit accessible
# 2. Appliquer les migrations Prisma (migrate deploy)
# 3. Démarrer le serveur Next.js
#
# Utilise le binaire prisma directement (pas npx) pour éviter
# les téléchargements au runtime.
# ============================================================

set -e

echo "[DataSphere] Starting production server..."
echo "[DataSphere] CWD: $(pwd)"
echo "[DataSphere] Node version: $(node --version)"

# Vérifier que DATABASE_URL est défini
if [ -z "$DATABASE_URL" ]; then
  echo "[DataSphere] ERROR: DATABASE_URL not set"
  exit 1
fi
echo "[DataSphere] DATABASE_URL: ${DATABASE_URL#*@}"  # masque credentials

# Vérifier que DATASPHERE_AUTH_SECRET est défini
if [ -z "$DATASPHERE_AUTH_SECRET" ]; then
  echo "[DataSphere] WARNING: DATASPHERE_AUTH_SECRET not set, using insecure default"
fi

# ============================================================
# Étape 1 : Appliquer les migrations Prisma
# ============================================================
echo "[DataSphere] Applying Prisma migrations..."

# Utiliser le binaire prisma directement (pas npx qui essaie de télécharger)
PRISMA_BIN="./node_modules/prisma/build/index.js"

if [ -f "$PRISMA_BIN" ]; then
  echo "[DataSphere] Using Prisma binary at: $PRISMA_BIN"
  node "$PRISMA_BIN" migrate deploy
  echo "[DataSphere] Migrations applied successfully"
else
  echo "[DataSphere] WARNING: Prisma binary not found at $PRISMA_BIN"
  echo "[DataSphere] Listing node_modules/prisma:"
  ls -la node_modules/prisma/ 2>/dev/null || echo "  node_modules/prisma not found"
  ls -la node_modules/prisma/build/ 2>/dev/null || echo "  node_modules/prisma/build not found"

  # Fallback : essayer npx (peut échouer si pas d'accès internet)
  echo "[DataSphere] Trying npx prisma as fallback..."
  npx prisma migrate deploy || {
    echo "[DataSphere] ERROR: Failed to apply migrations"
    echo "[DataSphere] Starting server anyway (DB may be out of sync)"
  }
fi

# ============================================================
# Étape 2 : Démarrer le serveur Next.js
# ============================================================
echo "[DataSphere] Starting Next.js server on port ${PORT:-10000}..."
exec node server.js
