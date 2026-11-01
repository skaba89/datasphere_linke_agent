# DataSphere 360 — Audit Technique Complet

## 1. Vue d'ensemble

| Métrique | Valeur |
|---|---|
| **Nom du produit** | LinkedInPost (anciennement DataSphere) |
| **Stack** | Next.js 16 / React 19 / TypeScript / Prisma 6 / PostgreSQL |
| **UI** | Tailwind CSS 4 / shadcn/ui |
| **Routes API** | 64 |
| **Pages** | 17 |
| **Modules lib** | 26 |
| **Composants custom** | 7 (+ 48 shadcn/ui) |
| **Modèles Prisma** | 19 |
| **Migrations** | 9 |
| **Tests E2E** | 5 fichiers, 37 tests |
| **LOC total** | ~21 783 |
| **Déploiement** | Render (Docker, free plan) |
| **URL** | https://datasphere-sq19.onrender.com |
| **Repo** | https://github.com/skaba89/datasphere_linke_agent |

## 2. Architecture

### App Router Next.js 16
- Output: standalone (optimisé Docker)
- Build: `npx next build --webpack`
- Middleware: Edge runtime (Web Crypto API)
- SSG pour pages statiques (blog, legal, pricing)
- SSR pour pages dynamiques (dashboard, settings)

### Base de données
- PostgreSQL (Render managed, free tier 1GB)
- Prisma 6 avec 19 modèles
- 9 migrations SQL
- Chiffrement AES-256-GCM pour les tokens LinkedIn

### Authentification
- Cookie signé HMAC-SHA256 (format v2: `v2.{userId}.{expires}.{base64url-sig}`)
- bcrypt cost 12 pour les mots de passe
- 2FA TOTP (otplib + QR code)
- Rate limiting: login (5/15min), register (3/h prod)
- Middleware: Edge runtime, validation v1+v2

### Intégrations externes
- LinkedIn OAuth 2.0 (OpenID Connect: openid, profile, email, w_member_social)
- Stripe (Checkout, Webhooks, Portal)
- Resend (emails transactionnels)
- Sentry (monitoring)
- Telegram + WhatsApp (notifications)
- Multi-IA: Gemini / GLM / Groq / OpenRouter / z-ai-sdk

## 3. Sécurité

### ✅ Implémenté et validé
- Cookie httpOnly + secure + sameSite=lax
- HMAC-SHA256 pour sessions (format v2)
- bcrypt cost 12 pour passwords
- AES-256-GCM pour tokens LinkedIn
- Nonce atomique anti-rejeu (OAuth state)
- Rate limiting (login, register, AI, publish)
- Validation des entrées (email RFC, longueur password)
- Anti-bypass status (proposals forcées à 'pending')
- Idempotence Stripe webhooks (AutomationLog)
- Idempotence publication (status='published' check)
- Réservation atomique (status='publishing')
- Tokens jamais exposés au client (select sans accessToken)

### ⚠️ Points d'attention
- Rate limiting en mémoire (pas distribué → multi-instance: migrer Redis)
- Nonce OAuth en mémoire (même problème)
- Pas de rotation de clé de chiffrement automatique
- Pas de CSP headers configurés
- Pas d'audit log pour actions admin

## 4. CI/CD

### GitHub Actions
- **Lint + TypeCheck**: ✅ Passe (0 errors, 93 warnings)
- **Build**: ✅ Passe (npx next build --webpack)
- **E2E Tests**: ✅ 35 passent, quelques skips (rate limit / LinkedIn config)
- **npm install**: utilisé au lieu de npm ci (lock file sync issue avec @swc/helpers)

### Render
- Docker multi-stage (deps → builder → runner)
- prisma migrate deploy au démarrage (background, non-bloquant)
- Health check /api/health
- Auto-deploy sur push main
- Free plan (spin down 15min, pas de cron natif)

## 5. Inventaire fonctionnel

### Modules COMPLETS ET VALIDÉS
1. **Auth** (register, login, logout, me, 2FA)
2. **LinkedIn OAuth** (auth, callback, CRUD, active switcher)
3. **Posts/Proposals** (CRUD, generate IA, improve IA, seed, publish)
4. **CRM** (prospects CRUD, pipeline Kanban, séquences, messages)
5. **Dashboard** (stats, client performance, activité récente)
6. **Pricing** (3 plans, Stripe checkout, portal)
7. **Admin** (stats globales, gestion users)
8. **Affiliation** (codes, referrals, payouts)
9. **Notifications** (in-app bell, CRUD)
10. **Templates IA** (12 templates par industrie)
11. **Blog** (3 articles, SSG)
12. **Legal** (CGU, privacy, mentions légales)

### Modules IMPLÉMENTÉS MAIS NON TESTÉS en prod
1. **Stripe webhooks** (idempotence ajoutée, pas testé avec vrais events)
2. **LinkedIn publish** (API v2, retry + idempotence, pas testé avec vrai token)
3. **Scheduled publish** (cron, pas testé en prod sans cron-job.org)
4. **Sync analytics** (cron, pas testé en prod)
5. **Onboarding emails** (cron, Resend pas configuré en prod)
6. **Agent IA chat** (dépend du provider IA configuré)
7. **Mission Scout** (dépend du provider IA)
8. **Comment automation** (réponses IA, pas de source de commentaires réels)

### Modules PARTIELLEMENT IMPLÉMENTÉS
1. **CRM Séquences** (création OK, pas d'envoi automatique)
2. **Teams** (invitation OK, pas de permissions granulaires par client)
3. **Analytics LinkedIn** (sync OK, mais API LinkedIn ne fournit pas toutes les métriques)

### Modules NON FONCTIONNELS
1. **Email-to-LinkedIn bridge** (pas implémenté)
2. **Chrome extension** (pas implémentée)
3. **MCP Server** (pas implémenté)
4. **Revenue Attribution** (pas implémenté)
5. **AI Agent Workspace** (pas implémenté)

## 6. Risques identifiés

| Risque | Gravité | Statut | Correctif |
|---|---|---|---|
| Rate limiting non distribué | Moyen | Identifié | Migrer vers Redis |
| Nonce OAuth non distribué | Moyen | Identifié | Migrer vers Redis |
| Pas de CSP headers | Moyen | Identifié | Ajouter dans next.config.ts |
| Free plan Render (spin down) | Faible | Accepté | Upgrader quand revenus |
| PostgreSQL free (90j) | Faible | Identifié | Upgrader ou migrer |
| Pas de backup DB | Élevé | Identifié | Configurer Render backups |
| Gemini model dépréciation | Faible | Corrigé | Auto-discovery via ListModels |

## 7. Recommandations prioritaires

### P0 (immédiat)
- ✅ CI verte (ESLint + Build + E2E)
- ✅ OAuth session hardening
- ✅ Token encryption
- ✅ Publish reliability
- ⬜ Backup PostgreSQL automatique

### P1 (court terme)
- ⬜ Configurer LinkedIn OAuth app (redirect URI)
- ⬜ Configurer Stripe (products + webhook)
- ⬜ Configurer Resend (domaine vérifié)
- ⬜ Importer .env sur Render
- ⬜ Configurer cron-job.org

### P2 (moyen terme)
- ⬜ AI Personal Brand Studio
- ⬜ Content Quality Studio
- ⬜ Redis pour rate limiting distribué
- ⬜ Tests unitaires (Vitest)
- ⬜ Monitoring Sentry en prod

### P3 (long terme)
- ⬜ MCP Server
- ⬜ Chrome extension
- ⬜ Revenue Attribution
- ⬜ Multi-langue (i18n)
- ⬜ OVH Cloud migration
