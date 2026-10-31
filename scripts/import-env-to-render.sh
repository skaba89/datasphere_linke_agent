#!/bin/bash
# ============================================================
# DataSphere - Import .env file to Render via API
#
# Usage :
#   ./scripts/import-env-to-render.sh <env-file> <service-id> <api-key>
#
# Example :
#   ./scripts/import-env-to-render.sh datasphere_linke_agent.env srv-abc123 rnd_xyz789
#
# Get your API key : https://dashboard.render.com/u/settings#api-keys
# Get your service ID : in the URL of your service on Render dashboard
#   (https://dashboard.render.com/web/srv-XXXXXX → serviceId = srv-XXXXXX)
# ============================================================

set -e

# ─── Vérifier les arguments ───
if [ "$#" -ne 3 ]; then
  echo "❌ Usage: $0 <env-file> <service-id> <render-api-key>"
  echo ""
  echo "Example:"
  echo "  $0 datasphere_linke_agent.env srv-abc123456 rnd_xyz789abc"
  echo ""
  echo "Get your API key: https://dashboard.render.com/u/settings#api-keys"
  echo "Get your service ID: in your service URL (srv-XXXX)"
  exit 1
fi

ENV_FILE="$1"
SERVICE_ID="$2"
API_KEY="$3"

# ─── Vérifier que le fichier existe ───
if [ ! -f "$ENV_FILE" ]; then
  echo "❌ File not found: $ENV_FILE"
  exit 1
fi

echo "================================================"
echo "  DataSphere - Import .env to Render"
echo "================================================"
echo "  File:       $ENV_FILE"
echo "  Service ID: $SERVICE_ID"
echo "  API Key:    ${API_KEY:0:8}..."
echo "================================================"
echo ""

# ─── Vérifier que le service existe ───
echo "→ Checking service exists..."
SERVICE_CHECK=$(curl -fsSL -w "%{http_code}" \
  -o /dev/null \
  -H "Authorization: Bearer $API_KEY" \
  "https://api.render.com/v1/services/$SERVICE_ID")

if [ "$SERVICE_CHECK" != "200" ]; then
  echo "❌ Service not found or API key invalid (HTTP $SERVICE_CHECK)"
  echo "   Check that SERVICE_ID='$SERVICE_ID' is correct"
  echo "   Check that your API key has access to this service"
  exit 1
fi
echo "✅ Service found"
echo ""

# ─── Parser le .env et construire le JSON ───
echo "→ Parsing $ENV_FILE..."

# Compteur de variables
VAR_COUNT=0
JSON_PARTS=""

while IFS='=' read -r key value || [ -n "$key" ]; do
  # Skip empty lines and comments
  [[ -z "$key" || "$key" =~ ^[[:space:]]*# ]] && continue

  # Trim whitespace
  key=$(echo "$key" | xargs)

  # Skip if no key
  [ -z "$key" ] && continue

  # Remove surrounding quotes from value (Render API handles them)
  value="${value%\"}"
  value="${value#\"}"
  value="${value%\'}"
  value="${value#\'}"

  # Skip empty values (let Render use its own defaults or generate)
  if [ -z "$value" ]; then
    echo "  ⏭️  Skipping $key (empty value)"
    continue
  fi

  # Échapper les guillemets dans la valeur pour JSON
  ESCAPED_VALUE=$(echo "$value" | sed 's/"/\\"/g' | sed 's/\\n/\\\\n/g')

  # Ajouter au JSON
  if [ -n "$JSON_PARTS" ]; then
    JSON_PARTS="$JSON_PARTS,"
  fi
  JSON_PARTS="$JSON_PARTS{\"key\":\"$key\",\"value\":\"$ESCAPED_VALUE\"}"

  VAR_COUNT=$((VAR_COUNT+1))
  echo "  ✅ $key"

done < "$ENV_FILE"

echo ""
echo "→ $VAR_COUNT variables to import"
echo ""

if [ "$VAR_COUNT" -eq 0 ]; then
  echo "❌ No variables to import"
  exit 1
fi

# ─── Envoyer à Render ───
echo "→ Sending to Render API..."

RESPONSE=$(curl -s -w "\n%{http_code}" \
  -X PUT \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d "[$JSON_PARTS]" \
  "https://api.render.com/v1/services/$SERVICE_ID/env-vars")

HTTP_CODE=$(echo "$RESPONSE" | tail -1)
BODY=$(echo "$RESPONSE" | sed '$d')

echo ""
echo "================================================"

if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "202" ]; then
  echo "✅ SUCCESS - $VAR_COUNT variables imported to Render"
  echo ""
  echo "Next steps:"
  echo "  1. Render will auto-redeploy with new env vars"
  echo "  2. Check logs: https://dashboard.render.com/web/$SERVICE_ID/logs"
  echo "  3. Test health: curl https://VOTRE-APP.onrender.com/api/health"
  echo "  4. Visit: https://VOTRE-APP.onrender.com/setup"
else
  echo "❌ FAILED - HTTP $HTTP_CODE"
  echo ""
  echo "Response:"
  echo "$BODY" | head -20
  echo ""
  echo "Possible issues:"
  echo "  - Invalid API key"
  echo "  - Service ID doesn't match your account"
  echo "  - Variable names not allowed by Render"
fi

echo "================================================"
