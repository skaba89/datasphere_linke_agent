#!/bin/bash
# ============================================================
# DataSphere - Convert .env to Render UI bulk paste format
#
# Render UI permet de coller plusieurs variables à la fois
# dans le champ "Add Environment Variable".
#
# Ce script convertit votre .env en format key=value (une par ligne)
# prêt à copier-coller dans Render.
#
# Usage :
#   ./scripts/env-to-render-ui.sh <env-file>
#
# Example :
#   ./scripts/env-to-render-ui.sh datasphere_linke_agent.env
#   # Output prêt à copier-coller dans Render dashboard
# ============================================================

if [ "$#" -ne 1 ]; then
  echo "Usage: $0 <env-file>"
  echo "Example: $0 datasphere_linke_agent.env"
  exit 1
fi

ENV_FILE="$1"

if [ ! -f "$ENV_FILE" ]; then
  echo "❌ File not found: $ENV_FILE"
  exit 1
fi

echo "================================================"
echo "  Variables prêtes à coller dans Render"
echo "  (Dashboard → Environment → Add Variable → paste)"
echo "================================================"
echo ""

VAR_COUNT=0
while IFS='=' read -r key value || [ -n "$key" ]; do
  # Skip empty lines and comments
  [[ -z "$key" || "$key" =~ ^[[:space:]]*# ]] && continue
  key=$(echo "$key" | xargs)
  [ -z "$key" ] && continue

  # Remove surrounding quotes
  value="${value%\"}"
  value="${value#\"}"
  value="${value%\'}"
  value="${value#\'}"

  [ -z "$value" ] && continue

  echo "$key=$value"
  VAR_COUNT=$((VAR_COUNT+1))
done < "$ENV_FILE"

echo ""
echo "================================================"
echo "  $VAR_COUNT variables générées"
echo ""
echo "Instructions :"
echo "  1. Copiez toutes les lignes ci-dessus"
echo "  2. Allez sur https://dashboard.render.com"
echo "  3. Sélectionnez votre service 'datasphere'"
echo "  4. Onglet 'Environment'"
echo "  5. Cliquez 'Add Environment Variable'"
echo "  6. Collez dans le champ (Render détecte key=value)"
echo "  7. Save Changes → Render redéploie automatiquement"
echo "================================================"
