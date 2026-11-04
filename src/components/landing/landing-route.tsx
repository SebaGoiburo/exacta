import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { setRequestLocale } from 'next-intl/server'
import type { Locale } from '@/i18n/routing'
import { getLanding, landingPath, type LandingKind } from '@/content/landings'
import { pageAlternates } from '@/lib/seo'
import { LandingPage } from './landing-page'

export type LandingParams = { params: Promise<{ locale: string; slug: string }> }

export async function landingMetadata(kind: LandingKind, { params }: LandingParams): Promise<Metadata> {
  const { locale, slug } = (await params) as { locale: Locale; slug: string }
  const landing = getLanding(kind, slug)
  if (!landing) return {}
  return {
    title: `${landing.metaTitle[locale]} · Exacta`,
    description: landing.metaDescription[locale],
    alternates: pageAlternates(locale, landingPath(landing)),
  }
}

export async function renderLanding(kind: LandingKind, { params }: LandingParams) {
  const { locale, slug } = (await params) as { locale: Locale; slug: string }
  setRequestLocale(locale)
  const landing = getLanding(kind, slug)
  if (!landing) notFound()
  return <LandingPage landing={landing} locale={locale} />
}
