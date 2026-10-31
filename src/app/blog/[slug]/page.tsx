import Link from 'next/link'
import { notFound } from 'next/navigation'
import { BLOG_ARTICLES, getArticleBySlug, getRelatedArticles } from '@/lib/blog'
import { Badge } from '@/components/ui/badge'
import { Clock, ArrowLeft, ArrowRight } from 'lucide-react'
import ReactMarkdown from 'react-markdown'

export async function generateStaticParams() {
  return BLOG_ARTICLES.map(a => ({ slug: a.slug }))
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const article = getArticleBySlug(slug)
  if (!article) return { title: 'Article introuvable — DataSphere' }
  return {
    title: `${article.title} — DataSphere Blog`,
    description: article.excerpt,
    openGraph: {
      title: article.title,
      description: article.excerpt,
      type: 'article',
    },
  }
}

export default async function ArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const article = getArticleBySlug(slug)
  if (!article) notFound()

  const related = getRelatedArticles(slug, 2)

  return (
    <div className="min-h-screen bg-white">
      <header className="border-b bg-white/80 backdrop-blur sticky top-0 z-10">
        <nav className="max-w-3xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 font-bold text-xl">
            <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center text-white text-sm">DS</span>
            DataSphere
          </Link>
          <Link href="/blog" className="text-sm text-slate-600 hover:text-slate-900 flex items-center gap-1">
            <ArrowLeft className="h-4 w-4" />
            Blog
          </Link>
        </nav>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-12">
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <Badge variant="outline">{article.category}</Badge>
            <span className="text-xs text-slate-400 flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {article.readTime} min
            </span>
            <span className="text-xs text-slate-400">
              · {new Date(article.publishedAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
            </span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-3">
            {article.title}
          </h1>
          <p className="text-lg text-slate-600">{article.excerpt}</p>
        </div>

        <article className="prose prose-slate max-w-none">
          <ReactMarkdown
            components={{
              h1: ({ children }) => <h1 className="text-2xl font-bold text-slate-900 mt-8 mb-4">{children}</h1>,
              h2: ({ children }) => <h2 className="text-xl font-bold text-slate-900 mt-6 mb-3">{children}</h2>,
              h3: ({ children }) => <h3 className="text-lg font-semibold text-slate-900 mt-5 mb-2">{children}</h3>,
              p: ({ children }) => <p className="text-slate-700 leading-relaxed mb-4">{children}</p>,
              ul: ({ children }) => <ul className="list-disc pl-6 space-y-1 mb-4 text-slate-700">{children}</ul>,
              ol: ({ children }) => <ol className="list-decimal pl-6 space-y-1 mb-4 text-slate-700">{children}</ol>,
              li: ({ children }) => <li className="leading-relaxed">{children}</li>,
              strong: ({ children }) => <strong className="font-semibold text-slate-900">{children}</strong>,
              code: ({ children }) => <code className="bg-slate-100 px-1.5 py-0.5 rounded text-sm text-emerald-700">{children}</code>,
              blockquote: ({ children }) => <blockquote className="border-l-4 border-emerald-400 pl-4 italic text-slate-600 my-4">{children}</blockquote>,
              table: ({ children }) => <table className="w-full border-collapse my-4">{children}</table>,
              th: ({ children }) => <th className="border border-slate-200 px-3 py-2 bg-slate-50 text-left text-sm font-semibold">{children}</th>,
              td: ({ children }) => <td className="border border-slate-200 px-3 py-2 text-sm">{children}</td>,
            }}
          >
            {article.content}
          </ReactMarkdown>
        </article>

        <div className="flex gap-2 mt-8">
          {article.tags.map(tag => (
            <span key={tag} className="text-xs text-emerald-600 font-medium">#{tag}</span>
          ))}
        </div>

        {/* CTA */}
        <div className="mt-12 p-6 rounded-xl bg-gradient-to-br from-emerald-50 to-blue-50 border border-emerald-200 text-center">
          <h3 className="text-lg font-bold text-slate-900 mb-1">Essayez DataSphere gratuitement</h3>
          <p className="text-sm text-slate-600 mb-3">14 jours d'essai, sans carte bancaire.</p>
          <Link href="/register" className="inline-block bg-emerald-600 text-white px-5 py-2.5 rounded-lg font-medium hover:bg-emerald-700 transition-colors">
            Commencer
          </Link>
        </div>

        {/* Related */}
        {related.length > 0 && (
          <div className="mt-12">
            <h3 className="text-lg font-bold text-slate-900 mb-4">Articles similaires</h3>
            <div className="grid sm:grid-cols-2 gap-4">
              {related.map(r => (
                <Link
                  key={r.slug}
                  href={`/blog/${r.slug}`}
                  className="block p-4 rounded-lg border border-slate-200 hover:border-emerald-300 hover:shadow-sm transition-all group"
                >
                  <p className="text-xs text-slate-400 mb-1">{r.category}</p>
                  <p className="font-medium text-slate-900 group-hover:text-emerald-700 text-sm">{r.title}</p>
                  <span className="inline-flex items-center gap-1 text-xs text-emerald-600 mt-2">
                    Lire <ArrowRight className="h-3 w-3" />
                  </span>
                </Link>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
