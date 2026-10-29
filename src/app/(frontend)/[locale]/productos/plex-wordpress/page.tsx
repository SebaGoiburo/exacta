import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import type { Locale } from '@/i18n/routing'
import { getProducts } from '@/lib/content'
import { whatsappLink } from '@/lib/site'
import { PlexSyncPanel } from '@/components/home/plex-sync-panel'
import { RegMarks } from '@/components/motion/spotlight'
import { WhatsApp } from '@/components/ui/icons'

type Props = { params: Promise<{ locale: string }> }

const getPlex = async () => (await getProducts()).find((p) => p.slug === 'plex-wordpress')

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = (await params) as { locale: Locale }
  const t = await getTranslations({ locale, namespace: 'plex' })
  const plex = await getPlex()
  return { title: t('metaTitle'), description: plex?.body[locale] }
}

// Commercial landing for Plex-WordPress. Skeleton with the product's real positioning; to be expanded.
export default async function PlexPage({ params }: Props) {
  const { locale } = (await params) as { locale: Locale }
  setRequestLocale(locale)
  const t = await getTranslations('plex')
  const tp = await getTranslations('products')
  const plex = await getPlex()
  if (!plex) notFound()

  return (
    <div className="container-x pt-40 pb-28 md:pt-48">
      <div className="grid items-center gap-14 lg:grid-cols-12">
        <div className="lg:col-span-5">
          <h1 className="h-display text-[clamp(2.75rem,1.8rem+4vw,5.5rem)] text-ink" data-reveal>
            {plex.name}
          </h1>
          <p className="mt-6 text-xl leading-snug font-medium text-ink" data-reveal data-reveal-delay="0.06">
            {plex.tagline[locale]}
          </p>
          <p className="mt-4 text-lg leading-relaxed text-ink-soft" data-reveal data-reveal-delay="0.1">
            {plex.body[locale]}
          </p>
          <ul className="mt-6 grid gap-2 sm:grid-cols-2" data-reveal data-reveal-delay="0.14">
            {plex.features[locale].map((f) => (
              <li key={f} className="flex gap-2.5 text-ink">
                <span className="mt-[0.6em] size-1.5 shrink-0 rounded-full bg-accent" aria-hidden />
                {f}
              </li>
            ))}
          </ul>
          <a
            href={whatsappLink(t('whatsapp'))}
            target="_blank"
            rel="noopener"
            className="btn btn-primary mt-10"
            data-reveal
            data-reveal-delay="0.18"
          >
            <WhatsApp className="size-4" />
            {t('cta')}
          </a>
          <p className="mt-4 text-sm text-ink-mute">{tp('soon')}</p>
        </div>
        <div className="lg:col-span-7" data-reveal>
          <figure className="reg-card relative">
            <RegMarks />
            <PlexSyncPanel exampleLabel={tp('exampleData')} locale={locale} />
          </figure>
        </div>
      </div>
    </div>
  )
}
