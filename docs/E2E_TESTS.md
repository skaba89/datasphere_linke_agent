# DataSphere — Checklist Tests End-to-End (Production)

Cette checklist valide que l'app fonctionne en production. À exécuter après chaque déploiement Render.

## 1. Build & Démarrage

- [ ] `npx next build --webpack` réussit sans erreur
- [ ] `npm start` démarre le serveur sur le port 10000
- [ ] `GET /api/health` retourne `200 { status: "ok", database: "ok" }`
- [ ] Logs Render ne montrent aucune erreur fatale

## 2. Pages publiques

- [ ] `GET /` retourne 200 (landing page)
- [ ] `GET /pricing` retourne 200 (3 offres: Free/Pro/Business)
- [ ] `GET /login` retourne 200
- [ ] `GET /register` retourne 200
- [ ] `GET /onboarding` retourne 200

## 3. Authentification

- [ ] `POST /api/auth/register` avec email + password (8+ char) crée un user + cookie
- [ ] `POST /api/auth/register` avec email déjà existant retourne 409
- [ ] `POST /api/auth/register` avec password < 8 retourne 400
- [ ] `POST /api/auth/login` avec bons identifiants retourne 200 + cookie
- [ ] `POST /api/auth/login` avec mauvais identifiants retourne 401
- [ ] `POST /api/auth/logout` invalide le cookie
- [ ] Après logout, `GET /api/linkedin` retourne 401

## 4. LinkedIn — Le bug corrigé (⭐ critique)

- [ ] `POST /api/linkedin` (sans auth) retourne 401
- [ ] `POST /api/linkedin` avec `{ organizationId, displayName, accessToken }` crée un compte (status=active)
- [ ] `POST /api/linkedin` avec le même `organizationId` met à jour (upsert — pas d'erreur P2002)
- [ ] `GET /api/linkedin` retourne la liste sans exposer `accessToken`
- [ ] `PUT /api/linkedin/:id` met à jour (ex: status=disabled)
- [ ] `DELETE /api/linkedin/:id` met status=disabled (soft delete)
- [ ] ⭐ `POST /api/linkedin` APRES désactivation RÉACTIVE le compte (status=active) — c'est le fix du bug `create → upsert`
- [ ] `POST /api/linkedin/publish` publie sur LinkedIn (ou simule en DEMO_MODE)

## 5. Posts & Analytics

- [ ] `GET /api/proposals` retourne les posts de l'utilisateur
- [ ] `POST /api/proposals` crée une proposition
- [ ] `POST /api/proposals/seed` peuple avec 6 propositions de démo
- [ ] `GET /api/metrics` retourne 14 jours de métriques
- [ ] `GET /api/settings` retourne les settings (ou valeurs par défaut)
- [ ] `PUT /api/settings` met à jour les settings

## 6. Onboarding client

- [ ] Step 1 (Profil) : sauvegarde les settings
- [ ] Step 2 (LinkedIn) : connexion (mode démo ou OAuth réel)
- [ ] Step 3 (Premier post) : génère un post via l'API

## 7. Sécurité

- [ ] Cookies `httpOnly`, `secure` en prod, `sameSite=lax`
- [ ] Tokens LinkedIn jamais exposés au client (select sans `accessToken`)
- [ ] Tokens invalidés sur DELETE (soft delete)
- [ ] Status automatique `expired`/`revoked` quand l'API LinkedIn retourne 401/403

## 8. Render — Déploiement

- [ ] `render.yaml` détecté (Blueprint)
- [ ] Build Docker réussit (env vars chargées)
- [ ] `prisma generate` s'exécute (via `postinstall`)
- [ ] `prisma db push` ou `migrate deploy` s'exécute au premier déploiement
- [ ] Health check `/api/health` passe (Render marque le service healthy)
- [ ] HTTPS actif (Render fournit le certificat)
- [ ] Auto-deploy activé sur `main`

## 9. Performance

- [ ] TTFB < 500ms sur pages statiques
- [ ] `GET /api/health` < 100ms
- [ ] Pas de memory leak (mémoire < 512MB après 1h)
- [ ] Pas de fuite de connexions Prisma (singleton global)

## 10. Bugs connus à surveiller

- ⚠️ **SQLite sur Render** : utiliser un disque persistant (`disk:` dans render.yaml) ou migrer vers PostgreSQL. Sans ça, la DB est perdue à chaque redeploy.
- ⚠️ **OAuth LinkedIn** : en mode démo (`DEMO_MODE=true`), la publication est simulée. Pour la prod, brancher un vrai LinkedIn App.
- ⚠️ **Trial 14 jours** : les utilisateurs en trial peuvent tout faire — implémenter le downgrade après expiration.

## Commandes de test rapide

```bash
# Health check
curl https://your-app.onrender.com/api/health

# Register
curl -X POST https://your-app.onrender.com/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"password123"}' \
  -c /tmp/cookies.txt

# Test du bug corrigé (upsert)
curl -X POST https://your-app.onrender.com/api/linkedin \
  -H "Content-Type: application/json" \
  -b /tmp/cookies.txt \
  -d '{"organizationId":"urn:li:person:test","displayName":"Test","accessToken":"tok1"}'
# → Doit retourner 201 avec status=active

# Désactive
ID=$(curl -s https://your-app.onrender.com/api/linkedin -b /tmp/cookies.txt | jq -r '.data[0].id')
curl -X DELETE https://your-app.onrender.com/api/linkedin/$ID -b /tmp/cookies.txt

# Réactive (LE TEST CRITIQUE)
curl -X POST https://your-app.onrender.com/api/linkedin \
  -H "Content-Type: application/json" \
  -b /tmp/cookies.txt \
  -d '{"organizationId":"urn:li:person:test","displayName":"Test réactivé","accessToken":"tok2"}'
# → Doit retourner 201 (ou 200) avec status=active, sans erreur P2002
```
