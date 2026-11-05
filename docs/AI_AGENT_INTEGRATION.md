# Audit ciblé et intégration des agents Claude Code / ChatGPT

Date : 2026-11-05 — dépôt `skaba89/datasphere_linke_agent`, branche de référence `main`.

## Périmètre et méthode
Revue statique de l'arborescence GitHub (489 entrées au moment de l'inspection) et lecture ciblée de `package.json`, `docs/AUDIT_COMPLET.md`, `docs/FUNCTIONAL_INVENTORY.md`, `docs/PRODUCTION_READINESS.md`, `docs/SECURITY_AUDIT.md`, `src/lib/linkedin-oauth-state.ts`, `src/lib/linkedin-token-crypto.ts`, `src/app/api/linkedin/callback/route.ts`, `src/app/api/linkedin/publish/route.ts`, `src/app/api/mcp/route.ts`, `src/lib/mcp-tools.ts`, `.github/workflows/ci.yml`. Ce n'est pas une revue ligne à ligne des 489 entrées ni un test fonctionnel de production. Aucun secret ou compte LinkedIn réel n'a été utilisé.

## Modules présents dans les sources
- Auth/session/2FA, comptes LinkedIn/OAuth, propositions et publication, planification cron, analytics et performance intelligence.
- CRM (prospects, messages, séquences, scoring), équipes, clients/agence, Stripe, affiliation et notifications.
- Agent Workspace, Hermes, Scout, Brand Studio, Content Quality, API MCP et extension Chrome.
- Tests Vitest et Playwright présents ; workflow CI avec qualité, build, unitaires et E2E.

## Partiel ou non vérifié
- Publication et OAuth LinkedIn réels : exécution avec compte et permissions LinkedIn non vérifiée.
- Crons externes, synchronisation analytics, Stripe Webhooks, Resend, Sentry, sauvegardes/restaurations : état de production non démontré par le code seul.
- Serveur MCP : `/api/mcp` implémente des appels JSON-RPC et 9 outils, mais son interopérabilité avec les transports et exigences d'authentification propres à Claude Code et ChatGPT doit être testée.
- Certaines documentations historiques sont désynchronisées : `AUDIT_COMPLET.md` marque MCP, extension et Workspace absents alors que le code correspondant existe.
- Aucune configuration de Skills Claude Code ni instruction ChatGPT spécifique au dépôt n'était présente dans l'arborescence inspectée avant cette branche.

## Risques concrets à corriger dans des PR ultérieures
**P0/P1 — contrôle d'accès multi-tenant** : dans `src/lib/mcp-tools.ts`, `create_post` transmet directement `args.clientId` à Prisma sans vérifier explicitement l'appartenance de ce client au `userId`. Examiner les contraintes DB et ajouter une validation d'ownership avant création, avec test de non-régression inter-utilisateurs.

**P1 — OAuth anti-rejeu distribué** : `src/lib/linkedin-oauth-state.ts` stocke les nonces consommés dans une `Map` locale. En plusieurs processus/instances, le même state peut être consommé sur deux instances. Prévoir persistance atomique TTL partagée (Redis ou DB), test multi-instance.

**P1 — réponse d'erreur et logs externes** : vérifier la suppression des messages bruts des fournisseurs sur `src/app/api/linkedin/callback/route.ts` et éviter le renvoi de `error.message` non filtré sur `src/app/api/linkedin/publish/route.ts`.

**P1 — revue de posture** : vérifier rate limiter in-memory, session révocable, CSRF, en-têtes CSP/HSTS, rotation des clés, backups et restauration, selon `docs/SECURITY_AUDIT.md`. Ne pas présumer que tous restent ouverts sans relire les fichiers concernés.

## Intégration des assistants
- Claude Code : Skills projet dans `.claude/skills/linkedin-editorial/SKILL.md` et `.claude/skills/linkedin-audit/SKILL.md`.
- ChatGPT : instructions réutilisables dans `docs/CHATGPT_LINKEDIN_INSTRUCTIONS.md`.
- Pour un accès connecté via MCP, prévoir test de transport, authentification, version protocole, `tools/list`, `tools/call`, permissions et audit. Débuter en lecture et brouillons `pending`; publication avec validation humaine seulement.
- Aucun changement au runtime ni aux API de production dans cette PR.

## Plan de validation
1. Validation statique : Skills présents, frontmatter `name`/`description`, instructions ChatGPT et absence de secrets.
2. Exécuter la CI GitHub Actions de la PR et consigner les résultats réels.
3. Scénarios manuels Claude Code : trois angles, brouillon FR, audit priorisé, absence de publication.
4. Scénarios ChatGPT : même brief et mêmes garde-fous, sans accès implicite aux API.
5. PR de sécurité séparée pour l'ownership `clientId` et les risques OAuth, avec tests unitaires/E2E.

## Critères d'acceptation
- Skills détectables dans Claude Code au niveau du projet.
- ChatGPT reçoit des instructions exploitables, sans prétendre disposer d'un connecteur non configuré.
- Aucune publication automatique, aucun accès aux tokens et aucune régression métier.
- Fusion uniquement après CI verte et revue humaine.
