import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import type { Locale } from '@/i18n/routing'
import { pageAlternates } from '@/lib/seo'
import { site } from '@/lib/site'

// The layout reads settings from the CMS, so the build needs no database.
export const dynamic = 'force-dynamic'

type Props = { params: Promise<{ locale: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = (await params) as { locale: Locale }
  const t = await getTranslations({ locale, namespace: 'privacy' })
  return { title: t('metaTitle'), alternates: pageAlternates(locale, '/privacidad') }
}

export default async function PrivacyPage({ params }: Props) {
  const { locale } = (await params) as { locale: Locale }
  setRequestLocale(locale)
  const t = await getTranslations('privacy')
  const sections = t.raw('sections') as { h: string; p: string }[]

  return (
    <div className="container-x pt-40 pb-28 md:pt-48">
      <div className="mx-auto max-w-3xl">
        <h1 className="h-display text-[clamp(2.5rem,1.6rem+3.5vw,4.5rem)] text-ink">{t('title')}</h1>
        <p className="mt-5 text-sm text-ink-soft">{t('updated')}</p>
        <div className="rich mt-12 border-t border-line pt-10">
          {sections.map((section) => (
            <section key={section.h}>
              <h2>{section.h}</h2>
              <p>{section.p.replaceAll('{email}', site.email)}</p>
            </section>
          ))}
        </div>
      </div>
    </div>
  )
}
