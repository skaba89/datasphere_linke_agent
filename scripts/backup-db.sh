#!/bin/bash
# ============================================================
# PostgreSQL Backup Script
#
# Sauvegarde la base de données PostgreSQL dans un fichier
# compressé (gzip) avec timestamp. À exécuter via cron.
#
# Usage :
#   ./scripts/backup-db.sh
#
# Variables d'environnement requises :
#   - DATABASE_URL : URL de connexion PostgreSQL
#
# Optionnelles :
#   - BACKUP_DIR : dossier de destination (défaut: ./backups)
#   - BACKUP_RETENTION_DAYS : nombre de jours à conserver (défaut: 7)
# ============================================================

set -euo pipefail

# Configuration
BACKUP_DIR="${BACKUP_DIR:-./backups}"
BACKUP_RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-7}"
DATABASE_URL="${DATABASE_URL:-}"

# Vérifications
if [ -z "$DATABASE_URL" ]; then
  echo "❌ DATABASE_URL non définie"
  exit 1
fi

if ! command -v pg_dump &> /dev/null; then
  echo "❌ pg_dump non trouvé. Installez PostgreSQL client."
  exit 1
fi

# Créer le dossier de backup
mkdir -p "$BACKUP_DIR"

# Timestamp
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="$BACKUP_DIR/datasphere_${TIMESTAMP}.sql.gz"

echo "📦 Démarrage du backup PostgreSQL..."
echo "   Fichier: $BACKUP_FILE"

# Dump + compression
# pg_dump lit DATABASE_URL automatiquement
pg_dump "$DATABASE_URL" \
  --no-owner \
  --no-privileges \
  --format=plain \
  | gzip > "$BACKUP_FILE"

# Vérifier que le fichier n'est pas vide
FILE_SIZE=$(stat -f%z "$BACKUP_FILE" 2>/dev/null || stat -c%s "$BACKUP_FILE" 2>/dev/null || echo 0)
if [ "$FILE_SIZE" -lt 100 ]; then
  echo "❌ Backup vide ou échoué ($FILE_SIZE bytes)"
  rm -f "$BACKUP_FILE"
  exit 1
fi

echo "✅ Backup réussi: $BACKUP_FILE ($(numfmt --to=iec $FILE_SIZE 2>/dev/null || echo ${FILE_SIZE}B))"

# Nettoyer les anciens backups
echo "🧹 Nettoyage des backups > ${BACKUP_RETENTION_DAYS}j..."
find "$BACKUP_DIR" -name "datasphere_*.sql.gz" -type f -mtime +$BACKUP_RETENTION_DAYS -delete
echo "✅ Nettoyage terminé"

# Lister les backups restants
echo ""
echo "📁 Backups disponibles:"
ls -lh "$BACKUP_DIR"/datasphere_*.sql.gz 2>/dev/null | awk '{print "   "$NF, "("$5")"}' || echo "   (aucun)"
