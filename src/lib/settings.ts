import { unstable_cache } from 'next/cache'
import { getPayload } from 'payload'
import config from '@payload-config'
import { cmsTag } from '@/payload/hooks/revalidate'

export type SiteSettings = {
  bookingUrl?: string | null
  leadNotifyEmail?: string | null
  metaPixelId?: string | null
  ga4Id?: string | null
  googleAdsId?: string | null
  googleAdsLeadLabel?: string | null
}

const read = unstable_cache(
  async (): Promise<SiteSettings> => {
    const payload = await getPayload({ config })
    const s = await payload.findGlobal({ slug: 'settings', overrideAccess: true })
    return {
      bookingUrl: s.bookingUrl,
      leadNotifyEmail: s.leadNotifyEmail,
      metaPixelId: s.metaPixelId,
      ga4Id: s.ga4Id,
      googleAdsId: s.googleAdsId,
      googleAdsLeadLabel: s.googleAdsLeadLabel,
    }
  },
  ['cms', 'settings'],
  { tags: [cmsTag('settings')] },
)

/** Never breaks a page: without a database or settings, everything optional simply stays off. */
export async function getSettings(): Promise<SiteSettings> {
  try {
    return await read()
  } catch {
    return {}
  }
}
