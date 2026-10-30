import Link from 'next/link'

export const metadata = {
  title: 'CGU — DataSphere',
  description: 'Conditions Générales d\'Utilisation de DataSphere',
}

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-white">
      <header className="border-b bg-white/80 backdrop-blur sticky top-0 z-10">
        <nav className="max-w-4xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 font-bold text-xl">
            <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center text-white text-sm">DS</span>
            DataSphere
          </Link>
          <div className="flex items-center gap-4 text-sm">
            <Link href="/legal/terms" className="font-medium text-slate-900">CGU</Link>
            <Link href="/legal/privacy" className="text-slate-600 hover:text-slate-900">Confidentialité</Link>
            <Link href="/legal/notice" className="text-slate-600 hover:text-slate-900">Mentions légales</Link>
          </div>
        </nav>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-bold text-slate-900 mb-2">Conditions Générales d'Utilisation</h1>
        <p className="text-sm text-slate-500 mb-8">Dernière mise à jour : 30 octobre 2026</p>

        <div className="prose prose-slate max-w-none space-y-6 text-slate-700">
          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-2">1. Objet</h2>
            <p>
              Les présentes Conditions Générales d'Utilisation (CGU) régissent l'utilisation de la plateforme
              DataSphere (ci-après « le Service »), éditée par [Votre société], accessible à l'adresse
              https://datasphere.app (ou toute autre URL fournie).
            </p>
            <p>
              Le Service permet aux utilisateurs d'automatiser la création, la planification et la publication
              de contenu sur LinkedIn à l'aide de l'intelligence artificielle, ainsi que le suivi des
              performances.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-2">2. Acceptation des CGU</h2>
            <p>
              L'inscription au Service vaut acceptation pleine et entière des présentes CGU. L'utilisateur
              reconnaît en avoir pris connaissance et les accepter.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-2">3. Compte utilisateur</h2>
            <p>
              L'utilisateur doit créer un compte en fournissant des informations exactes. Il est responsable
              de la confidentialité de ses identifiants et de toute activité effectuée depuis son compte.
            </p>
            <p>
              Un essai gratuit de 14 jours est offert aux nouveaux utilisateurs sur le plan Pro. À l'issue
              de cet essai, le compte bascule sur le plan Free (gratuit) sauf souscription à un plan payant.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-2">4. Offres et tarifs</h2>
            <ul className="list-disc pl-6 space-y-1">
              <li><strong>Free</strong> : 0€/mois — 3 posts/jour, 1 compte LinkedIn, analytics 14 jours</li>
              <li><strong>Pro</strong> : 29€/mois — 20 posts/jour, 3 comptes LinkedIn, IA, analytics 90 jours</li>
              <li><strong>Business</strong> : 79€/mois — illimité, 5 sièges, multi-utilisateurs, white-label</li>
            </ul>
            <p>
              Les abonnements sont facturés mensuellement via Stripe. Ils sont résiliables à tout moment,
              sans frais. La résiliation prend effet à la fin de la période en cours.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-2">5. Connexion à LinkedIn</h2>
            <p>
              Le Service utilise l'API officielle LinkedIn via OAuth 2.0. L'utilisateur autorise explicitement
              DataSphere à accéder à son compte LinkedIn dans les limites des scopes demandés :
              lecture du profil, lecture de l'email, publication de posts.
            </p>
            <p>
              L'utilisateur peut révoquer cette autorisation à tout moment depuis son compte LinkedIn ou
              depuis les paramètres DataSphere. La suppression du compte DataSphere entraîne la suppression
              de tous les tokens LinkedIn associés.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-2">6. Contenu généré par IA</h2>
            <p>
              Le Service génère du contenu à l'aide de modèles d'intelligence artificielle. L'utilisateur
              reste seul responsable du contenu qu'il publie sur LinkedIn. DataSphere ne saurait être tenu
              responsable des propos, informations ou liens générés par l'IA et publiés sans validation.
            </p>
            <p>
              L'utilisateur s'engage à respecter les conditions d'utilisation de LinkedIn, les lois en
              vigueur, et à ne pas publier de contenu illégal, diffamatoire ou contraire aux bonnes mœurs.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-2">7. Multi-utilisateurs (Plan Business)</h2>
            <p>
              Le plan Business permet d'inviter jusqu'à 5 membres dans une équipe. Le propriétaire de
              l'équipe est responsable des actions de ses membres. Les invitations expirent après 7 jours.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-2">8. Limitation de responsabilité</h2>
            <p>
              Le Service est fourni « tel quel ». DataSphere ne garantit pas la disponibilité permanente
              du Service, ni l'exactitude du contenu généré par l'IA. La responsabilité de DataSphere ne
              saurait être engagée pour tout dommage indirect, perte de données ou perte de revenus.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-2">9. Données personnelles</h2>
            <p>
              Le traitement des données personnelles est décrit dans notre
              <Link href="/legal/privacy" className="text-blue-600 hover:underline"> Politique de confidentialité</Link>.
              DataSphere est conforme au RGPD.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-2">10. Résiliation</h2>
            <p>
              L'utilisateur peut supprimer son compte à tout moment. DataSphere se réserve le droit de
              suspendre ou résilier un compte en cas de manquement aux CGU ou d'utilisation abusive du Service.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-2">11. Contact</h2>
            <p>
              Pour toute question relative aux présentes CGU : <a href="mailto:contact@datasphere.app" className="text-blue-600 hover:underline">contact@datasphere.app</a>
            </p>
          </section>
        </div>

        <div className="mt-12 pt-8 border-t border-slate-200 flex justify-between text-sm">
          <Link href="/legal/privacy" className="text-slate-600 hover:text-slate-900">← Politique de confidentialité</Link>
          <Link href="/legal/notice" className="text-slate-600 hover:text-slate-900">Mentions légales →</Link>
        </div>
      </main>
    </div>
  )
}
