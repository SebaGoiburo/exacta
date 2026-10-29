import Image from 'next/image'
import { getLocale, getTranslations } from 'next-intl/server'
import { Link } from '@/i18n/navigation'
import type { Locale } from '@/i18n/routing'
import type { Product } from '@/content/types'
import { getProducts } from '@/lib/content'
import { RegMarks } from '@/components/motion/spotlight'
import { ArrowRight } from '@/components/ui/icons'
import { PlexSyncPanel } from './plex-sync-panel'

export async function Products() {
  const t = await getTranslations('products')
  const locale = (await getLocale()) as Locale
  const products = await getProducts()

  return (
    <section id="productos" className="scroll-mt-20 bg-surface py-24 md:py-36" aria-labelledby="products-title">
      <div className="container-x">
        <div className="grid gap-6 lg:grid-cols-12 lg:items-end">
          <h2 id="products-title" className="h-section text-ink lg:col-span-6" data-reveal>
            {t('title')}
          </h2>
          <p className="text-lg leading-relaxed text-ink-soft lg:col-span-6" data-reveal data-reveal-delay="0.08">
            {t('lead')}
          </p>
        </div>

        <div className="mt-20 flex flex-col gap-24 md:gap-32">
          {products.map((p, i) => (
            <ProductRow key={p.slug} p={p} locale={locale} flip={i % 2 === 1} t={t} />
          ))}
        </div>
      </div>
    </section>
  )
}

function ProductRow({
  p,
  locale,
  flip,
  t,
}: {
  p: Product
  locale: Locale
  flip: boolean
  t: Awaited<ReturnType<typeof getTranslations<'products'>>>
}) {
  const cta = (
    <span className="inline-flex items-center gap-2">
      {t('visit', { name: p.name })}
      <ArrowRight className={`btn-arrow size-4 ${p.external ? '-rotate-45' : ''}`} />
    </span>
  )

  return (
    <article className="group grid items-center gap-10 lg:grid-cols-12 lg:gap-16">
      <div className={`lg:col-span-7 ${flip ? 'lg:order-2' : ''}`} data-reveal>
        <figure className="reg-card relative overflow-hidden !bg-bg">
          <RegMarks />
          {p.image ? (
            <div className="relative aspect-[1140/670] overflow-hidden">
              <Image
                src={p.image.src}
                alt={p.image.alt[locale]}
                fill
                sizes="(min-width: 1024px) 55vw, 100vw"
                className="object-cover transition-transform duration-[1.2s] ease-[var(--ease-precise)] group-hover:scale-[1.03]"
              />
            </div>
          ) : (
            <PlexSyncPanel exampleLabel={t('exampleData')} locale={locale} />
          )}
        </figure>
      </div>

      <div className={`lg:col-span-5 ${flip ? 'lg:order-1' : ''}`}>
        <h3 className="text-[clamp(2rem,1.4rem+2.4vw,3.5rem)] font-semibold leading-none tracking-[-0.035em] text-ink" data-reveal>
          {p.name}
        </h3>
        <p className="mt-5 text-xl leading-snug font-medium text-ink" data-reveal data-reveal-delay="0.06">
          {p.tagline[locale]}
        </p>
        <p className="mt-4 leading-relaxed text-ink-soft" data-reveal data-reveal-delay="0.1">
          {p.body[locale]}
        </p>
        <ul className="mt-6 grid gap-2 sm:grid-cols-2" data-reveal data-reveal-delay="0.14">
          {p.features[locale].map((f) => (
            <li key={f} className="flex gap-2.5 text-[0.95rem] text-ink">
              <span className="mt-[0.6em] size-1.5 shrink-0 rounded-full bg-accent" aria-hidden />
              {f}
            </li>
          ))}
        </ul>
        <p className="mt-6 text-sm text-ink-soft" data-reveal data-reveal-delay="0.16">
          <span className="font-semibold text-ink">{t('for')}:</span> {p.audience[locale]}
        </p>
        <div className="mt-8" data-reveal data-reveal-delay="0.2">
          {p.external ? (
            <a href={p.href} target="_blank" rel="noopener" className="btn btn-ghost">
              {cta}
            </a>
          ) : (
            <Link href={p.href} className="btn btn-ghost">
              {cta}
            </Link>
          )}
        </div>
      </div>
    </article>
  )
}
