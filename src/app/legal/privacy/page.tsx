import Link from 'next/link'

export const metadata = {
  title: 'Politique de confidentialité — DataSphere',
  description: 'Politique de confidentialité RGPD de DataSphere',
}

export default function PrivacyPage() {
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
            <Link href="/legal/privacy" className="font-medium text-slate-900">Confidentialité</Link>
            <Link href="/legal/notice" className="text-slate-600 hover:text-slate-900">Mentions légales</Link>
          </div>
        </nav>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-bold text-slate-900 mb-2">Politique de confidentialité</h1>
        <p className="text-sm text-slate-500 mb-8">Dernière mise à jour : 30 octobre 2026</p>

        <div className="prose prose-slate max-w-none space-y-6 text-slate-700">
          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-2">1. Responsable du traitement</h2>
            <p>
              Le responsable du traitement des données personnelles est [Votre société], éditrice de la
              plateforme DataSphere. Contact : <a href="mailto:dpo@datasphere.app" className="text-blue-600 hover:underline">dpo@datasphere.app</a>.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-2">2. Données collectées</h2>
            <p>Nous collectons les données suivantes :</p>
            <ul className="list-disc pl-6 space-y-1">
              <li><strong>Compte DataSphere</strong> : email, nom, mot de passe (haché bcrypt), plan, date d'inscription</li>
              <li><strong>Compte LinkedIn</strong> : nom, email, photo, headline, access token (chiffré en base)</li>
              <li><strong>Contenu</strong> : propositions de posts générés par l'IA, posts publiés, analytics (likes, commentaires, vues)</li>
              <li><strong>Facturation</strong> : customer ID Stripe (nous ne stockons jamais vos coordonnées bancaires)</li>
              <li><strong>Logs techniques</strong> : IP, user agent, timestamps (à des fins de sécurité)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-2">3. Finalités du traitement</h2>
            <ul className="list-disc pl-6 space-y-1">
              <li>Fournir le Service (génération, publication, analytics)</li>
              <li>Gérer les abonnements et la facturation (Stripe)</li>
              <li>Envoyer des emails transactionnels (bienvenue, invitation, fin de trial)</li>
              <li>Améliorer le Service (analytics agrégées anonymisées)</li>
              <li>Répondre aux obligations légales</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-2">4. Base légale</h2>
            <ul className="list-disc pl-6 space-y-1">
              <li><strong>Exécution du contrat</strong> : fourniture du Service (art. 6.1.b RGPD)</li>
              <li><strong>Consentement</strong> : connexion LinkedIn, marketing (art. 6.1.a RGPD)</li>
              <li><strong>Intérêt légitime</strong> : sécurité, logs (art. 6.1.f RGPD)</li>
              <li><strong>Obligation légale</strong> : facturation (art. 6.1.c RGPD)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-2">5. Destinataires des données</h2>
            <p>Vos données sont traitées par les sous-traitants suivants :</p>
            <ul className="list-disc pl-6 space-y-1">
              <li><strong>Render</strong> (hébergement, Frankfurt, Allemagne) — stockage DB PostgreSQL et fichiers</li>
              <li><strong>Stripe</strong> (paiement) — customer ID, abonnements</li>
              <li><strong>LinkedIn</strong> — publication de posts, lecture du profil</li>
              <li><strong>Resend</strong> — envoi d'emails transactionnels</li>
              <li><strong>Z.ai</strong> — génération de contenu par IA (le contenu généré n'est pas stocké par Z.ai)</li>
            </ul>
            <p>
              Aucune donnée n'est vendue ou cédée à des tiers à des fins commerciales.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-2">6. Durée de conservation</h2>
            <ul className="list-disc pl-6 space-y-1">
              <li><strong>Compte actif</strong> : tant que le compte est actif + 12 mois après suppression</li>
              <li><strong>Logs techniques</strong> : 12 mois</li>
              <li><strong>Factures</strong> : 10 ans (obligation légale)</li>
              <li><strong>Tokens LinkedIn</strong> : supprimés immédiatement à la révocation</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-2">7. Vos droits (RGPD)</h2>
            <p>Conformément au RGPD, vous disposez des droits suivants :</p>
            <ul className="list-disc pl-6 space-y-1">
              <li><strong>Accès</strong> : obtenir une copie de vos données</li>
              <li><strong>Rectification</strong> : corriger des données inexactes</li>
              <li><strong>Effacement</strong> (« droit à l'oubli »)</li>
              <li><strong>Limitation</strong> : geler le traitement</li>
              <li><strong>Portabilité</strong> : recevoir vos données en format structuré</li>
              <li><strong>Opposition</strong> : refuser le traitement pour marketing</li>
              <li><strong>Révocation du consentement</strong> à tout moment</li>
            </ul>
            <p>
              Pour exercer ces droits, contactez-nous à <a href="mailto:dpo@datasphere.app" className="text-blue-600 hover:underline">dpo@datasphere.app</a>.
              Vous pouvez aussi déposer une réclamation auprès de la CNIL (https://www.cnil.fr).
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-2">8. Sécurité</h2>
            <p>
              Nous mettons en œuvre les mesures techniques suivantes : chiffrement HTTPS/TLS,
              hachage bcrypt (cost 12) pour les mots de passe, tokens LinkedIn chiffrés en base,
              rate limiting anti brute-force, isolation des données par utilisateur, backups PostgreSQL automatiques par Render.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-2">9. Cookies</h2>
            <p>
              Le Service utilise uniquement un cookie de session technique (httpOnly, sans tracking).
              Aucun cookie publicitaire ou analytics tiers n'est utilisé.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-2">10. Transferts hors UE</h2>
            <p>
              Les données sont hébergées en Allemagne (Render Frankfurt). Z.ai et Resend peuvent traiter
              des données aux États-Unis, dans le cadre des Clauses Contractuelles Types (CCT) validées
              par la Commission Européenne.
            </p>
          </section>
        </div>

        <div className="mt-12 pt-8 border-t border-slate-200 flex justify-between text-sm">
          <Link href="/legal/terms" className="text-slate-600 hover:text-slate-900">← CGU</Link>
          <Link href="/legal/notice" className="text-slate-600 hover:text-slate-900">Mentions légales →</Link>
        </div>
      </main>
    </div>
  )
}
