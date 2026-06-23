#!/bin/bash
# ============================================================
# Script pour pousser le code DataSphere sur GitHub
# À exécuter localement avec un token GitHub valide
# ============================================================
set -e

REPO_URL="https://github.com/skaba89/datasphere_linke_agent.git"
BRANCH="main"

# Demander le token (ou utiliser GIT_TOKEN env var)
if [ -z "$GIT_TOKEN" ]; then
  echo "⚠️  Le token fourni dans le chat (ghp_...) est expiré/invalide."
  echo "   Créez un nouveau token: https://github.com/settings/tokens (scope: repo)"
  read -s -p "Entrez votre nouveau token GitHub (ghp_...): " GIT_TOKEN
  echo ""
fi

# Config remote avec token
git remote set-url origin "https://skaba89:${GIT_TOKEN}@github.com/skaba89/datasphere_linke_agent.git"

echo "→ Push en cours sur ${BRANCH}..."
git push origin "${BRANCH}"

echo ""
echo "✅ Push réussi !"
echo "   Vérifiez: https://github.com/skaba89/datasphere_linke_agent"
echo ""
echo "→ Prochaine étape: connectez ce repo à Render (https://render.com)"
echo "   Render détectera automatiquement render.yaml"

# Nettoyer l'URL du remote (sécurité)
git remote set-url origin "${REPO_URL}"
