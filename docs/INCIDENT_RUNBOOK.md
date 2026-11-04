# DataSphere 360 — Runbook d'Incident

## Niveaux d'incident

| Niveau | Définition | Réponse | Notification |
|---|---|---|---|
| **P0 — Critique** | Service indisponible, perte de données | Immédiate, 24/7 | Tous les utilisateurs |
| **P1 — Majeur** | Fonctionnalité clé cassée, dégradation significative | < 4h | Utilisateurs affectés |
| **P2 — Mineur** | Bug non bloquant, dégradation légère | < 24h | Pas de notification |
| **P3 — Cosmétique** | UI glitch, typo | Next release | — |

## Procédures d'incident

### P0: Service indisponible (Render down)

1. Vérifier https://status.render.com
2. Si Render OK → vérifier `/api/health` :
   ```
   curl https://datasphere-sq19.onrender.com/api/health
   ```
3. Si 503 → le conteneur redémarre, attendre 2 min
4. Si 500 → checker les logs Render → Settings → Logs
5. Si DB injoignable → vérifier Render PostgreSQL dashboard
6. **Rollback** : Render → Settings → Manual Deploy → commit précédent
7. Si migration DB problématique :
   ```bash
   npx prisma migrate resolve --rolled-back <migration_name>
   ```

### P0: Perte de données PostgreSQL

1. **NE PAS PANIQUER** — ne pas modifier la DB
2. Récupérer le dernier backup : `ls -la backups/`
3. Restaurer :
   ```bash
   gunzip < backups/datasphere_YYYYMMDD_HHMMSS.sql.gz | psql $DATABASE_URL
   ```
4. Vérifier l'intégrité : `SELECT COUNT(*) FROM "User";`
5. Notifier les utilisateurs

### P1: Publication LinkedIn en échec massif

1. Vérifier le statut LinkedIn API : https://www.linkedin.com/developers/
2. Checker les logs : `grep "LinkedIn publish failed" logs/`
3. Si token expiré → `GET /api/cron/check-token-expiration` (manuel)
4. Si rate limit LinkedIn (429) → attendre 1h, le retry automatique gère
5. Si contenu rejeté (422) → vérifier les posts récents pour contenu non conforme
6. Vérifier le cron recovery : `GET /api/cron/recover-stuck-publishing`

### P1: IA ne répond plus

1. Vérifier quel provider est actif : `GET /api/health`
2. Tester manuellement : `node scripts/test-ai-providers.js`
3. Si Gemini down → le fallback chain utilise GLM/Z.ai automatiquement
4. Si tous les providers down → vérifier les clés API sur Render
5. Si clé API expirée → générer une nouvelle clé sur le provider
6. Vérifier les quotas (Gemini: 15 req/min gratuit)

### P1: Stripe webhook non traité

1. Vérifier Stripe Dashboard → Developers → Events
2. Si events en échec → Render logs → chercher "Stripe webhook"
3. Vérifier `STRIPE_WEBHOOK_SECRET` sur Render
4. Si idempotency bloquée → `AutomationLog` peut avoir un event en statut 'processed' mais le traitement a échoué :
   ```sql
   DELETE FROM "AutomationLog" WHERE type = 'stripe_webhook' AND "details"->>'eventId' = '<event_id>';
   ```
5. Re-jouer l'évent depuis Stripe Dashboard → "Resend"

### P2: Hermes agent bloqué

1. Vérifier les runs : `GET /api/hermes/runs?limit=5`
2. Si status='running' depuis > 1h → le cron recovery devrait le gérer
3. Forcer le recovery : `GET /api/cron/recover-stuck-publishing` (avec CRON_SECRET)
4. Si persistant → reset manuel :
   ```sql
   UPDATE "AgentRun" SET status = 'failed', error = 'Manual reset' WHERE status = 'running';
   ```

## Monitoring

### Sentry
- Dashboard : https://sentry.io (si SENTRY_DSN configuré)
- Alertes email automatiques sur nouvelles erreurs
- Performance monitoring (10% des transactions en prod)

### Health check
- `GET /api/health` → 200 OK attendu
- Vérifie : DB, LinkedIn, AI providers, Stripe
- cron-job.org peut pinger cette URL toutes les 5 min

### Logs structurés
- Format : JSON (pino)
- Render → Settings → Logs → streaming
- Filtres utiles : `grep "error"`, `grep "LinkedIn"`, `grep "Stripe"`

## Contacts

| Rôle | Responsabilité | Contact |
|---|---|---|
| Owner | Décisions de rollback, communication utilisateurs | — |
| DevOps | Render, cron-job.org, DB, backups | — |
| Développeur | Code, bugs, déploiement | — |

## Post-incident

1. **Post-mortem** dans les 48h (template ci-dessous)
2. **Action items** avec assignés et dates
3. **Runbook update** si la procédure manquait une étape
4. **Test de régression** ajouté pour le bug

### Template post-mortem

```markdown
## Incident YYYY-MM-DD

**Niveau** : P0/P1/P2
**Durée** : Xh Ymin
**Impact** : N utilisateurs affectés

### Timeline
- HH:MM : Détection
- HH:MM : Diagnostic
- HH:MM : Fix déployé
- HH:MM : Service restauré

### Cause racine
[Description technique]

### Actions correctives
1. [Action] — [Assigné] — [Date]
2. [Action] — [Assigné] — [Date]
```
