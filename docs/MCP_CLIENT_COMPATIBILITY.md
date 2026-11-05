# DataSphere MCP — état de compatibilité et validation

Ce changement est une étape de durcissement du transport HTTP MCP, pas une preuve de compatibilité universelle. Le serveur utilise un JSON-RPC stateless sur POST, avec réponses JSON, sans sessions HTTP et sans flux SSE serveur. L'endpoint GET indique HTTP 405.

## Contrat
- Endpoint: `POST /api/mcp` sur HTTPS, `Authorization: Bearer <clé Business DataSphere>`.
- Versions annoncées : `2025-11-25` et `2025-03-26`. Le `initialize` annonce `2025-11-25`.
- Corps : une requête JSON-RPC par POST, jamais de batch.
- `Content-Type: application/json`; `Accept: application/json, text/event-stream` recommandé.
- `Origin` absent (client non navigateur) ou égal à l'origine du service. Les origines tierces sont refusées.
- Notifications : HTTP 202 sans corps. Pas de sessions ni SSE serveur.

## Tests préproduction
1. Démarrer une instance de test avec DB isolée et clé API Business de test.
2. Vérifier 401 sans token, 403 origine interdite, 400 protocole invalide, 405 sur GET.
3. Vérifier `initialize`, `tools/list` et `tools/call` avec un compte de test.
4. Vérifier l'isolation entre deux comptes et les outils `create_post` (brouillon `pending` uniquement).
5. Tester Claude Code sur l'URL HTTPS distante avec une méthode d'authentification prise en charge par son client.
6. Tester la découverte depuis ChatGPT uniquement si les paramètres du compte autorisent un serveur MCP personnalisé. La configuration et l'authentification d'une application personnalisée peuvent exiger OAuth ou une méthode de connexion propre au client. Une clé API DataSphere ne démontre pas cette compatibilité.

## Points restant ouverts
- Tester l'interopérabilité réelle avec les SDK/client MCP visés.
- Vérifier le transport le plus récent (notamment les nouvelles exigences de métadonnées des versions postérieures à 2025-11-25) avant de l'annoncer.
- Ajouter OAuth 2.0 pour l'accès tiers délégué, découverte de ressources et scopes granulaires si requis par ChatGPT.
- Tester les réponses aux appels erronés, la limitation de débit et les journaux d'audit sur la préproduction.
- Les Skills Claude Code de `.claude/skills/` et les instructions ChatGPT restent indépendants de la connexion MCP.

Aucun token réel, aucune publication LinkedIn ni aucun paiement ne doivent être employés pour les tests CI.
