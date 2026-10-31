import Link from 'next/link'
import { BLOG_ARTICLES } from '@/lib/blog'
import { Badge } from '@/components/ui/badge'
import { Clock } from 'lucide-react'

export const metadata = {
  title: 'Blog — DataSphere',
  description: 'Conseils, analyses et bonnes pratiques pour automatiser votre LinkedIn avec l\'IA.',
}

export default function BlogPage() {
  return (
    <div className="min-h-screen bg-white">
      <header className="border-b bg-white/80 backdrop-blur sticky top-0 z-10">
        <nav className="max-w-4xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 font-bold text-xl">
            <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center text-white text-sm">DS</span>
            DataSphere
          </Link>
          <div className="flex items-center gap-4 text-sm">
            <Link href="/blog" className="font-medium text-slate-900">Blog</Link>
            <Link href="/pricing" className="text-slate-600 hover:text-slate-900">Tarifs</Link>
            <Link href="/register" className="text-slate-600 hover:text-slate-900">Essai gratuit</Link>
          </div>
        </nav>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-12">
        <div className="mb-12">
          <Badge variant="secondary" className="mb-4">Blog DataSphere</Badge>
          <h1 className="text-4xl font-bold text-slate-900 mb-3">
            Conseils & analyses LinkedIn
          </h1>
          <p className="text-lg text-slate-600">
            Tout savoir pour automatiser votre présence LinkedIn avec l'IA.
          </p>
        </div>

        <div className="grid gap-8">
          {BLOG_ARTICLES.map((article) => (
            <Link
              key={article.slug}
              href={`/blog/${article.slug}`}
              className="group block p-6 rounded-xl border border-slate-200 hover:border-emerald-300 hover:shadow-md transition-all"
            >
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="outline">{article.category}</Badge>
                <span className="text-xs text-slate-400 flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {article.readTime} min
                </span>
                <span className="text-xs text-slate-400">
                  · {new Date(article.publishedAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                </span>
              </div>
              <h2 className="text-xl font-bold text-slate-900 group-hover:text-emerald-700 transition-colors mb-2">
                {article.title}
              </h2>
              <p className="text-slate-600 text-sm">{article.excerpt}</p>
              <div className="flex gap-2 mt-3">
                {article.tags.map(tag => (
                  <span key={tag} className="text-xs text-emerald-600 font-medium">#{tag}</span>
                ))}
              </div>
            </Link>
          ))}
        </div>

        {/* CTA */}
        <div className="mt-16 p-8 rounded-2xl bg-gradient-to-br from-emerald-50 to-blue-50 border border-emerald-200 text-center">
          <h2 className="text-2xl font-bold text-slate-900 mb-2">
            Prêt à automatiser votre LinkedIn ?
          </h2>
          <p className="text-slate-600 mb-4">
            Essai gratuit 14 jours, sans carte bancaire.
          </p>
          <Link href="/register">
            <span className="inline-block bg-emerald-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-emerald-700 transition-colors">
              Commencer maintenant
            </span>
          </Link>
        </div>
      </main>
    </div>
  )
}
