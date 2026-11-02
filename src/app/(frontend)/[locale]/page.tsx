import type { Metadata } from 'next'
import { setRequestLocale } from 'next-intl/server'
import type { Locale } from '@/i18n/routing'
import { getTeam } from '@/lib/content'
import { pageAlternates } from '@/lib/seo'
import { Hero } from '@/components/home/hero'
import { ClientMarquee } from '@/components/home/client-marquee'
import { PainPoints } from '@/components/home/pain-points'
import { Services } from '@/components/home/services'
import { Results } from '@/components/home/results'
import { Method } from '@/components/home/method'
import { Cases } from '@/components/home/cases'
import { Products } from '@/components/home/products'
import { Team } from '@/components/home/team'
import { FaqSection } from '@/components/home/faq'
import { BlogTeaser } from '@/components/home/blog-teaser'
import { Contact } from '@/components/home/contact'

// Reads the CMS on each request (cached per collection), so the build needs no database.
export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = (await params) as { locale: Locale }
  return { alternates: pageAlternates(locale) }
}

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  setRequestLocale(locale)
  const team = await getTeam()

  return (
    <>
      <Hero />
      <ClientMarquee />
      <PainPoints />
      <Services />
      <Results />
      <Method />
      <Cases />
      <Products />
      <Team members={team} />
      <FaqSection />
      <BlogTeaser />
      <Contact />
    </>
  )
}
