import Link from 'next/link'

export const metadata = {
  title: 'Mentions légales — DataSphere',
  description: 'Mentions légales de DataSphere',
}

export default function NoticePage() {
  return (
    <div className="min-h-screen bg-white">
      <header className="border-b bg-white/80 backdrop-blur sticky top-0 z-10">
        <nav className="max-w-4xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 font-bold text-xl">
            <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center text-white text-sm">DS</span>
            DataSphere
          </Link>
          <div className="flex items-center gap-4 text-sm">
            <Link href="/legal/terms" className="text-slate-600 hover:text-slate-900">CGU</Link>
            <Link href="/legal/privacy" className="text-slate-600 hover:text-slate-900">Confidentialité</Link>
            <Link href="/legal/notice" className="font-medium text-slate-900">Mentions légales</Link>
          </div>
        </nav>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-bold text-slate-900 mb-8">Mentions légales</h1>

        <div className="prose prose-slate max-w-none space-y-6 text-slate-700">
          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-2">Éditeur</h2>
            <p>
              DataSphere est édité par :<br />
              <strong>[Raison sociale de votre société]</strong><br />
              [Forme juridique : SAS / SARL / etc.] au capital de [X] €<br />
              Siège social : [Adresse complète]<br />
              RCS : [Ville] B [Numéro]<br />
              SIRET : [Numéro SIRET]<br />
              TVA intracommunautaire : [Numéro TVA]<br />
              Email : <a href="mailto:contact@datasphere.app" className="text-blue-600 hover:underline">contact@datasphere.app</a>
            </p>
            <p className="text-sm text-slate-500 mt-2">
              ⚠️ Pensez à remplacer les [placeholders] par vos informations réelles avant la mise en production.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-2">Directeur de la publication</h2>
            <p>
              [Prénom Nom du directeur de la publication]
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-2">Hébergement</h2>
            <p>
              Le Service est hébergé par :<br />
              <strong>Render</strong> (Cloud-hosted platform)<br />
              525 University Ave, Suite 1250<br />
              San Francisco, CA 94104, USA<br />
              https://render.com
            </p>
            <p>
              Hébergement des données sur le datacenter de <strong>Francfort, Allemagne</strong> (RGPD-compliant).
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-2">Paiement</h2>
            <p>
              Les paiements sont traités par <strong>Stripe</strong> :<br />
              Stripe, Inc.<br />
              354 Oyster Point Blvd<br />
              South San Francisco, CA 94080, USA<br />
              https://stripe.com
            </p>
            <p>
              DataSphere ne stocke jamais les coordonnées bancaires de ses clients. Seul le customer ID Stripe est conservé.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-2">Génération de contenu par IA</h2>
            <p>
              La génération de contenu LinkedIn est assurée par <strong>Z.ai</strong>. Le contenu envoyé
              à l'IA pour génération n'est pas stocké par Z.ai au-delà de la durée de la requête.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-2">Propriété intellectuelle</h2>
            <p>
              Le Service, son code, son design et ses marques sont la propriété exclusive de [Votre société].
              L'utilisateur conserve la propriété du contenu qu'il génère et publie via le Service.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-2">Médiation de la consommation</h2>
            <p>
              Conformément à l'article L.612-1 du Code de la consommation, le consommateur peut recourir
              gratuitement à un médiateur de la consommation en vue de la résolution amiable d'un litige
              qui l'opposerait à [Votre société].
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-2">Contact</h2>
            <p>
              Pour toute question : <a href="mailto:contact@datasphere.app" className="text-blue-600 hover:underline">contact@datasphere.app</a>
            </p>
          </section>
        </div>

        <div className="mt-12 pt-8 border-t border-slate-200 flex justify-between text-sm">
          <Link href="/legal/privacy" className="text-slate-600 hover:text-slate-900">← Politique de confidentialité</Link>
          <Link href="/legal/terms" className="text-slate-600 hover:text-slate-900">CGU →</Link>
        </div>
      </main>
    </div>
  )
}
