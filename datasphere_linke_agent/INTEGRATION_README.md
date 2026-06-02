# 📋 Instructions d'intégration - Paramètres Smart Poster

## Fichiers à intégrer dans votre projet DataSphere

### 1. Prisma - Ajouter le modèle SmartPosterSettings
**Fichier**: `prisma/schema.prisma`
Ajouter le contenu de `prisma/SmartPosterSettings.model.prisma` à votre schéma.

Puis exécuter:
```bash
npx prisma db push
# OU
npx prisma migrate dev --name add_smart_poster_settings
```

### 2. API - Route Settings
**Fichier**: `src/app/api/smart-poster/settings/route.ts`
Copier le contenu de `src/app/api/smart-poster/settings/route.ts`.
Endpoints: GET et PUT sur `/api/smart-poster/settings`

### 3. Composant UI - Paramètres
**Fichier**: `src/components/saas/SmartPosterSettingsView.tsx`
Copier le contenu de `src/components/saas/SmartPosterSettingsView.tsx`.

### 4. Worker - Mettre à jour la logique
**Fichier**: `worker-smart-poster.ts`
- Remplacer `DEFAULT_MAX_PROPOSALS_PER_DAY` par la lecture depuis la DB
- Intégrer `getSmartPosterSettings()` et `isInScheduleWindow()`
- Voir le fichier `workers/smart-poster-update.ts` pour les détails

### 5. Navigation - Ajouter le menu
**Fichier**: `src/components/saas/nav/navigation-config.tsx`
Ajouter un élément "Paramètres Poster" avec l'icône ⚙️

### 6. Layout - Ajouter la route
**Fichier**: `src/components/saas/AppLayout.tsx`
Ajouter le cas pour la route `smart-poster-settings`

### 7. Types - Ajouter le type de vue
**Fichier**: `src/types/index.ts`
Ajouter `'smart-poster-settings'` au type union des vues

## Fonctionnalités
- ✅ Configurer le nombre de posts/jour (1-10)
- ✅ Activer/désactiver la génération automatique
- ✅ Définir la fenêtre horaire (ex: 7h-8h)
- ✅ Choix du ton, langue, sujets, audience
- ✅ Option d'approbation automatique
- ✅ Fuseau horaire personnalisable

## Variables d'environnement
Aucune nouvelle variable d'environnement nécessaire.
Le système utilise la table `SmartPosterSettings` en base de données.
