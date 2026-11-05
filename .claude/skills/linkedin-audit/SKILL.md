---
name: linkedin-audit
description: Auditer les modules DataSphere LinkedIn avec preuves, tests et priorités sans confondre implémentation et fonctionnement en production.
---
# LinkedIn Audit — DataSphere

## Méthode
1. Lire `README.md`, `docs/FUNCTIONAL_INVENTORY.md`, `docs/PRODUCTION_READINESS.md` et `docs/AI_AGENT_INTEGRATION.md`.
2. Inventorier les routes `src/app/api`, bibliothèques `src/lib`, modèles/migrations Prisma, tests unitaires et E2E, configurations GitHub Actions.
3. Pour chaque fonction, indiquer : présente dans le code / testée automatiquement / vérifiée en production / manquante. Ne jamais transformer la présence d'une route ou une assertion documentaire en succès de production.
4. Rechercher les risques OAuth, sessions, chiffrement, contrôle d'accès par tenant, CSRF, webhooks, limites de débit, opérations idempotentes et permissions de publication.
5. Exécuter si possible `npm test`, `npm run lint`, `npx tsc --noEmit`, `npm run build`, `npm run test:e2e` avec une base isolée de test. Rapporter les commandes réellement exécutées, erreurs et raisons des skips.
6. Produire un tableau P0/P1/P2, preuve (chemin et comportement), reproduction, correctif envisagé et test de non-régression.

## Garde-fous
Ne jamais afficher de secret ni lancer de vrais posts, paiements, messages ou campagnes. Pas de fusion automatique. Créer une branche `feature/` et une PR indépendante pour chaque correction fonctionnelle.
