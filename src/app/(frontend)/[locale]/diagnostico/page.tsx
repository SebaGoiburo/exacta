import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import type { Locale } from '@/i18n/routing'
import { AREAS, QUESTIONS } from '@/lib/diagnostic/questions'
import { AREA_NAMES } from '@/lib/diagnostic/recommendations'
import { pageAlternates } from '@/lib/seo'
import { DiagnosticApp } from '@/components/diagnostic/diagnostic-app'

// The layout reads settings from the CMS, so the build needs no database.
export const dynamic = 'force-dynamic'

type Props = { params: Promise<{ locale: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = (await params) as { locale: Locale }
  const t = await getTranslations({ locale, namespace: 'diagnostic' })
  return {
    title: t('metaTitle'),
    description: t('metaDescription'),
    alternates: pageAlternates(locale, '/diagnostico'),
  }
}

export default async function DiagnosticPage({ params }: Props) {
  const { locale } = (await params) as { locale: Locale }
  setRequestLocale(locale)

  // Only text reaches the browser: the weights that qualify a lead stay on the server.
  const questions = QUESTIONS.map((q) => ({
    id: q.id,
    title: q.title[locale],
    options: q.options.map((o) => ({ id: o.id, label: o.label[locale] })),
  }))

  return <DiagnosticApp questions={questions} areas={AREAS.map((a) => AREA_NAMES[a][locale])} />
}
