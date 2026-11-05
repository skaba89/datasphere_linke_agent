# Validation MCP authentifiée — Claude Code et ChatGPT

## Objectif

Cette PR rend le parcours MCP **testable en CI** avec des utilisateurs Business isolés dans PostgreSQL de test. Elle n'établit pas encore une connexion réelle à Claude Code ou ChatGPT. Aucune clé DataSphere réelle n'est enregistrée dans Git.

## Contrôles automatiques

`tests/e2e/mcp-business-key.spec.ts` crée deux utilisateurs Business temporaires, deux clés API, et deux clients appartenant à des utilisateurs différents. Les requêtes passent par HTTP `/api/mcp` vers le serveur Next.js démarré par Playwright.

Les tests exigent :
- HTTP 401 sans clé ou avec clé révoquée.
- `initialize` et `tools/list` authentifiés.
- Présence de `create_post` ; absence d'outil `publish_post`.
- `tools/call create_post` retourne un brouillon en statut `pending`, enregistré dans la base du propriétaire, sans `linkedinPostId`.
- L'autre utilisateur ne peut pas lire ce brouillon via `get_post`.
- Un `clientId` étranger est rejeté sans enregistrement.

Les utilisateurs de test sont nettoyés ensuite. N'exécuter ce scénario **que sur une base de test isolée**, jamais sur la production.

## Essai manuel sur une instance de préproduction

1. Déployer DataSphere sur HTTPS avec une base de préproduction et un utilisateur Business de test.
2. Créer une clé API Business dédiée et stocker sa valeur dans un gestionnaire de secrets ; ne jamais la coller dans un commit, une PR ou une capture d'écran.
3. Tester `POST /api/mcp` avec `Authorization: Bearer <clé>`, `Content-Type: application/json` et `Accept: application/json, text/event-stream`.
4. Envoyer `initialize`, puis `tools/list`, puis `tools/call` avec `create_post` sur un contenu fictif. Vérifier dans l'application que le statut reste `pending`.
5. Connecter un client MCP réel Claude Code à cette **instance de préproduction**, selon la méthode d'authentification supportée par sa version installée. Confirmer le handshake et la liste des tools.
6. Pour ChatGPT, vérifier les exigences actuelles de connexion aux serveurs MCP personnalisés, notamment OAuth délégué et autorisations. DataSphere utilise actuellement une clé API Business ; **la compatibilité directe avec ChatGPT n'est pas démontrée** par les tests HTTP.

## Restrictions de sécurité

- Aucune publication automatique, message LinkedIn, prospection réelle ou accès Stripe dans la validation.
- Ne jamais utiliser de clés d'API en clair dans un fichier de configuration commité.
- Après l'essai, révoquer la clé API de préproduction.
- Ne pas confondre réussite Playwright (serveur) et validation de connexion (client Claude/ChatGPT).
- Les correctifs à venir sur OAuth délégué et scopes nécessitent une PR distincte et une revue de sécurité.
