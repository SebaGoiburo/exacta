import assert from 'node:assert/strict'
import { test } from 'node:test'
import { DEFAULT_PROFILES, DIMENSIONS } from '../src/lib/prospecting/model'
import {
  autoSignal,
  percentile,
  rescoreWithAi,
  scoreCandidate,
  tierOf,
  type BatchContext,
  type Candidate,
  type SiteFacts,
} from '../src/lib/prospecting/scoring'
import { readHtml, siteKey, websiteKind } from '../src/lib/prospecting/site-audit'

const site = (overrides: Partial<SiteFacts> = {}): SiteFacts => ({
  reachable: true,
  https: true,
  viewport: true,
  copyrightYear: new Date().getFullYear(),
  whatsapp: true,
  tel: true,
  email: true,
  form: true,
  booking: false,
  ecommerce: false,
  metaPixel: false,
  googleTag: true,
  instagram: true,
  facebook: false,
  newsletter: false,
  chat: false,
  ...overrides,
})

const candidate = (overrides: Partial<Candidate> = {}): Candidate => ({
  placeId: 'p1',
  rank: 8,
  branches: 1,
  operational: true,
  rating: 4.5,
  reviews: 60,
  priceLevel: 'PRICE_LEVEL_MODERATE',
  hasPhone: true,
  website: 'own',
  site: site(),
  pageSpeed: 35,
  ...overrides,
})

const ctx: BatchContext = {
  reviews: [5, 10, 20, 40, 60, 80, 120, 300],
  leaders: [
    { rating: 4.8, reviews: 300, pageSpeed: 80, website: 'own' },
    { rating: 4.6, reviews: 120, pageSpeed: 70, website: 'own' },
    { rating: 4.7, reviews: 80, pageSpeed: 75, website: 'own' },
  ],
  count: 20,
}

const profile = (key: string) => {
  const p = DEFAULT_PROFILES.find((d) => d.key === key)!
  return { weights: p.weights, signals: p.signals, minCapacity: p.minCapacity }
}

test('every default profile weighs 100 and has signals', () => {
  for (const p of DEFAULT_PROFILES) {
    assert.equal(DIMENSIONS.reduce((sum, d) => sum + p.weights[d], 0), 100, p.key)
    assert.ok(p.signals.length > 0, p.key)
  }
})

test('percentile compares within the niche and counts ties half', () => {
  assert.equal(percentile(300, ctx.reviews), 94)
  assert.equal(percentile(5, ctx.reviews), 6)
  assert.equal(percentile(7, []), 50)
})

test('site questions are unknown when the site refused us and not applicable without a site', () => {
  assert.equal(autoSignal('slow_mobile', candidate(), ctx), true)
  assert.equal(autoSignal('slow_mobile', candidate({ site: null }), ctx), null)
  assert.equal(autoSignal('slow_mobile', candidate({ website: 'none', site: null }), ctx), 'na')
  assert.equal(autoSignal('no_booking', candidate({ website: 'social', site: null }), ctx), true)
  assert.equal(autoSignal('site_down', candidate({ site: site({ reachable: false }) }), ctx), true)
})

test('a company with the problem scores higher on need than one without it', () => {
  const p = profile('turnos-online')
  const withProblem = scoreCandidate(candidate(), ctx, p)
  const solved = scoreCandidate(candidate({ site: site({ booking: true }), pageSpeed: 90 }), ctx, p)
  assert.ok(withProblem.scores.need.value > solved.scores.need.value)
  assert.ok(withProblem.score > solved.score)
})

test('knockouts: closed, unreachable and below the minimum capacity', () => {
  const p = profile('software-a-medida')
  assert.ok(scoreCandidate(candidate({ operational: false }), ctx, p).knockouts.includes('cerrado'))
  assert.ok(scoreCandidate(candidate({ hasPhone: false, website: 'none', site: null }), ctx, p).knockouts.includes('sin_contacto'))
  const tiny = candidate({ reviews: 5, priceLevel: 'PRICE_LEVEL_INEXPENSIVE', website: 'none', site: null })
  assert.ok(scoreCandidate(tiny, ctx, p).knockouts.includes('capacidad_baja'))
})

test('two criteria without data cost points', () => {
  const p = profile('sitio-web')
  const unknown = candidate({ reviews: null, rating: null, priceLevel: null, site: null, pageSpeed: null })
  const result = scoreCandidate(unknown, ctx, p)
  assert.ok(result.missing >= 2)
})

test('the AI pass changes need, access and timing and keeps the rest', () => {
  const p = profile('turnos-online')
  const first = scoreCandidate(candidate(), ctx, p)
  const second = rescoreWithAi(
    { scores: first.scores, auto: first.auto, flags: first.flags, hasPhone: true, site: site(), siteDown: false },
    p,
    {
      signals: { 'ia:turnos-manuales': true, 'ia:quejas-turnos': true, 'ia:ausentismo': null },
      timing: { value: 80, evidence: 'media', why: ['Quejas recientes por turnos'] },
      decisionMaker: true,
      extraChannels: [],
      chainElsewhere: false,
    },
  )
  assert.equal(second.scores.capacity.value, first.scores.capacity.value)
  assert.equal(second.scores.gap.value, first.scores.gap.value)
  assert.ok(second.scores.need.value > first.scores.need.value)
  assert.equal(second.scores.timing.value, 80)
  assert.ok(second.scores.access.value > first.scores.access.value)
})

test('groups', () => {
  assert.equal(tierOf(70), 'A')
  assert.equal(tierOf(69), 'B')
  assert.equal(tierOf(49), 'C')
})

test('reads what a site shows', () => {
  const html = `<html><head><meta name="viewport" content="width=device-width">
    <script src="https://www.googletagmanager.com/gtag/js?id=G-1"></script></head>
    <body><a href="https://wa.me/549261">WhatsApp</a><a href="https://calendly.com/x">Turnos</a>
    <form><input type="email"></form><footer>© 2019 Consultorio</footer></body></html>`
  const facts = readHtml(html, 'https://ejemplo.com/')
  assert.equal(facts.viewport, true)
  assert.equal(facts.googleTag, true)
  assert.equal(facts.whatsapp, true)
  assert.equal(facts.booking, true)
  assert.equal(facts.form, true)
  assert.equal(facts.copyrightYear, 2019)
  assert.equal(facts.metaPixel, false)
})

test('tells own sites from social profiles', () => {
  assert.equal(websiteKind('https://www.instagram.com/consultorio'), 'social')
  assert.equal(websiteKind('https://consultorio.com.ar'), 'own')
  assert.equal(websiteKind(undefined), 'none')
  assert.equal(siteKey('https://www.consultorio.com.ar/turnos'), 'consultorio.com.ar')
})
