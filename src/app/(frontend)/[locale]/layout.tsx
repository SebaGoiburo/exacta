import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Manrope, Martian_Mono, Sora } from 'next/font/google'
import { hasLocale, NextIntlClientProvider } from 'next-intl'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { ThemeProvider } from 'next-themes'
import { routing } from '@/i18n/routing'
import { site } from '@/lib/site'
import { absoluteUrl, isIndexable } from '@/lib/seo'
import { getSettings } from '@/lib/settings'
import { JsonLd } from '@/components/seo/json-ld'
import { Analytics } from '@/components/analytics/analytics'
import { MotionProvider } from '@/components/motion/motion-provider'
import { SiteHeader } from '@/components/layout/site-header'
import { SiteFooter } from '@/components/layout/site-footer'
import '../globals.css'

const sora = Sora({ subsets: ['latin'], variable: '--font-sora', display: 'swap' })
const manrope = Manrope({ subsets: ['latin'], variable: '--font-manrope', display: 'swap' })
const martian = Martian_Mono({ subsets: ['latin'], variable: '--font-martian', display: 'swap' })

type Props = {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }))
}

export async function generateMetadata({ params }: Omit<Props, 'children'>): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'meta' })

  return {
    metadataBase: new URL(site.url),
    title: t('title'),
    description: t('description'),
    icons: { icon: '/brand/exacta-mark.svg' },
    robots: isIndexable() ? undefined : { index: false, follow: false },
    openGraph: {
      title: t('title'),
      description: t('description'),
      siteName: site.name,
      locale: locale === 'es' ? 'es_AR' : 'en_US',
      type: 'website',
    },
  }
}

export default async function LocaleLayout({ children, params }: Props) {
  const { locale } = await params
  if (!hasLocale(routing.locales, locale)) notFound()
  setRequestLocale(locale)

  const t = await getTranslations({ locale, namespace: 'nav' })
  const meta = await getTranslations({ locale, namespace: 'meta' })
  const settings = await getSettings()
  const hasTracking = Boolean(settings.metaPixelId || settings.ga4Id || settings.googleAdsId)

  return (
    <html
      lang={locale}
      suppressHydrationWarning
      className={`${sora.variable} ${manrope.variable} ${martian.variable}`}
    >
      <head>
        {/* Lets CSS hide scroll-reveal elements only when JS will reveal them. */}
        <script dangerouslySetInnerHTML={{ __html: "document.documentElement.classList.add('js')" }} />
      </head>
      <body>
        <JsonLd
          data={{
            '@context': 'https://schema.org',
            '@type': 'ProfessionalService',
            '@id': `${site.url}/#organization`,
            name: 'Exacta Transformación Digital',
            url: absoluteUrl(locale as 'es' | 'en'),
            logo: `${site.url}/brand/exacta-mark.svg`,
            image: `${site.url}/brand/exacta-mark.svg`,
            description: meta('description'),
            email: site.email,
            telephone: site.phoneDisplay,
            address: { '@type': 'PostalAddress', addressLocality: 'Mendoza', addressCountry: 'AR' },
            areaServed: ['AR', 'Latin America'],
            sameAs: Object.values(site.social),
          }}
        />
        <ThemeProvider attribute="data-theme" defaultTheme="system" enableSystem disableTransitionOnChange>
          <NextIntlClientProvider>
            <a
              href="#contenido"
              className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-full focus:bg-accent focus:px-4 focus:py-2 focus:text-accent-ink"
            >
              {t('skip')}
            </a>
            <MotionProvider>
              <SiteHeader />
              <main id="contenido">{children}</main>
              <SiteFooter hasTracking={hasTracking} />
              <Analytics
                metaPixelId={settings.metaPixelId}
                ga4Id={settings.ga4Id}
                googleAdsId={settings.googleAdsId}
                googleAdsLeadLabel={settings.googleAdsLeadLabel}
              />
            </MotionProvider>
          </NextIntlClientProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
