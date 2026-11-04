import type { MetadataRoute } from 'next'
import { landingPath, landings } from '@/content/landings'
import { getPosts } from '@/lib/content'
import { absoluteUrl } from '@/lib/seo'

// Reads the CMS on each request, so the build needs no database and new articles appear on their own.
export const dynamic = 'force-dynamic'

function entry(path: string, lastModified?: string): MetadataRoute.Sitemap[number] {
  return {
    url: absoluteUrl('es', path),
    lastModified,
    alternates: { languages: { es: absoluteUrl('es', path), en: absoluteUrl('en', path) } },
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const posts = await getPosts()

  return [
    entry(''),
    entry('/diagnostico'),
    entry('/blog'),
    entry('/productos/plex-wordpress'),
    ...landings.map((l) => entry(landingPath(l))),
    entry('/privacidad'),
    // Sample articles are placeholders and stay out of search engines.
    ...posts.filter((p) => !p.sample).map((p) => entry(`/blog/${p.slug}`, p.date)),
  ]
}
