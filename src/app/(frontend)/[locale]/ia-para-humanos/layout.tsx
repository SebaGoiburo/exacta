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

export const metadata: Metadata = {
  title: { absolute: 'Masterclass de IA en vivo · IA para Humanos' },
  description:
    'En 2 h 30 salís usando la IA en tu trabajo. Masterclass en vivo para comerciantes, profesionales y emprendedores, sin conocimientos técnicos. Queda grabada.',
  icons: { icon: '/ia-para-humanos/favicon.svg' },
  openGraph: {
    title: 'En 2 h 30 salís usando la IA en tu trabajo',
    description: 'Masterclass en vivo de IA para Humanos, una unidad de Exacta. Sin conocimientos técnicos. Queda grabada.',
    siteName: 'IA para Humanos',
    locale: 'es_AR',
    type: 'website',
  },
}

/** IA para Humanos lives on its own: no Exacta header or footer, its own colours and faces. Spanish only. */
export default async function IaLayout({ children, params }: { children: React.ReactNode; params: Promise<{ locale: string }> }) {
  const { locale } = await params
  if (locale !== 'es') notFound()
  return <div className={`${styles.root} ${bricolage.variable}`}>{children}</div>
}
