import { db } from '@/lib/db'

// ============================================================
// LinkedIn API Service
//
// Fonctions :
//   - refreshAccessToken (si supporté par l'app LinkedIn)
//   - syncAccountProfile : resync profil LinkedIn
//   - getPostAnalytics : récupérer les stats d'un post publié
//   - syncEngagementMetrics : récupérer les stats agrégées et
//     les stocker dans EngagementMetric
//   - schedulePost : planifier un post (lifecycleState=SCHEDULED)
// ============================================================

const LINKEDIN_API_BASE = 'https://api.linkedin.com/v2'

export interface LinkedInPostStats {
  totalViews: number
  totalLikes: number
  totalComments: number
  totalShares: number
  totalClicks: number
}

// ============================================================
// Sync du profil LinkedIn (à la connexion et périodiquement)
// ============================================================
export async function syncAccountProfile(accountId: string): Promise<void> {
  const account = await db.linkedInAccount.findUnique({ where: { id: accountId } })
  if (!account || account.status !== 'active') return

  const profileRes = await fetch(`${LINKEDIN_API_BASE}/me`, {
    headers: { Authorization: `Bearer ${account.accessToken}` },
  })

  if (!profileRes.ok) {
    // Token potentiellement expiré
    if (profileRes.status === 401) {
      await db.linkedInAccount.update({
        where: { id: accountId },
        data: { status: 'expired' },
      })
    }
    return
  }

  const profile = await profileRes.json()
  const displayName = [profile.localizedFirstName, profile.localizedLastName]
    .filter(Boolean).join(' ') || account.displayName

  // Récupérer le headline si dispo
  let headline = account.headline
  try {
    const headRes = await fetch(`${LINKEDIN_API_BASE}/me?projection=(headline)`, {
      headers: { Authorization: `Bearer ${account.accessToken}` },
    })
    if (headRes.ok) {
      const headData = await headRes.json()
      headline = headData.headline?.localized ?? headline
    }
  } catch {}

  await db.linkedInAccount.update({
    where: { id: accountId },
    data: { displayName, headline, lastSyncAt: new Date() },
  })
}

// ============================================================
// Récupérer les stats d'un post publié
// LinkedIn API : /v2/socialActions/{urn}
// ============================================================
export async function getPostStats(
  accessToken: string,
  postUrn: string
): Promise<LinkedInPostStats | null> {
  // socialActions ne donne que likes + comments
  const statsRes = await fetch(
    `${LINKEDIN_API_BASE}/socialActions/${encodeURIComponent(postUrn)}`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  )

  if (!statsRes.ok) {
    console.error('[LinkedIn getPostStats] failed', statsRes.status)
    return null
  }

  const data = await statsRes.json()
  return {
    totalViews: 0, // pas dispo via socialActions
    totalLikes: data.likes?._total || 0,
    totalComments: data.comments?._total || 0,
    totalShares: 0, // pas dispo via socialActions
    totalClicks: 0,
  }
}

// ============================================================
// Sync des engagement metrics pour l'utilisateur
// Agrège les stats de tous les posts publiés sur 14 jours
// ============================================================
export async function syncEngagementMetrics(userId: string): Promise<{
  synced: number
  errors: number
}> {
  const account = await db.linkedInAccount.findFirst({
    where: { userId, status: 'active' },
  })

  if (!account) {
    return { synced: 0, errors: 0 }
  }

  // Vérifier l'expiration
  if (account.tokenExpiresAt && new Date(account.tokenExpiresAt) < new Date()) {
    await db.linkedInAccount.update({
      where: { id: account.id },
      data: { status: 'expired' },
    })
    return { synced: 0, errors: 0 }
  }

  // Récupérer les proposals publiées avec linkedinPostId
  const publishedProposals = await db.postProposal.findMany({
    where: {
      userId,
      linkedinPostId: { not: null },
      publishedAt: { not: null },
    },
    orderBy: { publishedAt: 'desc' },
    take: 50, // derniers 50 posts
  })

  if (publishedProposals.length === 0) {
    return { synced: 0, errors: 0 }
  }

  let synced = 0
  let errors = 0

  // Grouper par date (YYYY-MM-DD)
  const byDate: Record<string, LinkedInPostStats> = {}

  for (const proposal of publishedProposals) {
    if (!proposal.linkedinPostId) continue

    const stats = await getPostStats(account.accessToken, proposal.linkedinPostId)
    if (!stats) {
      errors++
      continue
    }

    const dateStr = (proposal.publishedAt as Date).toISOString().split('T')[0]
    if (!byDate[dateStr]) {
      byDate[dateStr] = {
        totalViews: 0,
        totalLikes: 0,
        totalComments: 0,
        totalShares: 0,
        totalClicks: 0,
      }
    }
    byDate[dateStr].totalViews += stats.totalViews
    byDate[dateStr].totalLikes += stats.totalLikes
    byDate[dateStr].totalComments += stats.totalComments
    byDate[dateStr].totalShares += stats.totalShares
    byDate[dateStr].totalClicks += stats.totalClicks

    synced++
  }

  // Upsert dans EngagementMetric
  for (const [dateStr, stats] of Object.entries(byDate)) {
    const existing = await db.engagementMetric.findFirst({
      where: { userId, date: dateStr },
    })

    if (existing) {
      await db.engagementMetric.update({
        where: { id: existing.id },
        data: {
          likes: stats.totalLikes,
          comments: stats.totalComments,
          shares: stats.totalShares,
          views: stats.totalViews,
          clicks: stats.totalClicks,
        },
      })
    } else {
      await db.engagementMetric.create({
        data: {
          userId,
          date: dateStr,
          likes: stats.totalLikes,
          comments: stats.totalComments,
          shares: stats.totalShares,
          views: stats.totalViews,
          clicks: stats.totalClicks,
        },
      })
    }
  }

  await db.linkedInAccount.update({
    where: { id: account.id },
    data: { lastSyncAt: new Date() },
  })

  return { synced, errors }
}

// ============================================================
// Supprimer un post sur LinkedIn (via API)
// ============================================================
export async function deletePostOnLinkedIn(
  accessToken: string,
  postUrn: string
): Promise<boolean> {
  const res = await fetch(
    `${LINKEDIN_API_BASE}/ugcPosts/${encodeURIComponent(postUrn)}`,
    {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  )
  return res.ok || res.status === 204
}
