import { getLocale, getTranslations } from 'next-intl/server'
import { Link } from '@/i18n/navigation'
import type { Locale } from '@/i18n/routing'
import { formatDate, getPosts } from '@/lib/content'
import { ArrowRight } from '@/components/ui/icons'

export async function BlogTeaser() {
  const t = await getTranslations('blog')
  const locale = (await getLocale()) as Locale
  const [featured, ...rest] = await getPosts(3)
  if (!featured) return null

  return (
    <section className="bg-surface py-24 md:py-36" aria-labelledby="blog-title">
      <div className="container-x">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 id="blog-title" className="h-section text-ink" data-reveal>
              {t('title')}
            </h2>
            <p className="mt-4 max-w-md text-lg leading-relaxed text-ink-soft" data-reveal data-reveal-delay="0.06">
              {t('lead')}
            </p>
          </div>
          <Link href="/blog" className="btn btn-ghost self-start md:self-auto" data-reveal>
            {t('all')}
            <ArrowRight className="btn-arrow size-4" />
          </Link>
        </div>

        <div className="mt-14 grid gap-6 lg:grid-cols-12">
          <Link
            href={`/blog/${featured.slug}`}
            className="group flex min-h-[380px] flex-col bg-bg-elev p-8 transition-colors hover:bg-bg md:p-10 lg:col-span-7"
            data-reveal
          >
            <p className="text-sm text-ink-soft">
              {formatDate(featured.date, locale)} · {t('minutes', { n: featured.readingMinutes })}
            </p>
            <h3 className="mt-auto pt-16 text-[clamp(1.75rem,1.2rem+2vw,2.75rem)] font-semibold leading-[1.08] tracking-[-0.03em] text-ink">
              {featured.title[locale]}
            </h3>
            <p className="mt-4 max-w-lg leading-relaxed text-ink-soft">{featured.excerpt[locale]}</p>
            <span className="mt-8 inline-flex items-center gap-2 text-sm font-semibold text-accent">
              {t('read')}
              <ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-1" />
            </span>
          </Link>

          <div className="grid gap-6 lg:col-span-5">
            {rest.map((p, i) => (
              <Link
                key={p.slug}
                href={`/blog/${p.slug}`}
                className="group flex flex-col bg-bg-elev p-8 transition-colors hover:bg-bg"
                data-reveal
                data-reveal-delay={0.08 * (i + 1)}
              >
                <p className="text-sm text-ink-soft">{formatDate(p.date, locale)}</p>
                <h3 className="mt-6 text-xl font-semibold leading-snug tracking-[-0.02em] text-ink transition-colors group-hover:text-accent">
                  {p.title[locale]}
                </h3>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
