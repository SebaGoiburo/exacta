import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Bricolage_Grotesque } from 'next/font/google'
import styles from '@/components/ia-humanos/ia.module.css'

// The brand's title face. Manrope and Martian Mono already come from the site's root layout.
const bricolage = Bricolage_Grotesque({
  subsets: ['latin'],
  weight: ['700', '800'],
  variable: '--font-bricolage',
  display: 'swap',
})

// Each page sets its own title and description; the landing adds the class date to them.
export const metadata: Metadata = {
  title: { default: 'IA para Humanos', template: '%s · IA para Humanos' },
  icons: { icon: '/ia-para-humanos/favicon.svg' },
  openGraph: { siteName: 'IA para Humanos', locale: 'es_AR', type: 'website' },
}

/** IA para Humanos lives on its own: no Exacta header or footer, its own colours and faces. Spanish only. */
export default async function IaLayout({ children, params }: { children: React.ReactNode; params: Promise<{ locale: string }> }) {
  const { locale } = await params
  if (locale !== 'es') notFound()
  // The browser's own scrolling: lighter, and predictable with the phone's sticky action and the jump to the ticket.
  return (
    <div className={`${styles.root} ${bricolage.variable}`} data-native-scroll>
      {children}
    </div>
  )
}
