# DataSphere — SaaS LinkedIn Automation IA

> Générez, optimisez et publiez automatiquement vos posts LinkedIn avec l'IA.

## Stack

- **Next.js 16** (App Router, output: standalone, webpack)
- **Prisma 6** + SQLite (dev) / PostgreSQL (prod)
- **Tailwind CSS 4** + **shadcn/ui**
- **Render** (Docker, port 10000)
- Auth par cookie signé (HMAC-SHA256) — extensible vers next-auth

## Démarrage rapide

```bash
# 1. Installer
npm install
cp .env.example .env

# 2. Base de données
npx prisma db push

# 3. Build & start
npm run build
npm start
# → http://localhost:10000
```

## Variables d'environnement (Render)

| Variable | Requis | Description |
|---|---|---|
| `DATABASE_URL` | ✅ | SQLite (`file:./dev.sqlite`) ou PostgreSQL |
| `DATASPHERE_AUTH_SECRET` | ✅ | Secret pour signer les cookies (32+ char) |
| `PORT` | ✅ | `10000` sur Render |
| `DEMO_MODE` | ⚪ | `true` = simule les appels LinkedIn |
| `LINKEDIN_CLIENT_ID` | ⚪ | Pour OAuth LinkedIn réel |
| `LINKEDIN_CLIENT_SECRET` | ⚪ | Idem |
| `LINKEDIN_REDIRECT_URI` | ⚪ | `https://your-app.onrender.com/api/linkedin/callback` |

## Architecture

```
src/
├── app/
│   ├── page.tsx              # Landing + dashboard
│   ├── pricing/              # Tarifs (Free/Pro/Business)
│   ├── login/                # Connexion
│   ├── register/             # Inscription (essai 14j)
│   ├── onboarding/           # Onboarding 3 étapes
│   └── api/
│       ├── health/           # Health check Render
│       ├── auth/{login,register,logout}/
│       ├── linkedin/
│       │   ├── route.ts      # GET list / POST upsert ⭐
│       │   ├── [id]/route.ts # PUT / DELETE
│       │   └── publish/      # Publication sur LinkedIn
│       ├── proposals/        # CRUD posts générés
│       ├── settings/         # Smart Poster config
│       └── metrics/          # Analytics
├── lib/
│   ├── db.ts                 # Prisma client
│   └── auth.ts               # Cookie signé helper
└── prisma/schema.prisma      # User, Account, LinkedInAccount, ...
```

## Le bug critique corrigé (`POST /api/linkedin`)

**Problème** : La contrainte `@@unique([userId, organizationId])` dans `LinkedInAccount`
fait échouer `db.linkedInAccount.create()` avec l'erreur `P2002` quand un compte
désactivé existe déjà pour ce couple (user, organization).

**Solution** : Remplacer `create()` par `upsert()` :

```typescript
await db.linkedInAccount.upsert({
  where: { userId_organizationId: { userId, organizationId } },
  update: { /* réactive + refresh token */ status: 'active', ... },
  create: { /* crée s'il n'existe pas */ ... },
})
```

Ainsi, un utilisateur qui désactive puis reconnecte son compte LinkedIn ne plante plus.

## Tests E2E

Voir `docs/E2E_TESTS.md` pour la checklist complète (16 tests validés).

## Déploiement Render

1. Connecter le repo GitHub à Render
2. Render détecte automatiquement `render.yaml` (Blueprint)
3. Définir les variables d'environnement manquantes dans le dashboard Render
4. Render build & deploy automatiquement via le `Dockerfile`
5. Health check sur `/api/health`

## Roadmap production commerciale

- [x] Auth par cookie signé
- [x] Modèle LinkedInAccount + upsert
- [x] Routes API LinkedIn (CRUD + publish)
- [x] Landing + pricing + onboarding
- [ ] Brancher OAuth LinkedIn réel (via `LINKEDIN_CLIENT_ID/SECRET`)
- [ ] Migrer vers PostgreSQL en prod (Render PostgreSQL)
- [ ] Intégrer Stripe pour la facturation
- [ ] Configurer next-auth (Credentials + Google/GitHub)
- [ ] Tests automatisés (Playwright)
- [ ] Monitoring (Sentry + Render metrics)
