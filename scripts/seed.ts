/**
 * Loads the site's starting content into the CMS (Spanish, then English).
 * Safe to re-run: a collection that already has documents is skipped.
 *
 *   npm run seed
 */
import path from 'node:path'
import { getPayload } from 'payload'
import { products } from '../src/content/products'
import { cases } from '../src/content/cases'
import { team } from '../src/content/team'
import { faqs } from '../src/content/faq'
import { posts } from '../src/content/posts'

try {
  process.loadEnvFile(path.resolve(process.cwd(), '.env'))
} catch {
  // Environment comes from the host (CI, Docker).
}

const { default: config } = await import('../src/payload.config')
const payload = await getPayload({ config })
const ctx = { skipN8n: true }

const isEmpty = async (collection: 'products' | 'cases' | 'team' | 'faqs' | 'posts') =>
  (await payload.count({ collection, overrideAccess: true })).totalDocs === 0

async function upload(publicPath: string, alt: { es: string; en: string }) {
  const doc = await payload.create({
    collection: 'media',
    data: { alt: alt.es },
    filePath: path.resolve(process.cwd(), 'public', publicPath.replace(/^\//, '')),
    locale: 'es',
    overrideAccess: true,
  })
  await payload.update({ collection: 'media', id: doc.id, data: { alt: alt.en }, locale: 'en', overrideAccess: true })
  return doc.id
}

async function seedProducts() {
  if (!(await isEmpty('products'))) return console.log('products: already loaded, skipped')
  for (const [i, p] of products.entries()) {
    const image = p.image ? await upload(p.image.src, p.image.alt) : undefined
    const doc = await payload.create({
      collection: 'products',
      locale: 'es',
      overrideAccess: true,
      context: ctx,
      data: {
        name: p.name,
        slug: p.slug,
        order: (i + 1) * 10,
        tagline: p.tagline.es,
        body: p.body.es,
        audience: p.audience.es,
        features: p.features.es.map((text) => ({ text })),
        href: p.href,
        external: p.external,
        image,
      },
    })
    await payload.update({
      collection: 'products',
      id: doc.id,
      locale: 'en',
      overrideAccess: true,
      context: ctx,
      data: {
        tagline: p.tagline.en,
        body: p.body.en,
        audience: p.audience.en,
        features: p.features.en.map((text) => ({ text })),
      },
    })
  }
  console.log(`products: ${products.length} loaded`)
}

async function seedCases() {
  if (!(await isEmpty('cases'))) return console.log('cases: already loaded, skipped')
  for (const [i, c] of cases.entries()) {
    const image = c.image ? await upload(c.image, { es: c.client, en: c.client }) : undefined
    const doc = await payload.create({
      collection: 'cases',
      locale: 'es',
      overrideAccess: true,
      context: ctx,
      data: {
        client: c.client,
        slug: c.slug,
        order: (i + 1) * 10,
        placeholder: Boolean(c.placeholder),
        role: c.role.es,
        image,
        metricBefore: c.metric.before.es,
        metricAfter: c.metric.after.es,
        metricLabel: c.metric.label.es,
        challenge: c.challenge.es,
        solution: c.solution.es,
        quote: c.quote?.es,
        links: c.links,
      },
    })
    await payload.update({
      collection: 'cases',
      id: doc.id,
      locale: 'en',
      overrideAccess: true,
      context: ctx,
      data: {
        role: c.role.en,
        metricBefore: c.metric.before.en,
        metricAfter: c.metric.after.en,
        metricLabel: c.metric.label.en,
        challenge: c.challenge.en,
        solution: c.solution.en,
        quote: c.quote?.en,
      },
    })
  }
  console.log(`cases: ${cases.length} loaded`)
}

async function seedTeam() {
  if (!(await isEmpty('team'))) return console.log('team: already loaded, skipped')
  for (const [i, m] of team.entries()) {
    const doc = await payload.create({
      collection: 'team',
      locale: 'es',
      overrideAccess: true,
      context: ctx,
      data: { name: m.name, order: (i + 1) * 10, placeholder: Boolean(m.placeholder), role: m.role.es },
    })
    await payload.update({ collection: 'team', id: doc.id, locale: 'en', overrideAccess: true, context: ctx, data: { role: m.role.en } })
  }
  console.log(`team: ${team.length} loaded`)
}

async function seedFaqs() {
  if (!(await isEmpty('faqs'))) return console.log('faqs: already loaded, skipped')
  for (const [i, f] of faqs.entries()) {
    const doc = await payload.create({
      collection: 'faqs',
      locale: 'es',
      overrideAccess: true,
      context: ctx,
      data: { question: f.q.es, answer: f.a.es, order: (i + 1) * 10 },
    })
    await payload.update({
      collection: 'faqs',
      id: doc.id,
      locale: 'en',
      overrideAccess: true,
      context: ctx,
      data: { question: f.q.en, answer: f.a.en },
    })
  }
  console.log(`faqs: ${faqs.length} loaded`)
}

async function seedPosts() {
  if (!(await isEmpty('posts'))) return console.log('posts: already loaded, skipped')
  for (const p of posts) {
    // Paragraphs go in as Markdown; the collection hook converts them to rich text.
    const doc = await payload.create({
      collection: 'posts',
      locale: 'es',
      overrideAccess: true,
      context: ctx,
      draft: false,
      data: {
        title: p.title.es,
        slug: p.slug,
        excerpt: p.excerpt.es,
        markdown: p.body.es.join('\n\n'),
        publishedAt: new Date(p.date).toISOString(),
        readingMinutes: p.readingMinutes,
        origin: 'sample',
        _status: 'published',
      },
    })
    await payload.update({
      collection: 'posts',
      id: doc.id,
      locale: 'en',
      overrideAccess: true,
      context: ctx,
      draft: false,
      data: { title: p.title.en, excerpt: p.excerpt.en, markdown: p.body.en.join('\n\n'), _status: 'published' },
    })
  }
  console.log(`posts: ${posts.length} loaded`)
}

await seedProducts()
await seedCases()
await seedTeam()
await seedFaqs()
await seedPosts()
console.log('Seed finished.')
process.exit(0)
