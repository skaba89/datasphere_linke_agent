# DataSphere — Guide de migration Production Commerciale

Ce guide décrit les étapes pour passer de l'état actuel (démo fonctionnelle) à une production commerciale réelle.

## 🎯 État après cette mise à jour

### ✅ Corrections critiques effectuées
1. **PATCH /api/proposals** — handler manquant ajouté (les boutons "Approuver/Rejeter" du dashboard fonctionnent)
2. **Hash mot de passe** — `bcrypt` (cost 12) remplace `sha256` vulnérable
3. **Rate limiting login** — 5 tentatives max / 15 min / IP (anti brute-force)
4. **Validation email** — RFC simple + normalisation (lowercase + trim)
5. **Prisma migrate deploy** — exécuté au démarrage Docker (auto-création des tables)
6. **Dashboard sur vraies données** — stats calculées depuis `metrics`, user affiché dynamiquement
7. **Endpoint `/api/auth/me`** — le frontend hydrate l'auth au refresh
8. **Middleware de protection** — `/onboarding` redirige vers `/login` si non authentifié
9. **Prisma log désactivé en prod** — plus de spam ni de PII dans les logs
10. **`next.config.ts` propre** — `reactStrictMode: true`, `ignoreBuildErrors` supprimé
11. **`package.json:name`** = `datasphere` (était `nextjs_tailwind_shadcn_ts`)
12. **ESLint config** — `eslint.config.mjs` créé
13. **TypeScript errors** — 6 erreurs corrigées
14. **Anti-bypass status** — `POST /api/proposals` force `status='pending'` (un client ne peut pas créer un post déjà "published")

### 📦 Configuration Render
- `render.yaml` étendu : PostgreSQL managé + service web + disk uploads
- `DATABASE_URL` automatiquement injecté depuis la DB Render
- `DATASPHERE_AUTH_SECRET` auto-généré
- Healthcheck `/api/health`

---

## 🚀 Mise en production — Étapes

### Étape 1 : Pousser le code sur GitHub
```bash
cd /home/z/my-project/datasphere_linke_agent
git add -A
git commit -m "feat: production-hardening - bcrypt, rate-limit, middleware, real dashboard"
git push origin main
```

### Étape 2 : Connecter Render
1. Aller sur https://dashboard.render.com
2. **New+** → **Blueprint**
3. Sélectionner le repo `skaba89/datasphere_linke_agent`
4. Render détecte `render.yaml` et crée :
   - 1 web service `datasphere` (Docker, port 10000)
   - 1 PostgreSQL `datasphere-db` (plan free, 1GB)
5. Vérifier les env vars :
   - `DATABASE_URL` : auto depuis PostgreSQL
   - `DATASPHERE_AUTH_SECRET` : auto-généré
   - `DEMO_MODE` : `true` (pour démarrer)
6. Cliquer **Apply** et attendre le build (~3-5 min)

### Étape 3 : Vérifier le déploiement
```bash
# 1. Health check
curl https://VOTRE-APP.onrender.com/api/health
# → { status: "ok", database: "ok", demo: true }

# 2. Créer un compte
curl -X POST https://VOTRE-APP.onrender.com/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@datasphere.io","password":"Password123!","name":"Admin"}' \
  -c /tmp/cookies.txt

# 3. Tester le bug LinkedIn corrigé
curl -X POST https://VOTRE-APP.onrender.com/api/linkedin \
  -H "Content-Type: application/json" \
  -b /tmp/cookies.txt \
  -d '{"organizationId":"urn:li:person:test","displayName":"Test","accessToken":"tok1"}'

# 4. Vérifier que le dashboard fonctionne (PATCH)
curl -X PATCH https://VOTRE-APP.onrender.com/api/proposals \
  -H "Content-Type: application/json" \
  -b /tmp/cookies.txt \
  -d '{"id":"PROPOSAL_ID","status":"approved"}'
```

---

## 🔐 Mise en production commerciale réelle

### Étape 4 : Brancher OAuth LinkedIn réel
1. Créer une app sur https://www.linkedin.com/developers/apps
2. Ajouter les produits : "Sign In with LinkedIn using OpenID Connect" + "Share on LinkedIn"
3. Récupérer `Client ID` et `Client Secret`
4. Configurer le redirect URI : `https://VOTRE-APP.onrender.com/api/linkedin/callback`
5. Dans Render, set :
   - `LINKEDIN_CLIENT_ID` = votre client ID
   - `LINKEDIN_CLIENT_SECRET` = votre client secret
   - `LINKEDIN_REDIRECT_URI` = `https://VOTRE-APP.onrender.com/api/linkedin/callback`
   - `DEMO_MODE` = `false` ⚠️ important

### Étape 5 : Créer la route OAuth callback
À implémenter (prochaine itération) :
- `GET /api/linkedin/callback` — reçoit le code OAuth, l'échange contre un access token, crée le LinkedInAccount via `POST /api/linkedin` (upsert)

### Étape 6 : Intégrer Stripe pour la facturation
1. Créer un compte Stripe : https://dashboard.stripe.com
2. Récupérer `STRIPE_SECRET_KEY` et `STRIPE_WEBHOOK_SECRET`
3. Ajouter à Render env vars
4. Implémenter les routes :
   - `POST /api/stripe/checkout` — créer une session checkout
   - `POST /api/stripe/webhook` — recevoir les events (invoice.paid, subscription.deleted, etc.)
5. Brancher les boutons `/pricing` sur Stripe Checkout

### Étape 7 : Améliorer l'auth (optionnel)
La solution actuelle (cookie signé HMAC) est suffisante pour démarrer. Pour une prod robuste :
- Migrer vers `next-auth` (Credentials + Google + GitHub providers)
- Implémenter la vérification email (envoi d'email avec token)
- Ajouter le reset password (via email)

---

## 🗃️ Migration SQLite → PostgreSQL (optionnel si déjà sur Render)

Le `render.yaml` configure automatiquement PostgreSQL. Si vous étiez déjà en SQLite :

```bash
# 1. Exporter les données SQLite
npx prisma db pull   # synchronise le schéma
sqlite3 dev.sqlite .dump > backup.sql

# 2. Changer le provider dans schema.prisma
# provider = "postgresql"

# 3. Régénérer le client
npx prisma generate

# 4. Créer une nouvelle migration PostgreSQL
npx prisma migrate dev --name pg-init

# 5. Déployer
npx prisma migrate deploy
```

---

## ✅ Checklist finale production commerciale

### Sécurité
- [x] Hash mot de passe bcrypt (cost 12)
- [x] Rate limiting login (5/15min/IP)
- [x] Validation email RFC
- [x] Cookies httpOnly + secure + sameSite
- [x] Tokens LinkedIn jamais exposés au client
- [x] Anti-bypass status proposals
- [x] Middleware protection routes
- [ ] HTTPS forcé par Render (automatique)
- [ ] CSP headers (à ajouter dans next.config.ts)
- [ ] Audit OWASP Top 10 complet

### Fonctionnel
- [x] Auth register/login/logout
- [x] `/api/auth/me` pour hydrater le frontend
- [x] Dashboard sur vraies données (stats calculées)
- [x] PATCH /api/proposals fonctionne
- [x] LinkedIn upsert (bug P2002 corrigé)
- [x] Publish LinkedIn (avec DEMO_MODE)
- [ ] OAuth LinkedIn réel (étape 4)
- [ ] Stripe Checkout (étape 6)
- [ ] Reset password
- [ ] Email verification

### Déploiement
- [x] Dockerfile multi-stage optimisé
- [x] prisma migrate deploy au démarrage
- [x] render.yaml Blueprint complet (web + DB)
- [x] Healthcheck /api/health
- [x] Auto-deploy sur main
- [ ] Monitoring Sentry (à ajouter)
- [ ] Logs structurés (pino ou winston)
- [ ] Backups PostgreSQL automatiques (Render fournit)

### Qualité
- [x] ESLint config créé
- [x] TypeScript sans erreurs
- [x] next.config.ts propre (reactStrictMode, pas de ignoreBuildErrors)
- [x] package.json name correct
- [x] Prisma log désactivé en prod
- [ ] Tests Playwright E2E
- [ ] Tests unitaires Vitest
- [ ] CI/CD GitHub Actions

### Business
- [x] Landing page
- [x] Pricing (Free/Pro/Business)
- [x] Onboarding 3 étapes
- [x] Trial 14 jours auto
- [ ] Stripe billing actif
- [ ] Limites par plan appliquées (free=3 posts/day, pro=20, etc.)
- [ ] Webhook Stripe → update plan user
- [ ] Emails transactionnels (welcome, trial ending, etc.)
- [ ] CGU + Politique de confidentialité (pages dédiées)
- [ ] Mentions légales

---

## 🎯 Roadmap recommandée (semaines)

### Semaine 1 — Lancement beta
- Déployer sur Render (PostgreSQL)
- Tester tous les flux en démo
- Implémenter OAuth LinkedIn réel (étape 4-5)
- Désactiver DEMO_MODE

### Semaine 2 — Commercialisation
- Intégrer Stripe (étape 6)
- Pages CGU + Privacy
- Emails transactionnels (Resend ou SendGrid)
- Limites par plan appliquées

### Semaine 3 — Robustesse
- Tests Playwright
- Sentry monitoring
- next-auth + Google OAuth
- Reset password

### Semaine 4 — Croissance
- SEO (sitemap.xml, robots.txt)
- Blog intégré (pour SEO)
- Referral program
- Analytics produit (PostHog)
