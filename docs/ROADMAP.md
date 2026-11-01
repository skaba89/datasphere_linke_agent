# DataSphere — Roadmap

## ✅ Terminé

### Phase 0 — Fondations (P0)
- [x] Auth cookie HMAC-SHA256 (format v2)
- [x] OAuth LinkedIn hardening (nonce anti-replay, OpenID Connect)
- [x] Chiffrement tokens LinkedIn (AES-256-GCM)
- [x] Publication idempotente + retry + dead-letter queue
- [x] Gemini auto-discovery (ListModels API)
- [x] CI GitHub Actions (lint + tsc + build + E2E)
- [x] Demo mode supprimé

### Phase 2 — Modules core (P2)
- [x] LinkedIn : connection/disconnection, multi-comptes, publication
- [x] AI : génération contenu, amélioration, réécriture, multi-provider
- [x] CRM : prospects, pipeline Kanban, séquences, messages
- [x] Stripe : Free/Pro/Business, Checkout, webhooks idempotents, portal
- [x] Teams : invitations, rôles (owner/admin/member)
- [x] 2FA TOTP + backup codes
- [x] Affiliation : codes, referrals, payouts
- [x] API publique v1 + API keys (bcrypt)

### Phase 3 — Studios IA (P3)
- [x] Personal Brand Studio (voix éditoriale + piliers + post exemple)
- [x] Content Quality Studio (score 5 axes + variantes A/B)
- [x] Multi-IA Comparison (5 providers en parallèle + latence)
- [x] CRM CSV Import/Export (RFC4180 + déduplication)
- [x] CRM Messages send-draft (brouillon → envoyé + update stage)

### Phase 3-2 — Analytics & Teams (P3-2)
- [x] Teams : permissions granulaires par client (view/edit/manage)
- [x] LinkedIn Performance Intelligence (KPIs 14/30/90j + reco IA)
- [x] Agency Command Center (KPIs cross-clients + alertes + tendances)

### Phase 4 — CRM Copilot + Revenue + UX (P4)
- [x] CRM Copilot IA (chat avec contexte prospects/clients/messages)
- [x] Revenue Attribution Studio (revenu par client/prospect + agrégations)
- [x] Dark mode (ThemeProvider + anti-flash + persistance)
- [x] Email-to-LinkedIn Bridge (webhook Resend Inbound → PostProposal)
- [x] AI Agent Workspace (tasks CRUD + mémoire à long terme)
- [x] i18n FR/EN (LanguageProvider + toggle + dictionnaire)

### Phase 5 — MCP + Extension (P5)
- [x] MCP Server (9 tools via JSON-RPC 2.0, compatible Claude Desktop)
- [x] Chrome Extension (capture commentaires LinkedIn → DataSphere)
- [x] Documentation : ARCHITECTURE.md, ROADMAP.md

## 🔜 À faire

### P5+ — Industrialisation
- [ ] Redis pour rate limiting distribué + nonce OAuth
- [ ] Backup PostgreSQL automatique (Render add-on ou script)
- [ ] Sentry monitoring en production (DSN configurable)
- [ ] Tests unitaires (Vitest) — couverture lib/
- [ ] CSP headers (Content-Security-Policy dans next.config.ts)
- [ ] Audit log des actions admin

### P6 — Scalabilité
- [ ] Migration OVH Cloud (quand revenus > seuil)
- [ ] WebSocket pour notifications temps réel (Socket.io)
- [ ] File d'attente jobs (BullMQ + Redis)
- [ ] CDN pour assets statiques
- [ ] Pagination cursor-based sur toutes les listes API

### P7 — Produit
- [ ] Mobile app (React Native)
- [ ] Analytics LinkedIn temps réel (LinkedIn Pages API)
- [ ] A/B testing natif (variantes de posts)
- [ ] TeamChat (messagerie interne équipe)
- [ ] White-label (custom domain + branding)
- [ ] Marketplace de templates IA

## 📊 Métriques actuelles

| Métrique | Valeur |
|---|---|
| Routes API | 75+ |
| Pages | 20+ |
| Modèles Prisma | 21 |
| Migrations DB | 11 |
| Tests E2E | 7 fichiers, 70+ tests |
| Composants custom | 12+ |
| Onglets dashboard | 20 |
| Providers IA | 5 (Gemini, GLM, Groq, OpenRouter, z-ai) |
| MCP tools | 9 |
| LOC total | ~25 000 |

## 🎯 Priorités court terme

1. **Tests en production** : valider Stripe webhooks, LinkedIn publish, cron automation
2. **Configuration externe** : LinkedIn OAuth app, Stripe products, Resend domain, cron-job.org
3. **Monitoring** : configurer Sentry, alertes Render
4. **Backup DB** : script pg_dump quotidien vers S3/OVH
5. **Documentation utilisateur** : guide onboarding, FAQ, tutoriels vidéo
