import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { Link } from '@/i18n/navigation'
import type { Locale } from '@/i18n/routing'
import { formatDate, getPosts } from '@/lib/content'
import { pageAlternates } from '@/lib/seo'
import { ShareButtons } from '@/components/blog/share-buttons'
import { SubscribeForm } from '@/components/blog/subscribe-form'
import { ArrowRight } from '@/components/ui/icons'

// Reads the CMS on each request (cached per collection), so the build needs no database.
export const dynamic = 'force-dynamic'

type Props = { params: Promise<{ locale: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = (await params) as { locale: Locale }
  const t = await getTranslations({ locale, namespace: 'blog' })
  return { title: t('metaTitle'), description: t('lead'), alternates: pageAlternates(locale, '/blog') }
}

export default async function BlogIndex({ params }: Props) {
  const { locale } = (await params) as { locale: Locale }
  setRequestLocale(locale)
  const t = await getTranslations('blog')
  const posts = await getPosts()

  return (
    <div className="container-x pt-40 pb-28 md:pt-48">
      <h1 className="h-display text-[clamp(3rem,2rem+5vw,6.5rem)] text-ink" data-intro="0">
        {t('title')}
      </h1>
      <p className="mt-6 max-w-lg text-lg leading-relaxed text-ink-soft" data-intro="1">
        {t('lead')}
      </p>

      <ul className="mt-20 border-t border-line">
        {posts.map((p, i) => (
          <li key={p.slug} className="border-b border-line" data-reveal data-reveal-delay={i * 0.05}>
            <Link
              href={`/blog/${p.slug}`}
              className="svc-row group grid gap-3 px-1 pt-9 pb-5 md:grid-cols-12 md:items-baseline md:gap-8 md:px-4"
            >
              <p className="text-sm text-ink-soft md:col-span-3">
                {formatDate(p.date, locale)}
                {p.sample && <span className="ml-2 text-ink-mute">· {t('sample')}</span>}
              </p>
              <div className="md:col-span-8">
                <h2 className="text-[clamp(1.4rem,1.1rem+1.2vw,2.1rem)] font-semibold leading-tight tracking-[-0.025em] text-ink">
                  {p.title[locale]}
                </h2>
                <p className="mt-3 max-w-2xl leading-relaxed text-ink-soft">{p.excerpt[locale]}</p>
              </div>
              <span className="hidden md:col-span-1 md:flex md:justify-end">
                <span className="svc-arrow grid size-11 place-items-center rounded-full border border-line-strong text-ink">
                  <ArrowRight className="size-4" />
                </span>
              </span>
            </Link>
            <div className="px-1 pb-8 md:grid md:grid-cols-12 md:gap-8 md:px-4">
              <div className="md:col-span-8 md:col-start-4">
                <ShareButtons slug={p.slug} title={p.title[locale]} excerpt={p.excerpt[locale]} />
              </div>
            </div>
          </li>
        ))}
      </ul>

      <div className="mt-20" data-reveal>
        <SubscribeForm />
      </div>
    </div>
  )
}
