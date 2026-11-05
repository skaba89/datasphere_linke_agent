# Incident : bouton « Générer de nouvelles propositions » — diagnostic

## Symptômes
Le bouton affiche un spinner mais aucun nouveau brouillon n'apparaît. Un symptôme visuel seul ne démontre pas que le fournisseur IA est indisponible.

## Parcours inspecté
- `src/app/page.tsx` : le bouton appelle `handleGenerateProposals`, qui envoie `POST /api/proposals/generate`.
- `src/app/api/proposals/generate/route.ts` : contrôle session, plan, quota, paramètres puis appelle `generateLinkedInPosts`.
- `src/lib/ai.ts` : demande une réponse JSON et extrait les posts.
- `src/lib/ai-providers.ts` : peut tester plusieurs fournisseurs et modèles de façon séquentielle. Une seule tentative HTTP a un timeout, mais l'ensemble du parcours n'avait pas de borne globale.

## Correctif apporté
- Borne globale de 45 secondes pour attendre les fournisseurs IA avant enregistrement des propositions. Réponse HTTP 504 avec `code=AI_TIMEOUT` en cas de dépassement.
- Borne de 55 secondes dans le navigateur pour les proxys ou les connexions bloquées.
- Indicateur de chargement toujours réinitialisé ; message d'erreur persistant visible sous le bouton.
- Tests unitaires du succès, de l'erreur fournisseur et du timeout. Aucun faux post n'est généré.

## Validation de production encore nécessaire
1. Examiner la réponse HTTP de `POST /api/proposals/generate` dans les outils réseau du navigateur (statut et champ `error`).
2. Vérifier les variables d'environnement et les quotas des fournisseurs IA réellement configurés sur l'hébergeur : `ZAI_API_KEY`, `GEMINI_API_KEY`, `GLM_API_KEY`, `GROQ_API_KEY`, `OPENROUTER_API_KEY`. Ne jamais envoyer les clés au support ou les enregistrer dans Git.
3. Vérifier les logs serveur et les restrictions de durée de requête de l'hébergeur. Si la plateforme coupe les requêtes avant 45 secondes, ce timeout applicatif devra être inférieur à sa limite.
4. Tester une génération réelle de trois brouillons avec un fournisseur actif, puis vérifier leur état `pending` en base et leur apparition dans l'interface.
5. Vérifier les réponses 401 (session), 402 (abonnement/quota), 429 (rate limit), 500 (erreur fournisseur) et 504 (délai dépassé).
6. Contrôler que les posts ne sont jamais publiés sans validation humaine.

Cette PR améliore la tolérance aux échecs et la visibilité des problèmes. Elle ne prouve pas qu'un fournisseur IA ou ses clés fonctionnent sur l'instance de production.
