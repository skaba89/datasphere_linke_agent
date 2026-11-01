# Sentry — Monitoring d'erreurs

## Configuration

DataSphere intègre Sentry via `@sentry/nextjs` pour le monitoring d'erreurs côté serveur et client.

### Fichiers

| Fichier | Rôle |
|---|---|
| `src/instrumentation.ts` | Hook Next.js — importe Sentry au démarrage du serveur |
| `src/lib/sentry.ts` | Init Sentry serveur + helpers (captureError, captureMessage, setSentryUser) |
| `sentry.client.config.ts` | Init Sentry navigateur (replays, performance) |
| `src/components/sentry-provider.tsx` | Provider React pour lier le user connecté à Sentry |

### Activation

1. Créer un projet sur [sentry.io](https://sentry.io) (Next.js)
2. Récupérer le **DSN**
3. Définir sur Render :
   ```
   SENTRY_DSN=https://xxx@sentry.io/123
   ```
4. (Optionnel) Pour les source maps en prod :
   ```
   SENTRY_AUTH_TOKEN=sntrys_eyJpYX...
   SENTRY_ORG=your-org
   SENTRY_PROJECT=datasphere
   ```

### Comportement

- **Sans DSN** : Sentry est no-op (safe en dev, pas d'erreurs)
- **Avec DSN en prod** :
  - 10% des transactions tracées (performance)
  - 100% des erreurs capturées
  - Replays session : 10% normal, 100% sur erreur
- **Erreurs ignorées** : `NEXT_NOT_FOUND`, `NEXT_REDIRECT`, `Unauthorized`, `Non authentifié`, `Rate limit exceeded`

### Utilisation dans le code

```typescript
import { captureError, captureMessage, setSentryUser } from '@/lib/sentry'

// Capturer une erreur avec contexte
try {
  await riskyOperation()
} catch (err) {
  captureError(err as Error, { userId, action: 'publish_post' })
  throw err
}

// Logger un message
captureMessage('Stripe webhook received', 'info', { eventId, type })

// Lier le user connecté
setSentryUser({ id: user.id, email: user.email, plan: user.plan })
```

### Vérification

Pour vérifier que Sentry fonctionne en prod :
1. Définir `SENTRY_DSN`
2. Déployer
3. Visiter une page inexistante (404) — ne devrait pas créer d'erreur Sentry
4. Déclencher une erreur 500 (ex: arrêter la DB temporairement) — devrait apparaître dans Sentry
