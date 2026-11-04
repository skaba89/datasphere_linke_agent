# DataSphere 360 — Stratégie de Test

## Vue d'ensemble

| Niveau | Outil | Fichiers | Tests | Couverture |
|---|---|---|---|---|
| Unitaires | Vitest | 5 | 63 | Auth, crypto, pagination, cron-secret, MCP tools |
| E2E | Playwright | 15 | 162+ | Tous les parcours utilisateur critiques |
| Migrations | pg-mem | 1 script | 17 migrations | Toutes les migrations SQL |
| Build | Next.js | — | — | Compilation standalone |
| Lint | ESLint | — | — | 0 erreur, ~117 warnings |
| Types | TypeScript | — | — | 0 erreur |

## Architecture de test

```
tests/
├── unit/                    # Tests unitaires (Vitest)
│   ├── auth.test.ts         # verifySession (15 tests)
│   ├── cron-secret.test.ts  # CRON_SECRET derivation (8 tests)
│   ├── linkedin-token-crypto.test.ts  # AES-256-GCM (11 tests)
│   ├── mcp-tools.test.ts    # MCP 9 tools (13 tests)
│   └── pagination.test.ts   # Cursor pagination (16 tests)
├── e2e/                     # Tests end-to-end (Playwright)
│   ├── auth.spec.ts         # Login/register/logout (8 tests)
│   ├── hermes.spec.ts       # Hermes agent (15 tests)
│   ├── linkedin.spec.ts     # LinkedIn OAuth + admin-only (11 tests)
│   ├── phase3-features.spec.ts      # Brand Studio + CSV import (14 tests)
│   ├── phase3-2-features.spec.ts    # Teams + Performance IA (15 tests)
│   ├── phase4-features.spec.ts      # CRM Copilot + Revenue + Dark mode (9 tests)
│   ├── phase4-2-features.spec.ts    # Email Bridge + Agent Workspace (14 tests)
│   ├── phase5-features.spec.ts      # MCP Server + Chrome ext (9 tests)
│   ├── phase6-features.spec.ts      # Pagination + SSE + Cache (12 tests)
│   ├── phase7-linkedin-core.spec.ts # Scheduling + cron auth (12 tests)
│   ├── phase8-crm-copilot.spec.ts   # CRM CRUD + scoring + sequences (19 tests)
│   ├── phase9-analytics.spec.ts     # Analytics + revenue PATCH (6 tests)
│   ├── public.spec.ts      # Pages publiques + rate limiting (11 tests)
│   ├── security-regression.spec.ts  # OAuth + sessions + crypto (3 tests)
│   └── teams.spec.ts       # Teams API + UI (8 tests)
```

## CI/CD Pipeline (GitHub Actions)

```
push/PR → main
  │
  ├── Job 1: quality (lint + typecheck + migration test)
  │     └── npm install
  │     └── prisma generate
  │     └── tsc --noEmit
  │     └── eslint .
  │     └── node scripts/test-migrations.js (pg-mem)
  │
  ├── Job 2: build (parallèle avec unit-tests)
  │     └── next build --webpack
  │
  ├── Job 3: unit-tests (parallèle avec build)
  │     └── vitest run
  │
  └── Job 4: e2e (dépend de build + unit-tests)
        └── PostgreSQL 16 service container
        └── prisma migrate deploy
        └── next build (avec DATABASE_URL réel)
        └── playwright install chromium
        └── playwright test
```

## Couverture par module

| Module | Tests unitaires | Tests E2E | Gap |
|---|---|---|---|
| Auth | ✅ verifySession | ✅ login/register/logout | ❌ 2FA flow, rate limiter |
| LinkedIn | ✅ token crypto | ✅ OAuth, admin-only | ❌ publisher retry/idempotency |
| AI Providers | ❌ | ❌ | ❌ Tous les providers (nécessite mock fetch) |
| Hermes | ❌ | ✅ 15 tests | ❌ 6 step functions unitaires |
| CRM | ❌ | ✅ 19 tests | ❌ scoring formula, dedup logic |
| Analytics | ❌ | ✅ 6 tests | ❌ KPI aggregation |
| Revenue | ❌ | ✅ lifecycle | ❌ CSV escaping |
| Stripe | ❌ | ❌ | ❌ Webhook handler (nécessite mock Stripe) |
| Teams | ❌ | ✅ 8 tests | ❌ Permission checks |
| MCP | ✅ 13 tests | ✅ 9 tests | ❌ JSON-RPC dispatch |
| Chrome Ext | ❌ | ❌ | ❌ Content script |
| Email Bridge | ❌ | ❌ | ❌ HTML stripping |
| Agent Workspace | ❌ | ✅ 14 tests | ❌ Task CRUD unitaires |
| Pagination | ✅ 16 tests | ✅ 12 tests | — |
| Cron Secret | ✅ 8 tests | ✅ 3 tests | — |

## Priorités de test (P0 → P2)

### P0 — Manquants critiques
1. Test unitaire: 2FA login flow (vérifier que cookie n'est PAS set si 2FA activé)
2. Test unitaire: AI provider timeout (fetchWithTimeout abort après 60s)
3. Test unitaire: CRM message force status='draft' on creation

### P1 — Manquants importants
4. Test unitaire: prospect-scoring.ts (la formule de scoring)
5. Test unitaire: Hermes stepGeneratePosts (auto-gen from SmartPosterSettings)
6. Test E2E: Stripe checkout → webhook → plan upgrade (mode test)
7. Test unitaire: LinkedIn publisher retry logic (mock fetch)

### P2 — Manquants secondaires
8. Test unitaire: teams.ts permission checks (view/edit/manage)
9. Test unitaire: ai-providers.ts fallback chain
10. Test E2E: Chrome extension → /api/extension/comments

## Commandes

```bash
# Tests unitaires
npm test

# Tests unitaires avec coverage
npm run test:coverage

# Tests E2E
npm run test:e2e

# Tests E2E avec UI
npm run test:e2e:ui

# Test des migrations
npm run db:test-migrations

# Agent de test complet
node scripts/test-agent.js

# Test des providers IA
node scripts/test-ai-providers.js
```
