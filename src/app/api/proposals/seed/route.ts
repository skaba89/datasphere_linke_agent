import { db } from '@/lib/db'
import { NextResponse } from 'next/server'
import { getCurrentUserId } from '@/lib/auth'

const PROPOSALS = [
  {
    title: "Pourquoi l'IA va révolutionner votre stratégie content en 2025",
    content: "Soyons honnêtes : la plupart des posts LinkedIn sont ennuyeux. Voici 5 stratégies qui ont changé ma vie professionnelle :\n\n1️⃣ Commencez par une accroche forte\n2️⃣ Racontez une histoire personnelle\n3️⃣ Ajoutez des données concrètes\n4️⃣ Terminez par un CTA clair\n5️⃣ Publiez au bon moment\n\nRésultat ? Mon engagement a explosé de 300% en 2 mois.\n\nQuel est votre secret pour le contenu LinkedIn ? 👇",
    hashtags: "#Marketing #IA #LinkedIn #GrowthHacking",
    format: "Liste",
    angle: "éducatif",
    targetAudience: "entrepreneurs et CTO",
    qualityScore: 9.2,
    optimalTime: "08:30",
    status: "pending",
    engagementEst: "Très élevé",
  },
  {
    title: "5 leçons de 0 à 100K abonnés LinkedIn",
    content: "Il y a 6 mois, j'étais à 500 abonnés. Aujourd'hui, j'en ai plus de 100K.\n\nLa différence ? J'ai arrêté de publier n'importe comment.\n\nVoici mon framework exact :\n\n🎯 Lundi : Opinion forte\n🎯 Mercredi : Tutoriel\n🎯 Vendredi : Story personnelle\n\nLa constance bat la perfection. Chaque fois.\n\nQui est prêt à passer à l'action ? 💪",
    hashtags: "#PersonalBranding #RéseauxSociaux #B2B #Leadership",
    format: "Storytelling",
    angle: "inspirant",
    targetAudience: "entrepreneurs et CTO",
    qualityScore: 8.7,
    optimalTime: "09:15",
    status: "approved",
    engagementEst: "Élevé+",
  },
  {
    title: "Le secret des posts viraux que personne ne vous dit",
    content: "J'ai analysé 1000 posts LinkedIn viraux. Voici ce qu'ils ont en commun :\n\n✅ Un premier ligne qui intrigue\n✅ Des paragraphes courts (2-3 lignes max)\n✅ Des émojis utilisés stratégiquement\n✅ Un CTA en fin de post\n❌ Jamais de jargon technique\n❌ Pas de lien externe\n\nLe contenu qui performe n'est pas compliqué. Il est stratégique.\n\nSauvegardez ce post pour votre prochain contenu 📌",
    hashtags: "#LinkedInTips #DigitalMarketing #Strategy #Viral",
    format: "Conseil",
    angle: "expert",
    targetAudience: "entrepreneurs et CTO",
    qualityScore: 9.5,
    optimalTime: "12:00",
    status: "pending",
    engagementEst: "Très élevé",
  },
  {
    title: "Comment j'ai doublé mon engagement en 30 jours",
    content: "On m'a dit que publier sur LinkedIn était une perte de temps.\n\n6 mois plus tard :\n- 3 offres d'emploi reçues\n- 2 contrats clients signés\n- 1 communauté de 50K personnes\n\nLe ROI de LinkedIn est mésestimé par 95% des professionnels.\n\nLa clé ? Créer de la valeur avant de demander quoi que ce soit.\n\nQui a eu des opportunités grâce à LinkedIn ? Partagez 👇",
    hashtags: "#Entrepreneuriat #Succès #Networking #B2B",
    format: "Storytelling",
    angle: "humain",
    targetAudience: "entrepreneurs et CTO",
    qualityScore: 8.4,
    optimalTime: "18:30",
    status: "approved",
    engagementEst: "Élevé",
  },
  {
    title: "Les 3 erreurs fatales sur LinkedIn",
    content: "Chaque matin, je passe 30 minutes sur une routine simple :\n\n☕ 5 min : Scanner les tendances\n📝 15 min : Écrire mon post\n📐 10 min : Formater et programmer\n\nCe rituel m'a permis de :\n- Publier 150+ posts par an\n- Atteindre 50K vues/mois\n- Générer 20 leads qualifiés/semaine\n\nLe secret n'est pas le talent. C'est la systématisation.\n\nQuelle est votre routine de création ?",
    hashtags: "#Productivité #Tech #Startup #Innovation",
    format: "Liste",
    angle: "éducatif",
    targetAudience: "entrepreneurs et CTO",
    qualityScore: 7.8,
    optimalTime: "08:00",
    status: "rejected",
    engagementEst: "Moyen",
  },
  {
    title: "Pourquoi 90% des entrepreneurs ratent leur contenu",
    content: "Question provocatrice :\n\nSi votre contenu LinkedIn ne génère pas d'engagement, est-ce le problème de l'algorithme... ou le vôtre ?\n\nAprès avoir audité 200 profils, voici le pattern clair :\n\n❌ Parler de soi sans apporter de valeur\n❌ Publier des slogans publicitaires\n❌ Ignorer les commentaires\n❌ Être inconsistent\n\nLe contenu qui gagne = Valeur + Régularité + Authenticité.\n\nD'accord ou pas ? Débattons en commentaires 🔥",
    hashtags: "#Entrepreneuriat #Marketing #IA #LinkedInTips",
    format: "Question",
    angle: "provocateur",
    targetAudience: "entrepreneurs et CTO",
    qualityScore: 9.1,
    optimalTime: "09:00",
    status: "rejected",
    engagementEst: "Élevé",
  },
]

export async function POST() {
  try {
    const userId = await getCurrentUserId()
    // Delete existing one by one (SQLite compatible) - scope à l'utilisateur si authentifié
    const existing = await db.postProposal.findMany({
      where: userId ? { userId } : {},
      select: { id: true },
    })
    for (const p of existing) {
      await db.postProposal.delete({ where: { id: p.id } })
    }

    // Create new proposals one by one
    const created = []
    for (const data of PROPOSALS) {
      const p = await db.postProposal.create({
        data: { ...data, userId: userId || null },
      })
      created.push(p)
    }

    return NextResponse.json({ success: true, data: created, count: created.length })
  } catch (error: any) {
    console.error('[SEED ERROR]', error.message)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}