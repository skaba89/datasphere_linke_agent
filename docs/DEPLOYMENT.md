# DataSphere — Guide de Déploiement Render (Free Plan)

> Déployer DataSphere sur Render gratuitement, sans SSH, sans cron jobs natifs.

## 🎯 Vue d'ensemble

| Aspect | Free Plan Render |
|---|---|
| **Web service** | ✅ 750h/mois (spin down après 15 min d'inactivité) |
| **PostgreSQL** | ✅ 1GB, expire après 90 jours |
| **Cron jobs** | ❌ Non disponible → utiliser cron-job.org |
| **SSH** | ❌ Non disponible → debug via logs + `/api/health` |
| **Custom domains** | ❌ Non disponible |
| **Memory** | 512MB RAM |

## 📋 Prérequis

1. **Compte Render** : https://render.com (gratuit)
2. **Repo GitHub** : `skaba89/datasphere_linke_agent` (déjà créé)
3. **Comptes externes** (optionnel, pour aller plus loin) :
   - LinkedIn Developers : https://www.linkedin.com/developers/apps
   - Stripe : https://dashboard.stripe.com
   - Resend : https://resend.com (emails)
   - Sentry : https://sentry.io (monitoring)
   - cron-job.org : https://cron-job.org (crons gratuits)

## 🚀 Étapes de déploiement

### Étape 1 : Connecter le repo à Render

1. Allez sur https://dashboard.render.com
2. Cliquez **New +** → **Blueprint**
3. Sélectionnez le repo `skaba89/datasphere_linke_agent`
4. Render détecte automatiquement `render.yaml` et propose de créer :
   - 1 web service `datasphere` (Docker, free plan)
   - 1 PostgreSQL `datasphere-db` (free, 1GB)
5. Cliquez **Apply**
6. Le build démarre automatiquement (~5-10 min)

### Étape 2 : Variables d'environnement automatiques

Render injecte automatiquement :
- `DATABASE_URL` : depuis PostgreSQL (connString)
- `DATASPHERE_AUTH_SECRET` : généré aléatoirement
- `NEXT_PUBLIC_APP_URL` : votre URL Render (ex: `https://datasphere.onrender.com`)
- `CRON_SECRET` : généré aléatoirement

Vous n'avez rien à faire pour ces variables.

### Étape 3 : Attendre le 1er déploiement

- Build Docker : ~5 min
- npm install : ~1 min
- prisma generate : ~30s
- next build : ~1 min
- Démarrage runtime : ~30s
- Migrations Prisma : ~10s

Total : ~7-10 min pour le 1er déploiement.

**Surveillez les logs** Render jusqu'à voir :
```
[DataSphere] Migrations applied successfully
[DataSphere] Starting Next.js server on port 10000...
▲ Next.js 16.2.9
✓ Ready
```

### Étape 4 : Tester le health check

```bash
curl https://VOTRE-APP.onrender.com/api/health
```

Devrait retourner :
```json
{
  "status": "ok",
  "database": {
    "status": "ok",
    "migrations": "OK",
    "tableCount": { "users": 0 }
  },
  "envVars": {
    "DATABASE_URL": true,
    "DATASPHERE_AUTH_SECRET": true,
    "NEXT_PUBLIC_APP_URL": "https://datasphere.onrender.com",
    "PORT": "10000",
    "NODE_ENV": "production"
  },
  "integrations": {
    "linkedin": { "configured": false },
    "stripe": { "configured": false }
  }
}
```

Vous pouvez aussi visiter :
- `https://VOTRE-APP.onrender.com/setup` : guide interactif
- `https://VOTRE-APP.onrender.com/` : landing page
- `https://VOTRE-APP.onrender.com/register` : inscription

### Étape 5 (optionnelle) : LinkedIn OAuth

1. Créez une app sur https://www.linkedin.com/developers/apps
2. Ajoutez les produits :
   - **Sign In with LinkedIn using OpenID Connect**
   - **Share on LinkedIn**
3. Dans l'onglet **Auth**, ajoutez le redirect URI :
   ```
   https://VOTRE-APP.onrender.com/api/linkedin/callback
   ```
4. Récupérez **Client ID** et **Client Secret**
5. Dans Render dashboard → **Environment** → ajoutez :
   - `LINKEDIN_CLIENT_ID` = votre client ID
   - `LINKEDIN_CLIENT_SECRET` = votre client secret
   - `LINKEDIN_REDIRECT_URI` = `https://VOTRE-APP.onrender.com/api/linkedin/callback`
6. Render redéploie automatiquement

### Étape 6 (optionnelle) : Stripe

1. Créez un compte sur https://dashboard.stripe.com
2. Dans **Products**, créez 2 abonnements :
   - **Pro** : 29€/mois → récupérez le Price ID (`price_XXX`)
   - **Business** : 79€/mois → récupérez le Price ID
3. Dans **Developers → Webhooks**, ajoutez :
   - Endpoint : `https://VOTRE-APP.onrender.com/api/stripe/webhook`
   - Events : `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.paid`, `customer.subscription.trial_will_end`
   - Récupérez le **Signing secret** (`whsec_XXX`)
4. Dans Render → **Environment** → ajoutez :
   - `STRIPE_SECRET_KEY` = `sk_test_XXX` (ou `sk_live_XXX` en prod)
   - `STRIPE_WEBHOOK_SECRET` = `whsec_XXX`
   - `STRIPE_PRICE_PRO_MONTHLY` = `price_XXX`
   - `STRIPE_PRICE_BUSINESS_MONTHLY` = `price_YYY`

### Étape 7 (optionnelle) : Crons via cron-job.org

Le plan free Render ne supporte pas les crons. Utilisez **cron-job.org** (gratuit) :

1. Créez un compte sur https://cron-job.org
2. Pour chaque cron ci-dessous, créez un job avec :
   - **URL** : `https://VOTRE-APP.onrender.com/api/cron/ENDPOINT`
   - **Method** : GET
   - **Headers** : `Authorization: Bearer VOTRE_CRON_SECRET`
   - **Schedule** : voir tableau

| Endpoint | Schedule cron-job.org | Description |
|---|---|---|
| `/api/cron/sync-analytics` | `0 * * * *` (every hour) | Sync analytics LinkedIn |
| `/api/cron/scheduled-publish` | `0,30 * * * *` (every 30 min) | Publier les posts approuvés |
| `/api/cron/onboarding-emails` | `0 9 * * *` (9h UTC daily) | Emails onboarding |
| `/api/cron/payouts` | `0 10 1 * *` (1er du mois 10h) | Payouts affiliés |

Pour récupérer votre `CRON_SECRET` : Render dashboard → Environment → voir la valeur générée.

## 🐛 Debug sans SSH

### Problème : Service ne démarre pas

1. Vérifiez les logs Render (dashboard → service → Logs)
2. Cherchez les erreurs :
   - `MODULE_NOT_FOUND` → problème de deps (devrait être résolu avec `npm prune --production`)
   - `DATABASE_URL not set` → vérifier que la DB est liée au service
   - `Migration failed` → vérifier que PostgreSQL est démarré
3. Visitez `https://VOTRE-APP.onrender.com/api/health` pour diagnostiquer
4. Visitez `https://VOTRE-APP.onrender.com/setup` pour le guide interactif

### Problème : Service démarre mais `/api/health` retourne 503

- La DB n'est pas prête → attendez 1-2 min (le script `start.sh` retry automatiquement)
- Les migrations ont échoué → consultez les logs pour l'erreur exacte
- Le cold start Render peut prendre 30-60s (free plan)

### Problème : Cold start lent (30s+)

C'est normal sur le free plan :
- Render "endort" le service après 15 min d'inactivité
- Au 1er accès, le container redémarre (cold start)
- Solution : utilisez un cron-job.org qui ping `/api/health` toutes les 10 min pour garder le service "éveillé"

### Problème : PostgreSQL expire après 90 jours

Le free tier PostgreSQL Render expire après 90 jours. Solutions :
1. **Sauvegardez vos données** avant expiration (export SQL)
2. **Recréez une DB** free (nouvelle période de 90 jours)
3. **Upgrade vers paid plan** ($7/mois) pour une DB persistante

## 📊 Endpoints de vérification

| Endpoint | Description |
|---|---|
| `GET /api/health` | Diagnostics complets (DB, env vars, intégrations) |
| `GET /setup` | Guide interactif avec checks en temps réel |
| `GET /` | Landing page (doit charger) |
| `GET /register` | Page d'inscription (doit charger) |
| `GET /pricing` | Page tarifs |
| `GET /api/v1` | Documentation API publique |
| `GET /robots.txt` | SEO robots |
| `GET /sitemap.xml` | SEO sitemap |

## 🔐 Sécurité

### Variables sensibles à ne JAMAIS commit
- `.env` (déjà dans `.gitignore`)
- Tokens Stripe, LinkedIn, Resend, Sentry
- `DATASPHERE_AUTH_SECRET`

### Tokens GitHub
Si vous avez partagé un token GitHub dans le chat, **révoquez-le immédiatement** sur https://github.com/settings/tokens

## 💰 Passage au plan payant

Quand passer au plan payant Render ($7/mois) ?
- ✅ Vous avez des utilisateurs payants
- ✅ Vous avez besoin de crons natifs
- ✅ Vous voulez un service always-on (pas de cold start)
- ✅ Vous avez besoin de SSH pour debug
- ✅ Votre DB dépasse 1GB ou 90 jours

Pour upgrader : Render dashboard → service → Change Plan → Starter ($7/mois)

## ✅ Checklist finale

- [ ] Repo connecté à Render via Blueprint
- [ ] 1er déploiement réussi (logs montrent `✓ Ready`)
- [ ] `/api/health` retourne `status: ok`
- [ ] `/setup` accessible
- [ ] Landing page charge
- [ ] Inscription fonctionne (`POST /api/auth/register`)
- [ ] Login fonctionne (`POST /api/auth/login`)
- [ ] LinkedIn OAuth configuré (optionnel)
- [ ] Stripe configuré (optionnel)
- [ ] Crons configurés sur cron-job.org (optionnel)

Une fois tout coché, DataSphere est **live en production** ! 🎉
