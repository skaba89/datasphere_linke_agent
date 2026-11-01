# DataSphere 360 — Inventaire Fonctionnel

## Modules par statut

### ✅ COMPLET ET VALIDÉ

| Module | APIs | Tables | Écrans | Tests |
|---|---|---|---|---|
| Auth | 5 routes | User, Account | login, register, settings | ✅ |
| LinkedIn OAuth | 6 routes | LinkedInAccount | connect/linkedin, onboarding | ✅ |
| Posts/Proposals | 6 routes | PostProposal | dashboard (Posts tab) | ✅ |
| CRM Prospects | 4 routes | Prospect | dashboard (Prospecting tab) | ✅ |
| CRM Pipeline | 1 route (PATCH) | Prospect | dashboard (Pipeline tab) | ✅ |
| CRM Messages | 2 routes | CrmMessage | dashboard (Messages tab) | ✅ |
| CRM Séquences | 2 routes | CrmSequence | dashboard (CRM tab) | ✅ |
| Dashboard | 2 routes | Client, PostProposal | dashboard (Overview) | ✅ |
| Clients | 3 routes | Client | dashboard (Ajouter client) | ✅ |
| Pricing/Stripe | 4 routes | User (stripe fields) | pricing, settings | ✅ |
| Admin | 3 routes | User (role) | /admin | ✅ |
| Affiliation | 2 routes | Referral, Payout | /affiliate | ✅ |
| Notifications | 4 routes | Notification | bell (dashboard) | ✅ |
| Templates IA | 1 route | — | dashboard (Templates tab) | ✅ |
| Comment Automation | 3 routes | CommentReply | dashboard (Commentaires tab) | ✅ |
| Blog | 0 (static) | — | /blog, /blog/[slug] | ✅ |
| Legal | 0 (static) | — | /legal/* | ✅ |
| Health | 1 route | — | /api/health | ✅ |
| API publique v1 | 3 routes | ApiKey | /api/v1 | ✅ |

### ⚠️ IMPLÉMENTÉ MAIS NON TESTÉ en production

| Module | Ce qui marche | Ce qui manque |
|---|---|---|
| Stripe webhooks | Idempotence, 6 events gérés | Pas testé avec vrais events Stripe |
| LinkedIn publish | API v2, retry, idempotence | Pas testé avec vrai token LinkedIn |
| Scheduled publish | Cron logic, timezone, quotas | Pas de cron-job.org configuré |
| Sync analytics | API LinkedIn socialActions | Pas testé en prod |
| Onboarding emails | Resend, templates HTML | Resend pas configuré |
| Agent IA | Chat multi-provider | Dépend du provider IA |
| Mission Scout | Tendances + opportunités IA | Dépend du provider IA |
| 2FA TOTP | Setup, verify, backup codes | Pas testé en prod |
| API keys | CRUD, bcrypt hash | Pas testé en prod |

### 🔧 PARTIELLEMENT IMPLÉMENTÉ

| Module | Implémenté | Manquant |
|---|---|---|
| CRM Séquences | Création, liste, génération auto (cron), envoi manuel | Envoi 100% automatique (opt-in) |
| Teams | Invitation, accept, liste, **permissions par client (view/edit/manage)**, accessible-clients | Audit log des actions |
| Analytics | Graphiques, 14j de données, **Performance Intelligence (KPIs 14/30/90j + reco IA)** | Métriques temps réel (limité par API LinkedIn) |
| Automation | Comment replies, CRM sequences | Source de commentaires (Chrome ext ou webhook) |
| Multi-IA | 5 providers (Gemini/GLM/Groq/OpenRouter/z-ai), comparaison parallèle, fallback | Sélection manuelle du provider actif |
| Networking | Stats, liste prospects | Import CSV spécifique (au pipeline networking) |
| Agency | Dashboard multi-clients, Agency Command Center, **Revenue Attribution Studio** | Audit log des actions |

### ❌ NON FONCTIONNEL / ABSENT

| Module | Statut | Priorité |
|---|---|---|
| LinkedIn Performance Intelligence | ✅ Implémenté (P3-2) | Done |
| AI CRM Copilot | ✅ Implémenté (P4) | Done |
| Agency Command Center | ✅ Implémenté (P3-2) | Done |
| Revenue Attribution Studio | ✅ Implémenté (P4) | Done |
| Dark mode | ✅ Implémenté (P4) | Done |
| AI Agent Workspace | ✅ Implémenté (P4-2) | Done |
| Email-to-LinkedIn Bridge | ✅ Implémenté (P4-2) | Done |
| Multi-langue (i18n) | ✅ Implémenté (P4-2, FR/EN toggle) | Done |
| MCP Server | ✅ Implémenté (P5) | Done |
| Chrome Extension | ✅ Implémenté (P5) | Done |

Tous les modules du roadmap initial (P0 → P5) sont désormais implémentés. Voir `docs/ROADMAP.md` pour les évolutions futures (P5+ industrialisation, P6 scalabilité, P7 produit).

### ✅ NOUVEAUX MODULES P3 (ajoutés)

| Module | APIs | Écran | Statut |
|---|---|---|---|
| Personal Brand Studio | `/api/brand-studio` | Brand Studio tab | ✅ UI + API |
| Content Quality Studio | `/api/content-quality` | Content Quality tab | ✅ UI + API |
| Multi-IA Comparison | `/api/ai/compare` | Multi-IA Compare tab | ✅ UI + API + plan gate (Pro+) |
| CRM CSV Import/Export | `/api/prospects/import` (POST + GET) | Prospecting tab | ✅ UI + API + déduplication |
| CRM Messages send-draft | `/api/crm-messages/[id]/send` | Messages tab | ✅ UI + API |
| **Teams Permissions granulaires** | `/api/teams/assignments`, `/api/teams/accessible-clients` | /team page | ✅ UI + API + migration DB |
| **Performance Intelligence** | `/api/performance-intelligence` (GET + POST) | Performance IA tab | ✅ UI + API + reco IA (Pro+) |
| **Agency Command Center** | `/api/agency-command-center` | Agency Command tab | ✅ UI + API + plan gate (Business+) |
| **CRM Copilot IA** | `/api/ai/crm-copilot` | CRM Copilot IA tab | ✅ UI + API + plan gate (Pro+) |
| **Revenue Attribution Studio** | `/api/revenue-attribution` + `/[id]` | Revenue Attribution tab | ✅ UI + API + plan gate (Business+) + migration DB |
| **Dark mode** | — | Theme toggle (header) | ✅ ThemeProvider + anti-flash script + localStorage |
| **Email-to-LinkedIn Bridge** | `/api/email-bridge/inbound`, `/api/email-bridge/drafts` | — | ✅ Webhook Resend Inbound → PostProposal pending (Pro+) |
| **AI Agent Workspace** | `/api/agent-workspace/tasks`, `/api/agent-workspace/memory` | Agent Workspace tab | ✅ Tasks CRUD + memory upsert + migration DB |
| **i18n FR/EN** | — | Language toggle (header) | ✅ LanguageProvider + dictionary + localStorage |
| **MCP Server** | `/api/mcp` (JSON-RPC 2.0, 9 tools) | — | ✅ Compatible Claude Desktop / Cursor (plan Business+) |
| **Chrome Extension** | `/api/extension/comments` | chrome-extension/ | ✅ Capture commentaires LinkedIn → DataSphere (plan Business+) |

## Dépendances externes

| Service | Configuré sur Render | Nécessaire pour |
|---|---|---|
| PostgreSQL | ✅ | Tout |
| LinkedIn OAuth | ✅ (CLIENT_ID/SECRET) | Connexion LinkedIn |
| Stripe | ❌ (manquant) | Paiement |
| Resend | ✅ | Emails |
| Sentry | ❌ (optionnel) | Monitoring |
| Gemini API | ✅ | Génération IA |
| GLM API | ❌ (optionnel) | Génération IA (fallback) |
| Groq API | ❌ (optionnel) | Génération IA (fallback) |
| OpenRouter API | ❌ (optionnel) | Génération IA (fallback) |
| Telegram Bot | ❌ (optionnel) | Notifications |
| WhatsApp CallMeBot | ❌ (optionnel) | Notifications |
| cron-job.org | ❌ (nécessaire) | Crons (free plan Render) |
