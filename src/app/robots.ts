import type { MetadataRoute } from 'next'
import { isIndexable } from '@/lib/seo'
import { site } from '@/lib/site'

// The answer depends on the host's environment, not on the build.
export const dynamic = 'force-dynamic'

export default function robots(): MetadataRoute.Robots {
  // Test hosts stay crawlable: Google has to read a page to see its noindex.
  if (!isIndexable()) return { rules: { userAgent: '*', allow: '/' } }

  return {
    rules: { userAgent: '*', allow: ['/', '/api/media/'], disallow: ['/admin', '/api/'] },
    sitemap: `${site.url}/sitemap.xml`,
  }
}
