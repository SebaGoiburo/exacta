import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { Link } from '@/i18n/navigation'
import type { Locale } from '@/i18n/routing'
import { RichText } from '@payloadcms/richtext-lexical/react'
import { formatDate, getPost } from '@/lib/content'
import { absoluteUrl, pageAlternates } from '@/lib/seo'
import { site } from '@/lib/site'
import { JsonLd } from '@/components/seo/json-ld'
import { ArrowRight } from '@/components/ui/icons'

type Props = { params: Promise<{ locale: string; slug: string }> }

// Reads the CMS on each request (cached per collection), so the build needs no database.
export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = (await params) as { locale: Locale; slug: string }
  const post = await getPost(slug)
  if (!post) return {}
  return {
    title: `${post.title[locale]} · Exacta`,
    description: post.excerpt[locale],
    alternates: pageAlternates(locale, `/blog/${slug}`),
    // Sample articles are placeholders and stay out of search engines.
    ...(post.sample ? { robots: { index: false, follow: true } } : {}),
    openGraph: {
      type: 'article',
      title: post.title[locale],
      description: post.excerpt[locale],
      publishedTime: post.date,
    },
  }
}

export default async function BlogPost({ params }: Props) {
  const { locale, slug } = (await params) as { locale: Locale; slug: string }
  setRequestLocale(locale)
  const post = await getPost(slug)
  if (!post) notFound()
  const t = await getTranslations('blog')

  return (
    <article className="container-x pt-40 pb-28 md:pt-48">
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@graph': [
            {
              '@type': 'BlogPosting',
              headline: post.title[locale],
              description: post.excerpt[locale],
              datePublished: post.date,
              inLanguage: locale,
              mainEntityOfPage: absoluteUrl(locale, `/blog/${slug}`),
              author: { '@id': `${site.url}/#organization` },
              publisher: { '@id': `${site.url}/#organization` },
            },
            {
              '@type': 'BreadcrumbList',
              itemListElement: [
                { '@type': 'ListItem', position: 1, name: 'Exacta', item: absoluteUrl(locale) },
                { '@type': 'ListItem', position: 2, name: 'Blog', item: absoluteUrl(locale, '/blog') },
                { '@type': 'ListItem', position: 3, name: post.title[locale] },
              ],
            },
          ],
        }}
      />
      <div className="mx-auto max-w-3xl">
        <Link
          href="/blog"
          className="inline-flex items-center gap-2 text-sm font-semibold text-ink-soft transition-colors hover:text-accent"
        >
          <ArrowRight className="size-4 rotate-180" />
          {t('back')}
        </Link>
        <p className="mt-10 text-sm text-ink-soft">
          {formatDate(post.date, locale)} · {t('minutes', { n: post.readingMinutes })}
          {post.sample && <span className="ml-2 text-ink-mute">· {t('sample')}</span>}
        </p>
        <h1 className="h-display mt-5 text-[clamp(2.25rem,1.6rem+2.8vw,4rem)] text-ink">{post.title[locale]}</h1>
        <p className="mt-6 text-xl leading-relaxed text-ink-soft">{post.excerpt[locale]}</p>
        <div className="mt-12 border-t border-line pt-12">
          {post.content[locale] && <RichText data={post.content[locale]} className="rich" />}
        </div>
      </div>
    </article>
  )
}
