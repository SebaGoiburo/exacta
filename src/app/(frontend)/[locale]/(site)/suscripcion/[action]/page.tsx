import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { Link } from '@/i18n/navigation'
import type { Locale } from '@/i18n/routing'
import { ArrowRight } from '@/components/ui/icons'

type Props = {
  params: Promise<{ locale: string; action: string }>
  searchParams: Promise<{ token?: string }>
}

/** Ask for a click first: confirm and unsubscribe. The rest only report how it went. */
const ACTIONS = ['confirmar', 'baja'] as const
const RESULTS = ['confirmada', 'baja-lista', 'invalido'] as const

type Step = (typeof ACTIONS)[number] | (typeof RESULTS)[number]
const isStep = (v: string): v is Step => [...ACTIONS, ...RESULTS].includes(v as Step)

export const metadata: Metadata = { robots: { index: false, follow: false } }

export default async function SubscriptionPage({ params, searchParams }: Props) {
  const { locale, action } = (await params) as { locale: Locale; action: string }
  setRequestLocale(locale)
  if (!isStep(action)) notFound()
  const { token } = await searchParams
  const t = await getTranslations(`subscribe.steps.${action}`)
  const tb = await getTranslations('blog')
  const asks = action === 'confirmar' || action === 'baja'

  return (
    <div className="container-x pt-40 pb-28 md:pt-48">
      <div className="max-w-2xl">
        <h1 className="h-display text-[clamp(2.25rem,1.6rem+2.8vw,4rem)] text-ink">{t('title')}</h1>
        <p className="mt-6 text-lg leading-relaxed text-ink-soft">{t('body')}</p>
        {asks && token ? (
          <form action="/api/newsletter/action" method="post" className="mt-10">
            <input type="hidden" name="action" value={action} />
            <input type="hidden" name="token" value={token} />
            <input type="hidden" name="locale" value={locale} />
            <button type="submit" className="btn btn-primary">
              {t('cta')}
              <ArrowRight className="btn-arrow size-4" />
            </button>
          </form>
        ) : (
          <Link href="/blog" className="btn btn-ghost mt-10">
            {tb('all')}
            <ArrowRight className="btn-arrow size-4" />
          </Link>
        )}
      </div>
    </div>
  )
}
