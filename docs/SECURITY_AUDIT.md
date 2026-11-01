# DataSphere 360 — Audit de Sécurité

## Matrice de risques

| # | Risque | Gravité | Preuve | Impact | Correctif | Statut |
|---|---|---|---|---|---|---|
| S1 | Rate limiting non distribué (in-memory) | Moyen | `src/lib/rate-limit.ts` utilise Map | Contournement multi-instance | Migrer vers Redis (Upstash) | Identifié |
| S2 | Nonce OAuth non distribué | Moyen | `src/lib/linkedin-oauth-state.ts` utilise Map | Rejeu possible multi-instance | Migrer vers Redis SETNX | Identifié |
| S3 | Pas de CSP headers | Moyen | `next.config.ts` sans headers | XSS possible | Ajouter CSP dans next.config | Identifié |
| S4 | Pas de backup DB automatique | Élevé | Render free = pas de backup | Perte de données | Upgrader Render ou backup manuel | Identifié |
| S5 | Tokens LinkedIn en DB chiffrés | — | AES-256-GCM, format enc1.* | — | — | ✅ Sécurisé |
| S6 | Mots de passe bcrypt cost 12 | — | `src/app/api/auth/register/route.ts` | — | — | ✅ Sécurisé |
| S7 | Cookie httpOnly + secure + sameSite | — | `src/lib/auth.ts` | — | — | ✅ Sécurisé |
| S8 | OAuth state signé HMAC + nonce atomique | — | `src/lib/linkedin-oauth-state.ts` | — | — | ✅ Sécurisé |
| S9 | Anti-rejeu nonce (une seule utilisation) | — | Map consumedNonces | — | — | ✅ Sécurisé |
| S10 | Idempotence Stripe webhooks | — | AutomationLog check | — | — | ✅ Sécurisé |
| S11 | Idempotence publication | — | status='published' check | — | — | ✅ Sécurisé |
| S12 | Réservation atomique publication | — | status='publishing' | — | — | ✅ Sécurisé |
| S13 | Anti-bypass status proposals | — | status forcé à 'pending' | — | — | ✅ Sécurisé |
| S14 | Validation email RFC | — | Regex dans register/login | — | — | ✅ Sécurisé |
| S15 | Plan feature gate (AI = Pro+) | — | checkPlanFeature | — | — | ✅ Sécurisé |
| S16 | Tokens jamais exposés client | — | select sans accessToken | — | — | ✅ Sécurisé |
| S17 | BOLA/IDOR sur LinkedIn accounts | — | findFirst avec userId | — | — | ✅ Sécurisé |
| S18 | BOLA/IDOR sur proposals | — | findFirst avec userId | — | — | ✅ Sécurisé |
| S19 | BOLA/IDOR sur prospects | — | findFirst avec userId | — | — | ✅ Sécurisé |
| S20 | BOLA/IDOR sur comments | — | findFirst avec userId | — | — | ✅ Sécurisé |
| S21 | Webhook LinkedIn secret vérifié | — | `src/app/api/linkedin/webhook/route.ts` | — | — | ✅ Sécurisé |
| S22 | Webhook Stripe signature vérifiée | — | `stripe.webhooks.constructEvent` | — | — | ✅ Sécurisé |
| S23 | Refus tokens plaintext (legacy) | — | `decryptLinkedInToken` refuse non-enc1 | — | — | ✅ Sécurisé |
| S24 | 2FA TOTP avec backup codes | — | otplib + bcrypt backup codes | — | — | ✅ Sécurisé |
| S25 | API keys hashées bcrypt | — | `src/lib/api-keys.ts` | — | — | ✅ Sécurisé |
| S26 | Plan limit server-side | — | checkPlanLimit sur generate/publish | — | — | ✅ Sécurisé |
| S27 | Dépendances vulnérables | Faible | `npm audit` = 22 vuln | Potentiel exploit | `npm audit fix` | Identifié |
| S28 | Logs ne contiennent pas de tokens | — | Prisma log: error/warn only en prod | — | — | ✅ Sécurisé |

## Contrôles OWASP ASVS

### V1 (Architecture)
- ✅ Séparation des couches (API / lib / components)
- ✅ Validation des entrées côté serveur
- ⚠️ Pas de limites de ressources (body size, request size)

### V2 (Authentification)
- ✅ bcrypt cost 12
- ✅ Rate limiting login (5/15min)
- ✅ 2FA TOTP
- ✅ Session expiration (30 jours)
- ⚠️ Pas de révocation de session côté serveur (stateless)

### V3 (Session Management)
- ✅ Cookie httpOnly + secure + sameSite
- ✅ HMAC-SHA256 signature
- ⚠️ Pas de rotation de session après login

### V4 (Access Control)
- ✅ BOLA/IDOR vérifié sur toutes les routes
- ✅ Plan limits server-side
- ⚠️ Pas de RBAC granulaire (admin = tout accès)

### V5 (Validation)
- ✅ Email RFC
- ✅ Longueur password (8-128)
- ✅ Validation status proposals
- ⚠️ Pas de sanitization XSS sur les inputs

### V7 (Cryptography)
- ✅ AES-256-GCM pour tokens
- ✅ bcrypt pour passwords
- ✅ HMAC-SHA256 pour sessions
- ⚠️ Pas de rotation de clé

### V8 (Error Handling)
- ✅ Messages d'erreur génériques (login: "Identifiants invalides")
- ✅ Logs structurés (pino)
- ⚠️ Stack traces potentiellement exposées en dev

### V9 (Communications)
- ✅ HTTPS via Render
- ⚠️ Pas de CSP headers
- ⚠️ Pas de HSTS header

### V13 (API)
- ✅ Auth sur toutes les routes sensibles
- ✅ Rate limiting
- ✅ Validation des entrées
- ⚠️ Pas de versioning d'API (sauf /api/v1)
