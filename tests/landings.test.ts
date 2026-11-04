import assert from 'node:assert/strict'
import test from 'node:test'
import { cases } from '../src/content/cases'
import { getLanding, landings, SERVICE_LANDINGS } from '../src/content/landings'
import { OLD_SITE_REDIRECTS } from '../src/content/old-site-redirects'
import { products } from '../src/content/products'
import { manualCost } from '../src/lib/manual-cost'

/** Every string in a landing, with where it is, so an empty translation is easy to find. */
function strings(value: unknown, path: string): [string, string][] {
  if (typeof value === 'string') return [[path, value]]
  if (Array.isArray(value)) return value.flatMap((v, i) => strings(v, `${path}[${i}]`))
  if (value && typeof value === 'object') {
    return Object.entries(value).flatMap(([k, v]) => strings(v, `${path}.${k}`))
  }
  return []
}

test('old site addresses lead to pages that exist, once each', () => {
  const pages = new Set(['/', '/blog', ...landings.map((l) => `/${l.kind}/${l.slug}`)])
  const sources = OLD_SITE_REDIRECTS.map((r) => r.source)
  assert.equal(new Set(sources).size, sources.length)
  for (const { source, destination } of OLD_SITE_REDIRECTS) {
    const page = destination.split('#')[0]
    assert.ok(pages.has(page), `${source} -> ${destination} does not exist`)
    assert.ok(!pages.has(source), `${source} would hide a real page`)
  }
})

test('each landing has a unique address', () => {
  const paths = landings.map((l) => `${l.kind}/${l.slug}`)
  assert.equal(new Set(paths).size, paths.length)
})

test('no landing has empty text', () => {
  for (const l of landings) {
    for (const [path, text] of strings(l, l.slug)) assert.ok(text.trim(), `${path} is empty`)
  }
})

test('every landing has both languages in its visible text', () => {
  for (const l of landings) {
    for (const item of [l.name, l.title, l.lead, l.metaTitle, l.metaDescription, l.task]) {
      assert.ok(item.es && item.en, `${l.slug} is missing a language`)
    }
  }
})

test('every landing shows real proof, and it exists', () => {
  const realCases = cases.filter((c) => !c.placeholder).map((c) => c.slug)
  const productSlugs = products.map((p) => p.slug)
  for (const l of landings) {
    const { caseSlug, productSlugs: used = [], tryIt, clients = [] } = l.proof
    assert.ok(caseSlug || used.length || tryIt || clients.length, `${l.slug} has no proof`)
    if (caseSlug) assert.ok(realCases.includes(caseSlug), `${l.slug}: unknown case ${caseSlug}`)
    for (const slug of used) assert.ok(productSlugs.includes(slug), `${l.slug}: unknown product ${slug}`)
  }
})

test('the home service rows point to existing pages', () => {
  for (const slug of SERVICE_LANDINGS) assert.ok(getLanding('soluciones', slug), slug)
})

test('the calculator does plain arithmetic on the visitor numbers', () => {
  assert.deepEqual(manualCost({ hoursPerWeek: 10, people: 2, hourlyCost: 5 }), {
    hoursPerMonth: 87,
    workdays: 11,
    fullTimePeople: 0.5,
    costPerMonth: 433,
  })
})

test('the calculator ignores anything that is not a positive number', () => {
  const none = { hoursPerMonth: 0, workdays: 0, fullTimePeople: 0, costPerMonth: 0 }
  assert.deepEqual(manualCost({ hoursPerWeek: -3, people: 2, hourlyCost: 5 }), none)
  assert.equal(manualCost({ hoursPerWeek: 10, people: 2, hourlyCost: Number('abc') }).costPerMonth, 0)
  assert.equal(manualCost({ hoursPerWeek: 10, people: 2, hourlyCost: Number('abc') }).hoursPerMonth, 87)
})
