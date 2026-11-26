import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getPayload } from 'payload'
import config from '@payload-config'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { Link } from '@/i18n/navigation'
import type { Locale } from '@/i18n/routing'
import { AREAS, type Area } from '@/lib/diagnostic/questions'
import { AREA_NAMES, OVERALL, RECOMMENDATIONS } from '@/lib/diagnostic/recommendations'
import { bandOf, type Tier } from '@/lib/diagnostic/scoring'
import { getSettings } from '@/lib/settings'
import { whatsappLink } from '@/lib/site'
import { ArrowRight, WhatsApp } from '@/components/ui/icons'

export const dynamic = 'force-dynamic'

type Props = { params: Promise<{ locale: string; token: string }> }

/** How many areas get a recommendation: more than this stops being a place to start. */
const NEXT_STEPS = 3

async function getDiagnostic(token: string) {
  const payload = await getPayload({ config })
  const { docs } = await payload.find({
    collection: 'diagnostics',
    where: { token: { equals: token } },
    limit: 1,
    depth: 1,
    overrideAccess: true,
  })
  return docs[0] ?? null
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = (await params) as { locale: Locale; token: string }
  const t = await getTranslations({ locale, namespace: 'diagnostic.result' })
  // Personal result: reachable only through its link, never listed by search engines.
  return { title: t('metaTitle'), robots: { index: false, follow: false } }
}

export default async function DiagnosticResult({ params }: Props) {
  const { locale, token } = (await params) as { locale: Locale; token: string }
  setRequestLocale(locale)

  const diagnostic = await getDiagnostic(token)
  if (!diagnostic) notFound()

  const t = await getTranslations('diagnostic.result')
  const settings = await getSettings()

  const areas = diagnostic.areas as Record<Area, number>
  const tier = diagnostic.tier as Tier
  const company = typeof diagnostic.contact === 'object' ? (diagnostic.contact.company ?? '') : ''
  const overall = OVERALL[bandOf(diagnostic.maturity)][locale]
  const nextSteps = [...AREAS].sort((a, b) => areas[a] - areas[b]).slice(0, NEXT_STEPS)
  const whatsapp = whatsappLink(t('whatsappMessage', { company }))

  return (
    <div className="container-x pt-36 pb-28 md:pt-44">
      <div className="grid gap-12 lg:grid-cols-12">
        <header className="lg:col-span-7">
          <p className="eyebrow">{company ? `${t('eyebrow')} · ${company}` : t('eyebrow')}</p>
          <h1 className="h-display mt-6 text-[clamp(2.25rem,1.5rem+3vw,4.25rem)] text-ink">{overall.title}</h1>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-ink-soft">{overall.body}</p>
        </header>

        <div className="lg:col-span-4 lg:col-start-9">
          <p className="text-sm font-semibold text-ink">{t('scoreLabel')}</p>
          <p className="mt-2 flex items-baseline gap-3">
            <span className="font-mono text-[clamp(4.5rem,3rem+6vw,7.5rem)] leading-none tracking-[-0.06em] text-gold">
              {diagnostic.maturity}
            </span>
            <span className="text-ink-soft">{t('of')}</span>
          </p>
          <div
            className="ruler ruler-in mt-5"
            style={{ '--v': `${diagnostic.maturity}%` } as React.CSSProperties}
            aria-hidden
          />
        </div>
      </div>

      <section className="mt-20 border-t border-line pt-10 md:mt-28" aria-labelledby="areas-title">
        <h2 id="areas-title" className="font-display text-2xl font-semibold tracking-[-0.02em] text-ink">
          {t('areasTitle')}
        </h2>
        <ul className="mt-8 grid gap-x-16 gap-y-8 md:grid-cols-2">
          {AREAS.map((area) => (
            <li key={area}>
              <div className="flex items-baseline justify-between gap-4">
                <span className="font-semibold text-ink">{AREA_NAMES[area][locale]}</span>
                <span className="whitespace-nowrap text-sm text-ink-soft">
                  {t(`bands.${bandOf(areas[area])}`)} · <span className="font-mono text-gold">{areas[area]}</span>
                </span>
              </div>
              <div className="ruler ruler-in mt-3" style={{ '--v': `${areas[area]}%` } as React.CSSProperties} aria-hidden />
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-20 border-t border-line pt-10 md:mt-28" aria-labelledby="next-title">
        <h2 id="next-title" className="font-display text-2xl font-semibold tracking-[-0.02em] text-ink">
          {t('nextTitle')}
        </h2>
        <ol className="mt-8 grid gap-10 md:grid-cols-3">
          {nextSteps.map((area) => (
            <li key={area} className="border-t-2 border-gold pt-5">
              <p className="font-semibold text-ink">{AREA_NAMES[area][locale]}</p>
              <p className="mt-3 leading-relaxed text-ink-soft">{RECOMMENDATIONS[area][bandOf(areas[area])][locale]}</p>
            </li>
          ))}
        </ol>
        <p className="mt-10 text-sm text-ink-soft">{t('disclaimer')}</p>
      </section>

      <section data-theme="dark" className="mt-20 border border-line bg-bg-elev px-6 py-12 text-ink sm:px-10 md:mt-28 md:py-16" aria-labelledby="cta-title">
        <h2 id="cta-title" className="h-section text-ink">
          {t(`cta.${tier}.title`)}
        </h2>
        <p className="mt-5 max-w-2xl text-lg leading-relaxed text-ink-soft">{t(`cta.${tier}.body`)}</p>
        <div className="mt-9 flex flex-wrap gap-3">
          {tier === 'C' ? (
            <>
              <Link href="/blog" className="btn btn-primary">
                {t('blog')}
                <ArrowRight className="btn-arrow size-4" />
              </Link>
              <Link href="/#contacto" className="btn btn-ghost">
                {t('write')}
              </Link>
            </>
          ) : (
            <>
              {settings.bookingUrl && (
                <a href={settings.bookingUrl} target="_blank" rel="noopener" className="btn btn-primary">
                  {t('book')}
                  <ArrowRight className="btn-arrow size-4" />
                </a>
              )}
              <a
                href={whatsapp}
                target="_blank"
                rel="noopener"
                className={`btn ${settings.bookingUrl ? 'btn-ghost' : 'btn-primary'}`}
              >
                <WhatsApp className="size-4" />
                {t('whatsapp')}
              </a>
            </>
          )}
        </div>
      </section>
    </div>
  )
}
