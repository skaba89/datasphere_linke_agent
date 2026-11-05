# Audit de sécurité ciblé — Propositions LinkedIn (5 novembre 2026)

## Source et portée
Audit statique du code `src/app/api/proposals/route.ts` et `src/app/api/proposals/seed/route.ts` sur `main`, suivi de correctifs ciblés et de tests E2E. Ce document n'affirme pas que l'ensemble de la surface d'attaque du SaaS a été audité.

## Vulnérabilités confirmées dans le code précédent
- `GET /api/proposals` construisait `where = {}` en l'absence d'utilisateur : lecture inter-comptes possible au niveau de la route.
- `POST /api/proposals` autorisait `userId = null` : création anonyme de brouillons.
- `POST /api/proposals/seed` construisait `where = {}` sans utilisateur et supprimait les propositions ainsi trouvées : risque critique de perte de données inter-comptes. La route de démonstration demeure destructive **pour le compte connecté** ; son exposition en production devra faire l'objet d'une revue dédiée.
- La résolution d'un curseur utilisait un identifiant de proposition sans vérifier son propriétaire : elle vérifie désormais `id + userId`.

## Correctifs apportés
- Toutes les lectures et créations sur `/api/proposals` exigent un utilisateur authentifié.
- Les listes sont toujours limitées au `userId` authentifié, y compris lorsque la pagination est utilisée.
- Les données de démo ne peuvent être remplacées que pour l'utilisateur authentifié, avec une condition `id + userId` à la suppression.
- Test Playwright de deux comptes, isolation des listes, refus sans session et préservation des données du compte B après l'import de démo du compte A.

## Vérifications nécessaires
- `npm run lint`, `npm run build`, `npm run test` ou le workflow CI habituel et toute la suite Playwright.
- Test manuel de migration depuis une session existante.
- Revue des autres routes API pour tout `where: {}`, filtrage facultatif du `userId`, `userId: null`, `deleteMany`, ou action destructrice de seed.
- Décider si la route de seed doit être désactivée en production, limitée à l'environnement de démonstration, ou nécessiter confirmation explicite. **Cette PR ne prétend pas couvrir cette décision produit.**

## Prudence
La réussite de CI ne prouve ni l'absence d'autres vulnérabilités ni une conformité réglementaire ; aucun test n'a été réalisé sur des données de production.
