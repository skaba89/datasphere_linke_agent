import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// GET /api/smart-poster/settings - Récupérer les paramètres du smart-poster
export async function GET() {
  try {
    let settings = await prisma.smartPosterSettings.findFirst();

    // Si aucun paramètre n'existe, créer les valeurs par défaut
    if (!settings) {
      settings = await prisma.smartPosterSettings.create({
        data: {
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
        },
      });
    }

    return NextResponse.json({ success: true, settings });
  } catch (error: any) {
    console.error('[GET /api/smart-poster/settings] Erreur:', error.message);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// PUT /api/smart-poster/settings - Mettre à jour les paramètres
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      maxPostsPerDay,
      enabled,
      scheduleHourStart,
      scheduleHourEnd,
      timezone,
      autoApprove,
      topics,
      tone,
      language,
      targetAudience,
    } = body;

    // Validation du nombre de posts par jour
    if (maxPostsPerDay !== undefined) {
      if (!Number.isInteger(maxPostsPerDay) || maxPostsPerDay < 1 || maxPostsPerDay > 10) {
        return NextResponse.json(
          { success: false, error: 'maxPostsPerDay doit être entre 1 et 10' },
          { status: 400 }
        );
      }
    }

    // Validation des heures de planification
    if (scheduleHourStart !== undefined && scheduleHourEnd !== undefined) {
      if (scheduleHourStart < 0 || scheduleHourStart > 23 || scheduleHourEnd < 0 || scheduleHourEnd > 23) {
        return NextResponse.json(
          { success: false, error: 'Les heures doivent être entre 0 et 23' },
          { status: 400 }
        );
      }
    }

    let settings = await prisma.smartPosterSettings.findFirst();

    if (!settings) {
      // Créer si n'existe pas encore
      settings = await prisma.smartPosterSettings.create({
        data: {
          maxPostsPerDay: maxPostsPerDay ?? 3,
          enabled: enabled ?? true,
          scheduleHourStart: scheduleHourStart ?? 7,
          scheduleHourEnd: scheduleHourEnd ?? 8,
          timezone: timezone ?? 'Europe/Paris',
          autoApprove: autoApprove ?? false,
          topics: topics ?? 'IA, tech, marketing digital, entrepreneurship, data, productivité',
          tone: tone ?? 'professionnel mais accessible',
          language: language ?? 'fr',
          targetAudience: targetAudience ?? 'entrepreneurs, CTO, managers tech',
        },
      });
    } else {
      // Mettre à jour les champs fournis
      const updateData: any = {};
      if (maxPostsPerDay !== undefined) updateData.maxPostsPerDay = maxPostsPerDay;
      if (enabled !== undefined) updateData.enabled = enabled;
      if (scheduleHourStart !== undefined) updateData.scheduleHourStart = scheduleHourStart;
      if (scheduleHourEnd !== undefined) updateData.scheduleHourEnd = scheduleHourEnd;
      if (timezone !== undefined) updateData.timezone = timezone;
      if (autoApprove !== undefined) updateData.autoApprove = autoApprove;
      if (topics !== undefined) updateData.topics = topics;
      if (tone !== undefined) updateData.tone = tone;
      if (language !== undefined) updateData.language = language;
      if (targetAudience !== undefined) updateData.targetAudience = targetAudience;

      settings = await prisma.smartPosterSettings.update({
        where: { id: settings.id },
        data: updateData,
      });
    }

    return NextResponse.json({ success: true, settings });
  } catch (error: any) {
    console.error('[PUT /api/smart-poster/settings] Erreur:', error.message);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
