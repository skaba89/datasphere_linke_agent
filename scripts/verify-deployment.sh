#!/bin/bash
# ============================================================
# DataSphere - Script de vérification post-déploiement
# À lancer en local pour vérifier que l'app est bien déployée
#
# Usage :
#   ./scripts/verify-deployment.sh https://VOTRE-APP.onrender.com
# ============================================================

set -e

APP_URL="${1:-http://localhost:10000}"

echo "================================================"
echo "  DataSphere - Vérification de déploiement"
echo "  URL: $APP_URL"
echo "================================================"
echo ""

# Couleurs
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

PASS=0
FAIL=0
WARN=0

check() {
  local name="$1"
  local cmd="$2"
  local expected="$3"

  echo -n "→ $name... "
  result=$(eval "$cmd" 2>&1)
  if echo "$result" | grep -q "$expected"; then
    echo -e "${GREEN}✅ PASS${NC}"
    PASS=$((PASS+1))
  else
    echo -e "${RED}❌ FAIL${NC}"
    echo "  Expected: $expected"
    echo "  Got: $result"
    FAIL=$((FAIL+1))
  fi
}

check_warn() {
  local name="$1"
  local cmd="$2"
  local expected="$3"

  echo -n "→ $name... "
  result=$(eval "$cmd" 2>&1)
  if echo "$result" | grep -q "$expected"; then
    echo -e "${GREEN}✅ PASS${NC}"
    PASS=$((PASS+1))
  else
    echo -e "${YELLOW}⚠️  WARN (optionnel)${NC}"
    WARN=$((WARN+1))
  fi
}

echo ""
echo "── Health & Status ──"
check "Health endpoint" "curl -fsSL $APP_URL/api/health" '"status":"ok"'
check "Database OK" "curl -fsSL $APP_URL/api/health" '"database":{"status":"ok"'
check "Migrations OK" "curl -fsSL $APP_URL/api/health" '"migrations":"OK"'

echo ""
echo "── Pages publiques ──"
check "Landing page (/)" "curl -fsSL -o /dev/null -w '%{http_code}' $APP_URL/" "200"
check "Pricing (/pricing)" "curl -fsSL -o /dev/null -w '%{http_code}' $APP_URL/pricing" "200"
check "Login (/login)" "curl -fsSL -o /dev/null -w '%{http_code}' $APP_URL/login" "200"
check "Register (/register)" "curl -fsSL -o /dev/null -w '%{http_code}' $APP_URL/register" "200"
check "Setup guide (/setup)" "curl -fsSL -o /dev/null -w '%{http_code}' $APP_URL/setup" "200"
check "Blog (/blog)" "curl -fsSL -o /dev/null -w '%{http_code}' $APP_URL/blog" "200"
check "Legal (/legal/terms)" "curl -fsSL -o /dev/null -w '%{http_code}' $APP_URL/legal/terms" "200"
check "Affiliate (/affiliate)" "curl -fsSL -o /dev/null -w '%{http_code}' $APP_URL/affiliate" "200"

echo ""
echo "── API publique ──"
check "API v1 doc" "curl -fsSL $APP_URL/api/v1" '"name":"DataSphere Public API"'
check "API v1 sans clé = 401" "curl -fsSL -o /dev/null -w '%{http_code}' $APP_URL/api/v1/posts" "401"

echo ""
echo "── Auth ──"
check "Me sans cookie = null" "curl -fsSL $APP_URL/api/auth/me" '"data":null'
check "Register sans email = 400" "curl -fsSL -o /dev/null -w '%{http_code}' -X POST $APP_URL/api/auth/register -H 'Content-Type: application/json' -d '{}'" "400"

echo ""
echo "── LinkedIn (protection) ──"
check "LinkedIn sans auth = 401" "curl -fsSL -o /dev/null -w '%{http_code}' $APP_URL/api/linkedin" "401"

echo ""
echo "── SEO ──"
check "robots.txt" "curl -fsSL $APP_URL/robots.txt" 'Sitemap:'
check "sitemap.xml" "curl -fsSL $APP_URL/sitemap.xml" '<urlset'

echo ""
echo "── Intégrations (optionnel) ──"
check_warn "LinkedIn OAuth configuré" "curl -fsSL $APP_URL/api/health" '"linkedin":{"configured":true'
check_warn "Stripe configuré" "curl -fsSL $APP_URL/api/health" '"stripe":{"configured":true'
check_warn "Resend configuré" "curl -fsSL $APP_URL/api/health" '"resend":{"configured":true'
check_warn "Sentry configuré" "curl -fsSL $APP_URL/api/health" '"sentry":{"configured":true'

echo ""
echo "================================================"
echo "  RÉSULTATS"
echo "================================================"
echo -e "  ${GREEN}✅ PASS: $PASS${NC}"
echo -e "  ${RED}❌ FAIL: $FAIL${NC}"
echo -e "  ${YELLOW}⚠️  WARN: $WARN (optionnel)${NC}"
echo ""

if [ $FAIL -gt 0 ]; then
  echo -e "${RED}❌ Déploiement incomplet : $FAIL test(s) ont échoué${NC}"
  echo "Consultez les logs Render et /api/health pour diagnostiquer."
  exit 1
else
  echo -e "${GREEN}✅ Déploiement validé !${NC}"
  echo ""
  echo "Prochaines étapes :"
  echo "  1. Créer un compte admin : POST /api/auth/register"
  echo "  2. Configurer LinkedIn OAuth (voir /setup)"
  echo "  3. Configurer Stripe (voir /setup)"
  echo "  4. Configurer les crons via cron-job.org (voir /setup)"
  exit 0
fi
