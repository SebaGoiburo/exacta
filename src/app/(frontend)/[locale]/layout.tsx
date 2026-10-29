import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Manrope, Martian_Mono, Sora } from 'next/font/google'
import { hasLocale, NextIntlClientProvider } from 'next-intl'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { ThemeProvider } from 'next-themes'
import { routing } from '@/i18n/routing'
import { site } from '@/lib/site'
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
    alternates: {
      canonical: locale === routing.defaultLocale ? '/' : `/${locale}`,
      languages: { es: '/', en: '/en' },
    },
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
              <SiteFooter />
            </MotionProvider>
          </NextIntlClientProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
