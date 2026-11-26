import { getSettings } from '@/lib/settings'
import { SiteHeader } from '@/components/layout/site-header'
import { SiteFooter } from '@/components/layout/site-footer'

/** Exacta's own pages: its header and footer around them. Landings for other brands live outside this group. */
export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const settings = await getSettings()
  const hasTracking = Boolean(settings.metaPixelId || settings.ga4Id || settings.googleAdsId)
  return (
    <>
      <SiteHeader />
      <main id="contenido">{children}</main>
      <SiteFooter hasTracking={hasTracking} />
    </>
  )
}
