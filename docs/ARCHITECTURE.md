# DataSphere (LinkedInPost) — Architecture Technique

## Vue d'ensemble

| Métrique | Valeur |
|---|---|
| **Stack** | Next.js 16 / React 19 / TypeScript / Prisma 6 / PostgreSQL |
| **UI** | Tailwind CSS 4 / shadcn/ui / Framer Motion |
| **Routes API** | 75+ |
| **Pages** | 20+ |
| **Modèles Prisma** | 21 |
| **Migrations** | 11 |
| **Tests E2E** | 7 fichiers, 70+ tests |
| **Déploiement** | Render (Docker, free plan) |
| **URL** | https://datasphere-sq19.onrender.com |
| **Repo** | https://github.com/skaba89/datasphere_linke_agent |

## 1. Architecture applicative

```
┌─────────────────────────────────────────────────────┐
│                    Client (Browser)                   │
│  ┌──────────┐  ┌──────────┐  ┌───────────────────┐  │
│  │ Dashboard │  │ Settings │  │ Chrome Extension  │  │
│  │ (17 tabs)│  │ /team    │  │ (Comment Capture) │  │
│  └─────┬────┘  └────┬─────┘  └────────┬──────────┘  │
│        │             │                  │              │
│        └─────────┬───┘                  │              │
│                  │                      │              │
│         Cookie session (HMAC-SHA256)    │              │
│                  │                      │              │
└──────────────────┼──────────────────────┼──────────────┘
                   │                      │
                   ▼                      ▼
┌─────────────────────────────────────────────────────┐
│              Next.js 16 (App Router)                   │
│                                                        │
│  ┌─────────────┐  ┌─────────────┐  ┌──────────────┐  │
│  │  Middleware  │  │  API Routes │  │  MCP Server  │  │
│  │ (Edge, auth) │  │  (75+ routes)│  │  (JSON-RPC)  │  │
│  └──────┬──────┘  └──────┬──────┘  └──────┬───────┘  │
│         │                │                 │           │
│         └────────────────┼─────────────────┘           │
│                          │                             │
│  ┌───────────┐  ┌───────┴───────┐  ┌──────────────┐  │
│  │ AI Multi-  │  │  Lib Services │  │  Prisma ORM  │  │
│  │ Provider   │  │  (auth, teams,│  │  (21 models) │  │
│  │ (5 LLMs)   │  │  automation…) │  └──────┬───────┘  │
│  └─────┬─────┘  └───────────────┘         │           │
│        │                                    │           │
└────────┼────────────────────────────────────┼──────────┘
         │                                    │
         ▼                                    ▼
┌─────────────────┐              ┌──────────────────────┐
│  External APIs   │              │   PostgreSQL (Render) │
│  ┌───────────┐   │              │                      │
│  │  Gemini   │   │              │  21 tables:          │
│  │  GLM      │   │              │  User, Client,       │
│  │  Groq     │   │              │  Prospect, PostProposal│
│  │OpenRouter │   │              │  Team, TeamMember,   │
│  │  z-ai SDK │   │              │  ClientAssignment,   │
│  └───────────┘   │              │  RevenueAttribution, │
│  ┌───────────┐   │              │  AgentTask,          │
│  │ LinkedIn  │   │              │  AgentMemory,        │
│  │  OAuth    │   │              │  EngagementMetric…   │
│  └───────────┘   │              └──────────────────────┘
│  ┌───────────┐   │
│  │  Stripe   │   │
│  └───────────┘   │
│  ┌───────────┐   │
│  │  Resend   │   │
│  └───────────┘   │
└─────────────────┘
```

## 2. Modules Prisma (21 modèles)

### Core
- **User** — Compte utilisateur (email, passwordHash, plan, role, 2FA, Stripe, affiliation)
- **Account** — OAuth accounts (NextAuth-compatible, non utilisé actuellement)
- **LinkedInAccount** — Comptes LinkedIn connectés (tokens AES-256-GCM chiffrés)

### Content
- **PostProposal** — Posts LinkedIn (générés par IA, approuvés, publiés)
- **EngagementMetric** — Métriques quotidiennes (likes, comments, shares, views)
- **SmartPosterSettings** — Configuration auto-publication par user

### CRM
- **Prospect** — Prospects CRM (stage: new → contacted → replied → meeting → won/lost)
- **CrmSequence** — Séquences de messages automatisés (steps en JSON)
- **CrmMessage** — Messages CRM (draft, sent, replied, bounced)
- **CommentReply** — Commentaires capturés + réponses IA générées

### Agency
- **Client** — Clients d'agence (linkedinAccountId, monthlyGoal)
- **ClientAssignment** — Permissions par client (view/edit/manage) pour TeamMember

### Teams
- **Team** — Équipe (owner, plan Business)
- **TeamMember** — Membres (role: owner/admin/member)
- **TeamInvitation** — Invitations par email (token signé, TTL 7j)

### AI Agent
- **AgentTask** — Tâches de l'agent IA (todo/in_progress/done/blocked)
- **AgentMemory** — Mémoire à long terme (key/value, category)

### Revenue
- **RevenueAttribution** — Revenu par client/prospect (amountCents, source)

### System
- **Notification** — Notifications in-app (bell)
- **ApiKey** — Clés API publiques (bcrypt hash, plan Business)
- **AutomationLog** — Log des actions automatisées (idempotence Stripe, cron)
- **Referral** / **Payout** — Programme d'affiliation

## 3. Sécurité

| Couche | Implémentation |
|---|---|
| **Sessions** | Cookie httpOnly + HMAC-SHA256 (format v2: `v2.{userId}.{expires}.{sig}`) |
| **Passwords** | bcrypt cost 12 |
| **LinkedIn tokens** | AES-256-GCM (format: `enc1.iv.authtag.ciphertext`) |
| **OAuth state** | Nonce anti-rejeu (Map, TTL 15min) + signature HMAC |
| **2FA** | TOTP (otplib + QR code) + backup codes |
| **Rate limiting** | Login (5/15min), Register (3/h), AI, Publish |
| **API keys** | bcrypt hash, prefix `dsk_live_`, plan Business+ |
| **Cron auth** | Bearer CRON_SECRET (dérivé de JWT_SECRET via HMAC) |
| **Publish** | Idempotent (status check), atomic reservation, retry 3x with backoff+jitter |
| **Stripe** | Webhooks idempotents (AutomationLog), signature verification |

## 4. Multi-IA (5 providers)

```
┌────────────────────────────────────────────┐
│            ai-providers.ts                  │
│                                            │
│  Priority order:                           │
│  1. GEMINI_API_KEY    → Gemini (flash)     │
│  2. GLM_API_KEY       → GLM-4-flash        │
│  3. GROQ_API_KEY      → Llama-3.1-70b      │
│  4. OPENROUTER_API_KEY → Claude/GPT-4o     │
│  5. (fallback) z-ai-web-dev-sdk            │
│                                            │
│  + compareProviders() : parallèle + latence│
│  + Auto-discovery Gemini (ListModels API)  │
└────────────────────────────────────────────┘
```

## 5. MCP Server

Le serveur MCP expose 9 tools via JSON-RPC 2.0 sur `/api/mcp` :

| Tool | Description |
|---|---|
| `list_posts` | Liste les posts (filter par statut) |
| `get_post` | Détails d'un post par ID |
| `create_post` | Crée un brouillon (status=pending) |
| `list_prospects` | Liste les prospects CRM |
| `create_prospect` | Ajoute un prospect |
| `get_analytics` | KPIs 14/30/90 jours |
| `list_clients` | Liste les clients d'agence |
| `get_memory` | Mémoire à long terme de l'agent |
| `set_memory` | Stocke une entrée mémoire |

Auth : Bearer API key (plan Business+). Compatible Claude Desktop, Cursor, et tout client MCP.

## 6. Chrome Extension

```
chrome-extension/
├── manifest.json     # Manifest V3
├── content.js        # Capture commentaires LinkedIn (MutationObserver)
├── background.js     # Service worker → POST /api/extension/comments
├── popup.html/js     # Configuration (URL + API key)
└── icons/            # 16/48/128px
```

Flow : LinkedIn DOM → content.js → background.js → DataSphere API → CommentReply (pending) → cron automation → IA génère réponse → user approuve.

## 7. Déploiement

### Render (free plan)
- **Web service** : Docker multi-stage (deps → builder → runner)
- **Database** : PostgreSQL free (1GB, expire 90j)
- **Health check** : `/api/health`
- **Auto-deploy** : sur push main
- **Spin down** : après 15min d'inactivité (free plan)

### Crons (cron-job.org)
| Cron | Fréquence | Route |
|---|---|---|
| Scheduled publish | 5 min | `/api/cron/scheduled-publish` |
| Sync analytics | 1h | `/api/cron/sync-analytics` |
| Automation (comments + CRM) | 1h | `/api/cron/automation` |
| Onboarding emails | 1h | `/api/cron/onboarding-emails` |
| Affiliate payouts | 1j | `/api/cron/payouts` |

### CI/CD (GitHub Actions)
- **Quality** : ESLint + tsc (0 errors)
- **Build** : `npx next build --webpack`
- **E2E** : Playwright (5 fichiers, 37+ tests)

## 8. Plans & gating

| Feature | Free | Pro (29€/mois) | Business (79€/mois) | Agency |
|---|---|---|---|---|
| Dashboard + Posts | ✅ | ✅ | ✅ | ✅ |
| LinkedIn OAuth | ✅ | ✅ | ✅ | ✅ |
| CRM (prospects, pipeline) | ✅ | ✅ | ✅ | ✅ |
| Dark mode + i18n | ✅ | ✅ | ✅ | ✅ |
| Performance Intelligence (GET) | ✅ | ✅ | ✅ | ✅ |
| AI recommendations (Performance IA POST) | ❌ | ✅ | ✅ | ✅ |
| Multi-IA Compare | ❌ | ✅ | ✅ | ✅ |
| CRM Copilot IA | ❌ | ✅ | ✅ | ✅ |
| Brand Studio + Content Quality | ❌ | ✅ | ✅ | ✅ |
| Email-to-LinkedIn Bridge | ❌ | ✅ | ✅ | ✅ |
| Teams (5 sièges) | ❌ | ❌ | ✅ | ✅ |
| Agency Command Center | ❌ | ❌ | ✅ | ✅ |
| Revenue Attribution | ❌ | ❌ | ✅ | ✅ |
| API keys + MCP Server | ❌ | ❌ | ✅ | ✅ |
| Chrome Extension | ❌ | ❌ | ✅ | ✅ |

## 9. Évolutions futures (P5+)

- [ ] Redis pour rate limiting distribué + nonce OAuth
- [ ] Backup PostgreSQL automatique
- [ ] Sentry monitoring en production
- [ ] Tests unitaires (Vitest)
- [ ] Migration OVH Cloud (quand revenus)
- [ ] WebSocket pour notifications temps réel
- [ ] Mobile app (React Native)
