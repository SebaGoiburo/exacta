import { unstable_cache } from 'next/cache'
import { getPayload } from 'payload'
import config from '@payload-config'
import type { Locale } from '@/i18n/routing'
import type { Article, CaseStudy, Faq, Localized, Product, TeamMember } from '@/content/types'
import { cmsTag } from '@/payload/hooks/revalidate'

/*
 * Data access for the public site. Reads the CMS with locale "all", so every localized
 * field arrives as { es, en } and components pick the language they render.
 * Results are cached per collection and invalidated by the CMS hooks on every change.
 */

const cms = () => getPayload({ config })

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any

/** Normalizes a localized value; English falls back to Spanish when it is missing. */
function L(v: Any): Localized {
  if (v && typeof v === 'object' && ('es' in v || 'en' in v)) return { es: v.es ?? '', en: v.en || v.es || '' }
  return { es: v ?? '', en: v ?? '' }
}

/** Media URLs come back absolute (serverURL); the site serves them from its own origin. */
const mediaUrl = (m: Any): string | undefined => {
  const url = m && typeof m === 'object' ? m.url : undefined
  return url ? new URL(url, 'http://local').pathname : undefined
}

// Bump when the mapped shape changes, so old cache entries are not reused.
const CACHE_VERSION = 'v2'

const cached = <T,>(slug: string, key: string, fn: () => Promise<T>) =>
  unstable_cache(fn, ['cms', CACHE_VERSION, slug, key], { tags: [cmsTag(slug)] })()

export function getProducts(): Promise<Product[]> {
  return cached('products', 'all', async () => {
    const { docs } = await (await cms()).find({ collection: 'products', locale: 'all', sort: 'order', depth: 1, limit: 50 })
    return docs.map((d: Any) => ({
      slug: d.slug,
      name: d.name,
      tagline: L(d.tagline),
      body: L(d.body),
      audience: L(d.audience),
      features: {
        es: (d.features?.es ?? []).map((f: Any) => f.text),
        en: (d.features?.en ?? d.features?.es ?? []).map((f: Any) => f.text),
      },
      href: d.href,
      external: Boolean(d.external),
      image: mediaUrl(d.image) ? { src: mediaUrl(d.image)!, alt: L(d.image.alt) } : undefined,
    }))
  })
}

export function getCases(): Promise<CaseStudy[]> {
  return cached('cases', 'all', async () => {
    const { docs } = await (await cms()).find({ collection: 'cases', locale: 'all', sort: 'order', depth: 1, limit: 50 })
    return docs.map((d: Any) => ({
      slug: d.slug,
      client: d.client,
      role: L(d.role),
      placeholder: Boolean(d.placeholder),
      metric: { before: L(d.metricBefore), after: L(d.metricAfter), label: L(d.metricLabel) },
      challenge: L(d.challenge),
      solution: L(d.solution),
      quote: d.quote?.es ? L(d.quote) : undefined,
      image: mediaUrl(d.image),
      links: (d.links ?? []).map((l: Any) => ({ label: l.label, href: l.href })),
    }))
  })
}

export function getTeam(): Promise<TeamMember[]> {
  return cached('team', 'all', async () => {
    const { docs } = await (await cms()).find({ collection: 'team', locale: 'all', sort: 'order', depth: 1, limit: 50 })
    return docs.map((d: Any) => ({
      name: d.name,
      role: L(d.role),
      placeholder: Boolean(d.placeholder),
      photo: mediaUrl(d.photo),
      linkedin: d.linkedin ?? undefined,
    }))
  })
}

export function getFaqs(): Promise<Faq[]> {
  return cached('faqs', 'all', async () => {
    const { docs } = await (await cms()).find({ collection: 'faqs', locale: 'all', sort: 'order', limit: 100 })
    return docs.map((d: Any) => ({ q: L(d.question), a: L(d.answer) }))
  })
}

function toArticle(d: Any): Article {
  return {
    slug: d.slug,
    sample: d.origin === 'sample',
    date: d.publishedAt ?? d.createdAt,
    readingMinutes: d.readingMinutes ?? 3,
    title: L(d.title),
    excerpt: L(d.excerpt),
    content: { es: d.content?.es ?? null, en: d.content?.en ?? d.content?.es ?? null },
  }
}

export function getPosts(limit?: number): Promise<Article[]> {
  return cached('posts', `list:${limit ?? 'all'}`, async () => {
    const { docs } = await (await cms()).find({
      collection: 'posts',
      locale: 'all',
      where: { _status: { equals: 'published' } },
      sort: '-publishedAt',
      limit: limit ?? 100,
      depth: 0,
    })
    return docs.map(toArticle)
  })
}

export function getPost(slug: string): Promise<Article | null> {
  return cached('posts', `slug:${slug}`, async () => {
    const { docs } = await (await cms()).find({
      collection: 'posts',
      locale: 'all',
      where: { and: [{ slug: { equals: slug } }, { _status: { equals: 'published' } }] },
      limit: 1,
      depth: 1,
    })
    return docs[0] ? toArticle(docs[0]) : null
  })
}

export function formatDate(date: string, locale: Locale) {
  return new Intl.DateTimeFormat(locale === 'es' ? 'es-AR' : 'en-US', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(date))
}
