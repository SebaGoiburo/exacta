import Image from 'next/image'
import { getTranslations } from 'next-intl/server'
import { Link } from '@/i18n/navigation'
import type { Locale } from '@/i18n/routing'
import type { Landing } from '@/content/landings'
import { landingPath, landings } from '@/content/landings'
import type { CaseStudy, Product } from '@/content/types'
import { getCases, getProducts } from '@/lib/content'
import { absoluteUrl } from '@/lib/seo'
import { site, whatsappLink } from '@/lib/site'
import { Contact } from '@/components/home/contact'
import { FaqSection } from '@/components/home/faq'
import { PlexSyncPanel } from '@/components/home/plex-sync-panel'
import { RegMarks } from '@/components/motion/spotlight'
import { JsonLd } from '@/components/seo/json-ld'
import { ArrowRight, WhatsApp } from '@/components/ui/icons'
import { ManualCostCalculator } from './manual-cost-calculator'

type Props = { landing: Landing; locale: Locale }

export async function LandingPage({ landing, locale }: Props) {
  const t = await getTranslations('landing')
  const hero = await getTranslations('hero')
  const pain = await getTranslations('pain')
  const tw = await getTranslations('whatsapp')
  const name = landing.name[locale]
  const path = landingPath(landing)

  return (
    <>
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@graph': [
            {
              '@type': 'Service',
              name: landing.metaTitle[locale],
              description: landing.metaDescription[locale],
              url: absoluteUrl(locale, path),
              provider: { '@id': `${site.url}/#organization` },
            },
            {
              '@type': 'BreadcrumbList',
              itemListElement: [
                { '@type': 'ListItem', position: 1, name: 'Exacta', item: absoluteUrl(locale) },
                { '@type': 'ListItem', position: 2, name },
              ],
            },
          ],
        }}
      />

      <section className="container-x pt-36 pb-20 md:pt-44 md:pb-28">
        <div className="grid items-center gap-14 lg:grid-cols-12 lg:gap-16">
          <div className="lg:col-span-7">
            <p className="eyebrow" data-intro="0">
              {name}
            </p>
            <h1 className="h-display mt-6 text-[clamp(2.5rem,1.7rem+3.6vw,4.75rem)] text-ink" data-intro="1">
              {landing.title[locale]}
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-relaxed text-ink-soft md:text-xl" data-intro="2">
              {landing.lead[locale]}
            </p>
            <div className="mt-9 flex flex-wrap gap-3" data-intro="3">
              <Link href="/diagnostico" className="btn btn-primary">
                {hero('ctaPrimary')}
                <ArrowRight className="btn-arrow size-4" />
              </Link>
              <a href={whatsappLink(tw('service', { service: name }))} target="_blank" rel="noopener" className="btn btn-ghost">
                <WhatsApp className="size-4" />
                {t('whatsapp')}
              </a>
            </div>
            <p className="mt-4 text-sm text-ink-soft" data-intro="4">
              {hero('note')}
            </p>
          </div>

          <div className="lg:col-span-5" data-intro="2">
            <div className="reg-card relative p-6 md:p-8">
              <RegMarks />
              <ul className="grid gap-6">
                {landing.shift.map((row) => (
                  <li key={row.today.es} className="border-b border-line pb-6 last:border-0 last:pb-0">
                    <p className="text-sm leading-snug text-ink-soft">
                      <span className="sr-only">{t('today')}: </span>
                      {row.today[locale]}
                    </p>
                    <p className="mt-2 flex gap-2.5 font-medium leading-snug text-ink">
                      <span className="mt-[0.5em] size-1.5 shrink-0 rounded-full bg-gold" aria-hidden />
                      <span>
                        <span className="sr-only">{t('after')}: </span>
                        {row.after[locale]}
                      </span>
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section className="border-t border-line py-24 md:py-32" aria-labelledby="problems-title">
        <div className="container-x">
          <h2 id="problems-title" className="h-section max-w-3xl text-ink" data-reveal>
            {t('problems')}
          </h2>
          <ul className="mt-14 border-t border-line">
            {landing.problems.map((p) => (
              <li key={p.title.es} className="grid gap-3 border-b border-line py-8 md:grid-cols-12 md:gap-8 md:py-10" data-reveal>
                <p className="md:col-span-3">
                  <span className="block text-sm text-ink-soft">{pain('costLabel')}</span>
                  <span className="font-display text-2xl font-semibold tracking-[-0.02em] text-gold md:text-3xl">{p.cost[locale]}</span>
                </p>
                <h3 className="text-2xl font-semibold leading-tight tracking-[-0.02em] text-ink md:col-span-4">{p.title[locale]}</h3>
                <p className="leading-relaxed text-ink-soft md:col-span-5">{p.body[locale]}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="bg-surface py-24 md:py-32" aria-labelledby="build-title">
        <div className="container-x">
          <h2 id="build-title" className="h-section text-ink" data-reveal>
            {landing.buildTitle[locale]}
          </h2>
          <ul className="mt-14 grid gap-x-10 gap-y-12 sm:grid-cols-2 lg:grid-cols-4">
            {landing.build.map((b) => (
              <li key={b.title.es} className="border-t-2 border-accent pt-5" data-reveal>
                <h3 className="text-xl font-semibold leading-snug tracking-[-0.015em] text-ink md:text-2xl">{b.title[locale]}</h3>
                <p className="mt-3 leading-relaxed text-ink-soft">{b.body[locale]}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <ManualCostCalculator task={landing.task[locale]} />

      <Proof landing={landing} locale={locale} />

      <section className="border-t border-line py-24 md:py-32" aria-labelledby="steps-title">
        <div className="container-x">
          <h2 id="steps-title" className="h-section text-ink" data-reveal>
            {t('steps.title')}
          </h2>
          <ol className="mt-14 grid gap-10 md:grid-cols-3">
            {(t.raw('steps.items') as { title: string; body: string }[]).map((step, i) => (
              <li key={step.title} data-reveal data-reveal-delay={i * 0.06}>
                <span aria-hidden className="font-display text-5xl font-semibold tracking-[-0.04em] text-gold">
                  {i + 1}
                </span>
                <h3 className="mt-5 text-2xl font-semibold tracking-[-0.02em] text-ink">{step.title}</h3>
                <p className="mt-3 leading-relaxed text-ink-soft">{step.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <FaqSection items={landing.faqs} />

      <Related current={landing} locale={locale} />

      <Contact />
    </>
  )
}

async function Proof({ landing, locale }: Props) {
  const { caseSlug, productSlugs = [], tryIt } = landing.proof
  const t = await getTranslations('landing')
  const cases = caseSlug ? await getCases() : []
  const products = productSlugs.length ? await getProducts() : []
  const story = cases.find((c) => c.slug === caseSlug && !c.placeholder)
  const shown = productSlugs.map((slug) => products.find((p) => p.slug === slug)).filter((p): p is Product => Boolean(p))

  return (
    <section className="bg-surface py-24 md:py-32" aria-labelledby="proof-title">
      <div className="container-x">
        <h2 id="proof-title" className="h-section max-w-3xl text-ink" data-reveal>
          {t('proof')}
        </h2>
        <div className="mt-14 flex flex-col gap-20 md:gap-28">
          {story && <CaseProof story={story} locale={locale} />}
          {shown.map((p, i) => (
            <ProductProof key={p.slug} product={p} locale={locale} flip={i % 2 === 1} />
          ))}
          {tryIt && <TryIt kind={tryIt} />}
        </div>
      </div>
    </section>
  )
}

async function CaseProof({ story, locale }: { story: CaseStudy; locale: Locale }) {
  const t = await getTranslations('cases')

  return (
    <article className="grid gap-10 lg:grid-cols-12 lg:gap-16">
      <div className="lg:col-span-5" data-reveal>
        {story.image && (
          <div className="relative aspect-[4/5] overflow-hidden">
            <Image src={story.image} alt={story.client} fill sizes="(min-width: 1024px) 40vw, 100vw" className="object-cover" />
          </div>
        )}
        <p className="mt-5 text-lg font-semibold text-ink">{story.client}</p>
        <p className="text-ink-soft">{story.role[locale]}</p>
      </div>
      <div className="lg:col-span-7">
        <p className="h-display text-[clamp(2.75rem,1.5rem+5vw,6rem)] leading-[0.95] text-gold" data-reveal>
          <span className="whitespace-nowrap">{story.metric.before[locale]}</span> <span aria-hidden>→</span>{' '}
          <span className="whitespace-nowrap">{story.metric.after[locale]}</span>
        </p>
        <p className="mt-4 text-lg text-ink" data-reveal>
          {story.metric.label[locale]}
        </p>
        <div className="mt-10 grid gap-8 sm:grid-cols-2" data-reveal>
          <div>
            <h3 className="font-semibold text-ink">{t('challenge')}</h3>
            <p className="mt-2 leading-relaxed text-ink-soft">{story.challenge[locale]}</p>
          </div>
          <div>
            <h3 className="font-semibold text-ink">{t('solution')}</h3>
            <p className="mt-2 leading-relaxed text-ink-soft">{story.solution[locale]}</p>
          </div>
        </div>
        {story.quote && (
          <blockquote className="mt-10 border-l-2 border-gold pl-6 text-xl leading-relaxed text-ink" data-reveal>
            {story.quote[locale]}
          </blockquote>
        )}
      </div>
    </article>
  )
}

async function ProductProof({ product: p, locale, flip }: { product: Product; locale: Locale; flip: boolean }) {
  const t = await getTranslations('products')
  const label = (
    <>
      {t('visit', { name: p.name })}
      <ArrowRight className={`btn-arrow size-4 ${p.external ? '-rotate-45' : ''}`} />
    </>
  )

  return (
    <article className="grid items-center gap-10 lg:grid-cols-12 lg:gap-16">
      <figure className={`reg-card relative overflow-hidden !bg-bg lg:col-span-7 ${flip ? 'lg:order-2' : ''}`} data-reveal>
        <RegMarks />
        {p.image ? (
          <div className="relative aspect-[1140/670]">
            <Image src={p.image.src} alt={p.image.alt[locale]} fill sizes="(min-width: 1024px) 55vw, 100vw" className="object-cover" />
          </div>
        ) : (
          <PlexSyncPanel exampleLabel={t('exampleData')} locale={locale} />
        )}
      </figure>
      <div className={`lg:col-span-5 ${flip ? 'lg:order-1' : ''}`}>
        <h3 className="text-[clamp(2rem,1.4rem+2vw,3rem)] font-semibold leading-none tracking-[-0.035em] text-ink" data-reveal>
          {p.name}
        </h3>
        <p className="mt-5 text-xl font-medium leading-snug text-ink" data-reveal>
          {p.tagline[locale]}
        </p>
        <p className="mt-4 leading-relaxed text-ink-soft" data-reveal>
          {p.body[locale]}
        </p>
        <div className="mt-8" data-reveal>
          {p.external ? (
            <a href={p.href} target="_blank" rel="noopener" className="btn btn-ghost">
              {label}
            </a>
          ) : (
            <Link href={p.href} className="btn btn-ghost">
              {label}
            </Link>
          )}
        </div>
      </div>
    </article>
  )
}

async function TryIt({ kind }: { kind: NonNullable<Landing['proof']['tryIt']> }) {
  const t = await getTranslations(`landing.tryIt.${kind}`)
  const isAgent = kind === 'agent'
  const className =
    'inline-flex items-center gap-2 rounded-full bg-accent-ink px-6 py-3.5 text-sm font-semibold text-accent transition-transform duration-300 hover:-translate-y-0.5'

  return (
    <div className="grid gap-8 bg-accent p-8 text-accent-ink md:p-14 lg:grid-cols-12 lg:items-center" data-reveal>
      <div className="lg:col-span-8">
        <h3 className="text-[clamp(1.75rem,1.3rem+1.8vw,2.75rem)] font-semibold leading-tight tracking-[-0.025em]">{t('title')}</h3>
        <p className="mt-4 max-w-2xl text-lg leading-relaxed">{t('body')}</p>
      </div>
      <div className="lg:col-span-4 lg:justify-self-end">
        {isAgent ? (
          <a href={whatsappLink(t('message'))} target="_blank" rel="noopener" className={className}>
            <WhatsApp className="size-4" />
            {t('cta')}
          </a>
        ) : (
          <Link href="/diagnostico" className={className}>
            {t('cta')}
            <ArrowRight className="size-4" />
          </Link>
        )}
      </div>
    </div>
  )
}

async function Related({ current, locale }: { current: Landing; locale: Locale }) {
  const t = await getTranslations('landing')
  const groups = [
    { key: 'soluciones', title: t('solutions') },
    { key: 'industrias', title: t('industries') },
  ] as const

  return (
    <section className="border-t border-line py-20" aria-labelledby="related-title">
      <div className="container-x grid gap-10 lg:grid-cols-12">
        <h2 id="related-title" className="text-3xl font-semibold tracking-[-0.025em] text-ink lg:col-span-4" data-reveal>
          {t('related')}
        </h2>
        {groups.map((group) => (
          <div key={group.key} className="lg:col-span-4" data-reveal>
            <h3 className="font-semibold text-ink-soft">{group.title}</h3>
            <ul className="mt-4">
              {landings
                .filter((l) => l.kind === group.key && l !== current)
                .map((l) => (
                  <li key={l.slug} className="border-b border-line">
                    <Link
                      href={landingPath(l)}
                      className="flex items-center justify-between gap-4 py-3.5 font-medium text-ink transition-colors hover:text-accent"
                    >
                      {l.name[locale]}
                      <ArrowRight className="size-4 shrink-0" />
                    </Link>
                  </li>
                ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  )
}
