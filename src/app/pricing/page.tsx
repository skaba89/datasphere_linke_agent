import { Check } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

export const metadata = {
  title: 'Tarifs — DataSphere',
  description: 'Des prix simples et transparents pour automatiser votre LinkedIn avec l\'IA.',
}

const PLANS = [
  {
    name: 'Free',
    price: 0,
    period: '/mois',
    description: 'Pour découvrir DataSphere',
    features: [
      '1 compte LinkedIn',
      '3 propositions de posts / jour',
      'Analytics basiques (14 jours)',
      'Templates de contenu',
      'Support email',
    ],
    cta: 'Commencer gratuitement',
    highlight: false,
  },
  {
    name: 'Pro',
    price: 29,
    period: '/mois',
    description: 'Pour les créateurs sérieux',
    features: [
      '3 comptes LinkedIn',
      '20 propositions de posts / jour',
      'Smart Poster IA (génération auto)',
      'Analytics avancées (90 jours)',
      'Planification intelligente',
      'Export CSV / API',
      'Support prioritaire 24h',
    ],
    cta: 'Démarrer l\'essai 14 jours',
    highlight: true,
  },
  {
    name: 'Business',
    price: 79,
    period: '/mois',
    description: 'Pour les équipes & agences',
    features: [
      'Comptes LinkedIn illimités',
      'Propositions illimitées',
      'Multi-utilisateurs (5 sièges)',
      'Analytics avancées + benchmark',
      'Branding personnalisé',
      'White-label',
      'Support dédié + onboarding',
      'SLA 99.9%',
    ],
    cta: 'Contacter les ventes',
    highlight: false,
  },
]

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-slate-50">
      <header className="border-b bg-white/80 backdrop-blur sticky top-0 z-10">
        <nav className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 font-bold text-xl">
            <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center text-white text-sm">DS</span>
            DataSphere
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/pricing" className="text-sm font-medium text-slate-600 hover:text-slate-900">Tarifs</Link>
            <Link href="/login" className="text-sm font-medium text-slate-600 hover:text-slate-900">Connexion</Link>
            <Link href="/register">
              <Button size="sm">Essai gratuit</Button>
            </Link>
          </div>
        </nav>
      </header>

      <section className="max-w-6xl mx-auto px-6 py-20">
        <div className="text-center mb-16">
          <Badge variant="secondary" className="mb-4">Essai gratuit 14 jours — sans carte bancaire</Badge>
          <h1 className="text-4xl md:text-5xl font-bold text-slate-900 mb-4">
            Des prix simples, transparents
          </h1>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            Choisissez l'offre adaptée à votre ambition LinkedIn. Changez ou annulez à tout moment.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {PLANS.map((plan) => (
            <Card
              key={plan.name}
              className={plan.highlight ? 'border-blue-600 shadow-xl scale-105 relative' : 'relative'}
            >
              {plan.highlight && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge>Le plus populaire</Badge>
                </div>
              )}
              <CardHeader>
                <CardTitle className="text-2xl">{plan.name}</CardTitle>
                <CardDescription>{plan.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-baseline gap-1 mb-6">
                  <span className="text-4xl font-bold">{plan.price}€</span>
                  <span className="text-slate-500">{plan.period}</span>
                </div>
                <ul className="space-y-3">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm">
                      <Check className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                      <span className="text-slate-700">{f}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
              <CardFooter>
                <Link href={plan.name === 'Business' ? '/register?plan=business' : '/register'} className="w-full">
                  <Button className="w-full" variant={plan.highlight ? 'default' : 'outline'}>
                    {plan.cta}
                  </Button>
                </Link>
              </CardFooter>
            </Card>
          ))}
        </div>

        <div className="mt-20 text-center">
          <h2 className="text-2xl font-bold text-slate-900 mb-3">Questions fréquentes</h2>
          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto mt-8 text-left">
            <div>
              <h3 className="font-semibold text-slate-900 mb-2">Puis-je changer d'offre ?</h3>
              <p className="text-sm text-slate-600">Oui, à tout moment depuis votre espace. Les changements sont proratisés.</p>
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 mb-2">Mes données LinkedIn sont-elles sécurisées ?</h3>
              <p className="text-sm text-slate-600">Tokens chiffrés AES-256, conformité RGPD, hébergement Europe (Francfort).</p>
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 mb-2">Quelle méthode de paiement ?</h3>
              <p className="text-sm text-slate-600">Stripe (CB, Visa, Mastercard, Amex). Facturation mensuelle ou annuelle (-20%).</p>
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 mb-2">Y a-t-il un engagement ?</h3>
              <p className="text-sm text-slate-600">Non. Vous pouvez annuler en 1 clic, sans frais.</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
