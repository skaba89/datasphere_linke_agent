// ============================================================
// FRAGMENT À INTÉGRER dans worker-smart-poster.ts
// Remplace la logique de vérification des limites
// ============================================================

// --- AJOUTER CETTE FONCTION DANS LE WORKER ---

/**
 * Récupère les paramètres du smart-poster depuis la DB.
 * Si aucun n'existe, retourne les valeurs par défaut.
 */
async function getSmartPosterSettings(prisma: any): Promise<{
  maxPostsPerDay: number;
  enabled: boolean;
  scheduleHourStart: number;
  scheduleHourEnd: number;
  timezone: string;
  autoApprove: boolean;
  topics: string;
  tone: string;
  language: string;
  targetAudience: string;
}> {
  try {
    const settings = await prisma.smartPosterSettings.findFirst();
    if (settings) {
      return {
        maxPostsPerDay: settings.maxPostsPerDay,
        enabled: settings.enabled,
        scheduleHourStart: settings.scheduleHourStart,
        scheduleHourEnd: settings.scheduleHourEnd,
        timezone: settings.timezone,
        autoApprove: settings.autoApprove,
        topics: settings.topics,
        tone: settings.tone,
        language: settings.language,
        targetAudience: settings.targetAudience,
      };
    }
  } catch (err) {
    console.error('[getSmartPosterSettings] Erreur:', err);
  }

  // Valeurs par défaut
  return {
    maxPostsPerDay: 3,
    enabled: true,
    scheduleHourStart: 7,
    scheduleHourEnd: 8,
    timezone: 'Europe/Paris',
    autoApprove: false,
    topics: 'IA, tech, marketing digital, entrepreneurship, data, productivité',
    tone: 'professionnel mais accessible',
    language: 'fr',
    targetAudience: 'entrepreneurs, CTO, managers tech',
  };
}

/**
 * Vérifie si on est dans la fenêtre horaire de génération.
 */
function isInScheduleWindow(settings: { scheduleHourStart: number; scheduleHourEnd: number; timezone: string }): boolean {
  const now = new Date();
  const currentHour = parseInt(
    now.toLocaleString('en-US', { timeZone: settings.timezone, hour: 'numeric', hour12: false })
  );
  return currentHour >= settings.scheduleHourStart && currentHour <= settings.scheduleHourEnd;
}

// --- DANS LA BOUCLE PRINCIPALE DU WORKER, REMPLACER ---

/*
  ANCIEN CODE (à chercher et remplacer):
  ========================================
  const DEFAULT_MAX_PROPOSALS_PER_DAY = 3;

  // ... dans la boucle du worker:
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const proposalsToday = await prisma.post.count({
    where: {
      status: 'pending_approval',
      createdAt: { gte: todayStart },
    },
  });
  if (proposalsToday >= DEFAULT_MAX_PROPOSALS_PER_DAY) {
    console.log(`Limite atteinte: ${proposalsToday}/${DEFAULT_MAX_PROPOSALS_PER_DAY}`);
    return;
  }

  NOUVEAU CODE (remplacement):
  ============================
*/

async function smartPosterLoop(prisma: any) {
  const spSettings = await getSmartPosterSettings(prisma);

  // Vérifier si le smart-poster est activé
  if (!spSettings.enabled) {
    console.log('[SmartPoster] Désactivé dans les paramètres. Skip.');
    return;
  }

  // Vérifier la fenêtre horaire
  if (!isInScheduleWindow(spSettings)) {
    console.log(`[SmartPoster] Hors fenêtre horaire (${spSettings.scheduleHourStart}h-${spSettings.scheduleHourEnd}h). Skip.`);
    return;
  }

  // Compter les propositions d'aujourd'hui
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const proposalsToday = await prisma.post.count({
    where: {
      status: 'pending_approval',
      createdAt: { gte: todayStart },
    },
  });

  // Utiliser la limite depuis les paramètres DB (pas la constante)
  if (proposalsToday >= spSettings.maxPostsPerDay) {
    console.log(`[SmartPoster] Limite atteinte: ${proposalsToday}/${spSettings.maxPostsPerDay}. Skip.`);
    return;
  }

  const remaining = spSettings.maxPostsPerDay - proposalsToday;
  console.log(`[SmartPoster] Génération de ${remaining} proposition(s) (limite: ${spSettings.maxPostsPerDay}/jour)`);

  // Utiliser spSettings.topics, spSettings.tone, spSettings.language, spSettings.targetAudience
  // dans le prompt IA pour personnaliser la génération

  // Si autoApprove est activé, changer directement le statut en 'approved'
  // après génération
  const newStatus = spSettings.autoApprove ? 'approved' : 'pending_approval';

  // ... reste de la logique de génération avec le prompt enrichi:
  /*
    const prompt = `Tu es un expert en content marketing LinkedIn.
    Génère ${remaining} proposition(s) de post(s) optimisé(s) pour l'engagement.

    Paramètres:
    - Sujets favoris: ${spSettings.topics}
    - Ton: ${spSettings.tone}
    - Langue: ${spSettings.language}
    - Audience cible: ${spSettings.targetAudience}

    L'objectif est de créer des posts qui génèrent des commentaires, likes et partages.
    Utilise des formats qui suscitent la discussion: questions, opinions tranchées,
    storytelling, listes, comparaisons, révélations...
    `;
  */

  // Après création de chaque post:
  // await prisma.post.create({ data: { ...postData, status: newStatus } });
}
