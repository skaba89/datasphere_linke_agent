# Remettre en marche la génération IA sur le serveur

## Incident observé
`Tous les providers IA ont échoué. Dernière erreur: Configuration file not found or invalid. Please create .z-ai-config...`

Ce message provient du fallback `z-ai-web-dev-sdk`. Il ne prouve pas qu'une clé Z.ai est valide ou qu'un modèle fonctionne. Le SDK de développement ne peut pas servir de remplacement universel aux clés API de production.

## Configuration nécessaire
Configurer **une** des variables suivantes dans les secrets du service qui exécute DataSphere (et non dans le navigateur) :
- `GEMINI_API_KEY` — Google Gemini
- `ZAI_API_KEY` — Z.ai API internationale
- `GLM_API_KEY` — GLM API
- `GROQ_API_KEY` — Groq
- `OPENROUTER_API_KEY` — OpenRouter

Vérifier également le modèle et les quotas associés à la clé. Ne jamais ajouter la valeur d'une clé à GitHub, à la documentation, à une capture d'écran ou à un journal. Après changement, redéployer/redémarrer le service.

Le fallback SDK peut être utilisé **uniquement hors production** avec `ENABLE_ZAI_SDK_FALLBACK=true` et son fichier `.z-ai-config` correctement provisionné. Il n'est jamais automatiquement activé en production.

## Diagnostic
1. Vérifier `GET /api/health` sur le service : `ai.providers` affiche les intégrations détectées, **pas** leur fonctionnement réel.
2. Sans fournisseur configuré, `POST /api/proposals/generate` répond désormais 503, code `AI_NOT_CONFIGURED`, sans invoquer le SDK.
3. Avec un fournisseur configuré, effectuer un test réel sur un compte de test autorisé, vérifier la réponse de l'API, la création des trois propositions `pending` et leur apparition dans l'onglet Propositions.
4. Si les appels échouent, lire les logs serveur et vérifier DNS, restrictions réseau, erreurs 401/403/429 du fournisseur, disponibilité du modèle et crédits.
5. Confirmer que le service déployé correspond au dernier commit fusionné de `main`. Un commit GitHub n'implique pas à lui seul un déploiement.

## Portée
Le code améliore la précision des diagnostics et désactive une configuration trompeuse. Il ne crée **pas** de clé IA, de quota, de fournisseur ou de succès de génération artificiel.
