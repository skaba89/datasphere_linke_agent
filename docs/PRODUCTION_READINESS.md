# DataSphere 360 — Production Readiness Checklist

## Statut actuel : ⚠️ BÊTA — Prêt pour tests internes, pas pour production commerciale

## Critères de commercialisation

| Critère | Statut | Preuve | Action requise |
|---|---|---|---|
| CI entièrement verte | ✅ | 4/4 jobs passent (lint, build, unit, E2E) | — |
| Sécurité critique validée | ✅ | P0 fixes (PR #16): 2FA bypass, AI timeout, CRM status | P1: Redis rate limiter, CSRF |
| Publication LinkedIn testée | ⚠️ | Code idempotent + retry + X-Restli-Key | Test réel avec token LinkedIn requis |
| Absence de doublons démontrée | ✅ | Dédup 3-clé sur POST + import (email, URL, name+company) | — |
| Automatisations fiables | ✅ | Hermes 6 steps + cron recovery + stuck-publishing | Test en prod avec cron-job.org |
| Stripe validé bout en bout | ⚠️ | Webhooks idempotents, plan gating, portal | Test Stripe Test Mode requis |
| Isolation clients vérifiée | ✅ | userId sur toutes les queries + ownership checks | — |
| Sauvegardes et restauration | ⚠️ | Script backup-db.sh existe | cron-job.org à configurer + test restauration |
| Monitoring actif | ⚠️ | Sentry configuré (no-op sans DSN) | Définir SENTRY_DSN sur Render |
| Parcours E2E validés | ✅ | 162+ tests E2E (15 fichiers) | — |
| Documentation utilisateur | ❌ | Docs technique existe, pas de guide utilisateur | À créer |
| Tests de préproduction | ⚠️ | Render free tier actif | Test avec vraies clés API |
| Validation du propriétaire | ❌ | En attente | À valider |

## Configuration production requise

### Variables d'environnement (Render)

#### Obligatoires
```
DATABASE_URL=<Render PostgreSQL>
JWT_SECRET=<openssl rand -hex 32>
LINKEDIN_TOKEN_ENCRYPTION_KEY=<openssl rand -base64 32>
```

#### IA (au moins une)
```
GEMINI_API_KEY=<https://aistudio.google.com/apikey>
GLM_API_KEY=<https://open.bigmodel.cn/usercenter/apikeys>
ZAI_API_KEY=<https://chat.z.ai>
GROQ_API_KEY=<https://console.groq.com/keys>
OPENROUTER_API_KEY=<https://openrouter.ai/keys>
```

#### LinkedIn OAuth
```
LINKEDIN_CLIENT_ID=<https://www.linkedin.com/developers/apps/new>
LINKEDIN_CLIENT_SECRET=<same app>
```

#### Stripe
```
STRIPE_SECRET_KEY=<https://dashboard.stripe.com/apikeys>
STRIPE_WEBHOOK_SECRET=<Stripe webhook endpoint>
STRIPE_PRICE_PRO_MONTHLY=<price_xxx>
STRIPE_PRICE_BUSINESS_MONTHLY=<price_xxx>
```

#### Optionnelles mais recommandées
```
RESEND_API_KEY=<https://resend.com/api-keys>
SENTRY_DSN=<https://sentry.io>
EMAIL_FROM=DataSphere <noreply@yourdomain.com>
```

### Cron jobs (cron-job.org)

| Cron | URL | Fréquence | Secret |
|---|---|---|---|
| Scheduled publish | `/api/cron/scheduled-publish` | 5 min | Bearer CRON_SECRET |
| Sync analytics | `/api/cron/sync-analytics` | 1h | Bearer CRON_SECRET |
| Automation | `/api/cron/automation` | 1h | Bearer CRON_SECRET |
| Hermes | `/api/cron/hermes` | 1h | Bearer CRON_SECRET |
| Token expiration | `/api/cron/check-token-expiration` | 24h | Bearer CRON_SECRET |
| Stuck recovery | `/api/cron/recover-stuck-publishing` | 30 min | Bearer CRON_SECRET |
| Onboarding emails | `/api/cron/onboarding-emails` | 1h | Bearer CRON_SECRET |
| DB backup | `scripts/backup-db.sh` | 24h | — |

## Risques connus

| Risque | Sévérité | Mitigation | Statut |
|---|---|---|---|
| Rate limiter in-memory (perdu au restart) | Moyen | Migrer vers Upstash Redis | P1 |
| OAuth nonce in-memory | Moyen | Migrer vers Redis SETNX | P1 |
| Pas de CSRF token | Moyen | sameSite=lax + Origin check | P1 |
| Render free tier (spin down 15min) | Faible | Upgrade Render ou warming ping | Accepté |
| PostgreSQL free (expire 90j) | Élevé | Upgrade ou migrer | P1 |
| Pas de backup automatique | Élevé | Configurer cron backup-db.sh | P1 |
| LinkedIn views toujours 0 (personal) | Faible | UI affiche "non disponible" | Accepté |
| Chrome ext URL hardcodée | Moyen | host_permissions dynamique | P1 |

## Procédure de rollback

1. Sur Render → Settings → Manual Deploy → choisir le commit précédent
2. Vérifier `/api/health` retourne 200
3. Si DB migration problématique : `prisma migrate resolve --rolled-back <migration_name>`
4. Notifier les utilisateurs via notification in-app

## Checklist pré-déploiement

- [ ] Toutes les variables d'environnement sont configurées
- [ ] `DATABASE_URL` pointe vers une DB PostgreSQL accessible
- [ ] Au moins une clé API IA est configurée
- [ ] LinkedIn OAuth app configurée avec redirect URI correct
- [ ] Stripe products créés (Pro + Business)
- [ ] Stripe webhook endpoint configuré
- [ ] cron-job.org jobs créés (8 crons)
- [ ] `LINKEDIN_TOKEN_ENCRYPTION_KEY` généré (32 bytes base64)
- [ ] `JWT_SECRET` généré (min 32 chars)
- [ ] Sentry DSN configuré (optionnel mais recommandé)
- [ ] Test: inscription → login → génération post → publication
- [ ] Test: Stripe checkout en mode test
- [ ] Test: Hermes run manuel
- [ ] Backup DB testé
