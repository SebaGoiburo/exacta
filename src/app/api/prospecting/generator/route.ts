import { headers } from 'next/headers'
import { after, NextResponse } from 'next/server'
import type { Where } from 'payload'
import { placeLabel, placesConfigured } from '@/lib/places'
import { termsFrom, type AnyPrice, type LegacyPrice, type OfferPrice } from '@/lib/prospecting/price'
import { getSettings } from '@/lib/settings'
import {
  approveProfile,
  approveReport,
  closeStale,
  cms,
  competitorsFor,
  convertProspect,
  draftReport,
  ensureDefaultProfiles,
  proposeProfile,
  recordAttempt,
  reportLogo,
  runBatch,
  selfRow,
  OFFER_LIMITS,
  type ReportOffer,
  startBatch,
  startResearch,
  type ReportContent,
} from '@/lib/prospecting/service'
import { rateLimited } from '@/lib/rate-limit'
import type { OfferProfile } from '@/payload-types'

const clean = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '')
const CHANNELS = ['llamada', 'whatsapp', 'email', 'instagram', 'visita'] as const
const RESULTS = ['enviado', 'no_atendio', 'hablo', 'rechazo'] as const
const oneOf = <T extends string>(list: readonly T[], v: unknown): T | null => (list.includes(v as T) ? (v as T) : null)

/** A reference price only if it's a real positive amount; anything else means no price. */
const LEGACY_PERIODS = ['mes', 'unico', 'cuotas3', 'cuotas6', 'ninguna'] as const
const amountOf = (v: unknown) => {
  const n = Math.round(Number(v))
  return Number.isFinite(n) && n > 0 && n <= 1e10 ? n : 0
}

/**
 * A reference price only with a real positive amount; anything else means no price. Prices in the format
 * from before installments are kept as they were.
 */
function cleanPrice(input: unknown): AnyPrice | null {
  const p = input as (Partial<OfferPrice> & Partial<LegacyPrice>) | null
  if (!p) return null
  const currency = p.currency === 'USD' ? 'USD' : 'ARS'
  if (!('list' in p) && 'amount' in p) {
    const amount = amountOf(p.amount)
    if (!amount) return null
    return { amount, currency, period: oneOf(LEGACY_PERIODS, p.period) ?? 'mes', from: p.from !== false }
  }
  const list = amountOf(p.list)
  const monthly = amountOf(p.monthly)
  if (!list && !monthly) return null
  return {
    list,
    currency,
    from: p.from !== false,
    show: { cuotas3: p.show?.cuotas3 !== false, transferencia: p.show?.transferencia !== false, cuotas6: p.show?.cuotas6 === true },
    monthly: monthly || null,
    monthlyLabel: clean(p.monthlyLabel, 60),
  }
}

/** The offer as the team edited it. Services without a name are dropped; with none left, there's no section. */
function cleanOffer(input: Partial<ReportOffer>): ReportOffer | null {
  const services = (Array.isArray(input.services) ? input.services : [])
    .map((s) => ({
      name: clean(s?.name, OFFER_LIMITS.name),
      description: clean(s?.description, OFFER_LIMITS.description),
      when: clean(s?.when, OFFER_LIMITS.when),
      price: cleanPrice(s?.price),
    }))
    .filter((s) => s.name)
    .slice(0, OFFER_LIMITS.services)
  if (!services.length) return null
  return {
    title: clean(input.title, OFFER_LIMITS.title) || 'Lo que te proponemos',
    intro: clean(input.intro, OFFER_LIMITS.intro),
    services,
  }
}

const plain = (text: string) =>
  text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()

/** The team member who matches the signed-in user, by name: they sign the reports they draft. */
async function signerFor(payload: Awaited<ReturnType<typeof cms>>, user: { name?: string | null }) {
  if (!user.name) return null
  const { docs } = await payload.find({ collection: 'team', limit: 20, depth: 0, overrideAccess: true })
  return docs.find((t) => plain(t.name) === plain(user.name!))?.id ?? null
}

async function signedIn() {
  const payload = await cms()
  const { user } = await payload.auth({ headers: await headers() })
  return user?.collection === 'users' ? { payload, user } : null
}

const BATCH_FIELDS = {
  placeId: true,
  status: true,
  score: true,
  tier: true,
  pass: true,
  missing: true,
  scores: true,
  knockouts: true,
  facts: true,
  hook: true,
  research: true,
  report: true,
  reportToken: true,
  reportReviewedAt: true,
  reportExpiresAt: true,
  reportSentAt: true,
  reportOpens: true,
  reportLastOpenedAt: true,
  reportReach: true,
  reportClick: true,
  reportClickedAt: true,
  attempts: true,
  nextAttemptAt: true,
  lead: true,
  outcome: true,
} as const

/** What the generator screens show: overview, one batch, or today's calls. */
export async function GET(req: Request) {
  const auth = await signedIn()
  if (!auth) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const { payload } = auth
  const view = new URL(req.url).searchParams

  if (view.get('view') === 'batch') {
    const id = Number(view.get('id'))
    const batch = await payload.findByID({ collection: 'prospect-batches', id, depth: 1, overrideAccess: true })
    const { docs } = await payload.find({
      collection: 'prospects',
      where: { and: [{ batch: { equals: id } }, { shortlisted: { equals: true } }] },
      sort: '-score',
      limit: 40,
      depth: 0,
      overrideAccess: true,
      select: BATCH_FIELDS,
    })
    const { docs: jobs } = await payload.find({
      collection: 'prospect-jobs',
      where: { batch: { equals: id } },
      limit: 100,
      depth: 0,
      overrideAccess: true,
      select: { prospect: true, status: true, error: true },
    })
    return NextResponse.json({ batch, prospects: docs, jobs })
  }

  if (view.get('view') === 'calls') {
    const endOfDay = new Date()
    endOfDay.setHours(23, 59, 59, 999)
    const now = new Date().toISOString()
    const where: Where = {
      and: [
        { status: { in: ['informe', 'contactado'] } },
        { or: [{ nextAttemptAt: { exists: false } }, { nextAttemptAt: { less_than_equal: endOfDay.toISOString() } }] },
        { or: [{ blockedUntil: { exists: false } }, { blockedUntil: { less_than: now } }] },
      ],
    }
    const { docs } = await payload.find({ collection: 'prospects', where, limit: 60, depth: 0, overrideAccess: true, select: BATCH_FIELDS })
    // Whoever pressed a button in the report in the last three days goes first, then whoever opened it; then the best scores.
    const within = (date?: string | null) => (date && Date.now() - Date.parse(date) < 3 * 86400000 ? Date.parse(date) : 0)
    const warmth = (p: (typeof docs)[number]) => (within(p.reportClickedAt) ? 2 : within(p.reportLastOpenedAt) ? 1 : 0)
    docs.sort(
      (a, b) =>
        warmth(b) - warmth(a) ||
        within(b.reportClickedAt) - within(a.reportClickedAt) ||
        within(b.reportLastOpenedAt) - within(a.reportLastOpenedAt) ||
        (b.score ?? 0) - (a.score ?? 0),
    )
    return NextResponse.json({ prospects: docs })
  }

  await ensureDefaultProfiles(payload)
  await closeStale(payload)
  const [profiles, batches, running, team] = await Promise.all([
    payload.find({ collection: 'offer-profiles', sort: 'name', limit: 100, depth: 0, overrideAccess: true, pagination: false }),
    payload.find({ collection: 'prospect-batches', sort: '-createdAt', limit: 15, depth: 1, overrideAccess: true }),
    payload.count({ collection: 'prospect-jobs', where: { status: { in: ['queued', 'running'] } }, overrideAccess: true }),
    payload.find({ collection: 'team', where: { placeholder: { not_equals: true } }, sort: 'order', limit: 20, depth: 0, overrideAccess: true }),
  ])
  return NextResponse.json({
    configured: placesConfigured(),
    profiles: profiles.docs,
    team: team.docs.map((t) => ({ id: t.id, name: t.name, role: t.role ?? '' })),
    paymentTerms: termsFrom(await getSettings()),
    batches: batches.docs.map((b) => ({ ...b, profile: { id: (b.profile as OfferProfile).id, name: (b.profile as OfferProfile).name } })),
    working: running.totalDocs,
  })
}

export async function POST(req: Request) {
  const auth = await signedIn()
  if (!auth) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const { payload, user } = auth
  if (rateLimited(`generator:${user.id}`, 120)) return NextResponse.json({ error: 'too_many_requests' }, { status: 429 })

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }
  const prospectId = Number(body.prospectId)

  try {
    switch (body.action) {
      case 'start-batch': {
        if (!placesConfigured()) return NextResponse.json({ error: 'not_configured' }, { status: 503 })
        const niche = clean(body.niche, 200)
        const zone = clean(body.zone, 120)
        if (!niche || !zone || !body.profileId) return NextResponse.json({ error: 'missing_fields' }, { status: 422 })
        const running = await payload.count({ collection: 'prospect-batches', where: { status: { equals: 'buscando' } }, overrideAccess: true })
        if (running.totalDocs) return NextResponse.json({ error: 'busy' }, { status: 409 })
        const batch = await startBatch({ profileId: Number(body.profileId), niche, zone, userId: user.id })
        // The search and the site checks take minutes: they run after answering.
        after(() => runBatch(batch.id))
        return NextResponse.json({ batchId: batch.id })
      }
      case 'research': {
        const queued = await startResearch(Number(body.batchId))
        return NextResponse.json({ queued })
      }
      case 'propose-profile': {
        const offer = clean(body.offer, 1500)
        if (offer.length < 10) return NextResponse.json({ error: 'missing_fields' }, { status: 422 })
        await proposeProfile(offer)
        return NextResponse.json({ ok: true })
      }
      case 'approve-profile':
        return NextResponse.json(await approveProfile(Number(body.id), user.id))
      case 'choose':
      case 'unchoose':
      case 'discard': {
        const status = body.action === 'choose' ? 'elegido' : body.action === 'unchoose' ? 'pendiente' : 'descartado'
        await payload.update({ collection: 'prospects', id: prospectId, overrideAccess: true, data: { status } })
        return NextResponse.json({ ok: true })
      }
      case 'report-draft': {
        const prospect = await payload.findByID({ collection: 'prospects', id: prospectId, depth: 1, overrideAccess: true })
        const [label, competitors] = await Promise.all([placeLabel(prospect.placeId), competitorsFor(prospect, prospect.zone ?? '')])
        const report = draftReport(prospect, prospect.profile as OfferProfile, label.name, competitors, await signerFor(payload, user))
        await payload.update({
          collection: 'prospects',
          id: prospectId,
          overrideAccess: true,
          data: { report: report as unknown as Record<string, unknown> },
        })
        return NextResponse.json({ report })
      }
      // Searches the competitors again for a report already drafted, without touching anything written in it.
      case 'report-competitors': {
        const prospect = await payload.findByID({ collection: 'prospects', id: prospectId, depth: 0, overrideAccess: true })
        if (!prospect.report) return NextResponse.json({ error: 'no_report' }, { status: 422 })
        const competitors = await competitorsFor(prospect, prospect.zone ?? '')
        if (!competitors.length) return NextResponse.json({ error: 'places_failed' }, { status: 502 })
        const current = prospect.report as unknown as ReportContent
        const report: ReportContent = { ...current, self: current.self ?? selfRow(prospect), competitors }
        await payload.update({
          collection: 'prospects',
          id: prospectId,
          overrideAccess: true,
          data: { report: report as unknown as Record<string, unknown> },
        })
        return NextResponse.json({ report })
      }
      case 'report-save': {
        const input = (body.report ?? {}) as Partial<ReportContent>
        const prospect = await payload.findByID({ collection: 'prospects', id: prospectId, depth: 0, overrideAccess: true })
        const current = (prospect.report ?? {}) as unknown as ReportContent
        const findings = Array.isArray(input.findings) ? input.findings.slice(0, 5) : current.findings
        // Competitors can be removed and renamed by hand, never added: their measurements are ours.
        const edited = Array.isArray(input.competitors) ? new Map(input.competitors.map((c) => [c?.placeId, c])) : null
        // The logo is looked up again by its ID: null removes it, missing keeps the one it had.
        const logo =
          input.logo === null ? null : input.logo?.id !== undefined ? await reportLogo(payload, input.logo.id) : (current.logo ?? null)
        const signer = Number(input.signer)
        const report: ReportContent = {
          ...current,
          logo,
          signer: input.signer === null ? null : Number.isInteger(signer) && signer > 0 ? signer : (current.signer ?? null),
          showAreas: typeof input.showAreas === 'boolean' ? input.showAreas : Boolean(current.showAreas),
          offer: input.offer === null ? null : input.offer ? cleanOffer(input.offer) : (current.offer ?? null),
          competitors: (current.competitors ?? [])
            .filter((c) => !edited || edited.has(c.placeId))
            .map((c) => {
              const name = edited?.get(c.placeId)?.name
              return typeof name === 'string' ? { ...c, name: clean(name, 120) || null } : c
            }),
          company: clean(input.company, 160) || current.company,
          headline: clean(input.headline, 200) || current.headline,
          intro: clean(input.intro, 1500),
          findings: findings.map((f) => ({
            title: clean(f.title, 200),
            detail: clean(f.detail, 1500),
            impact: clean(f.impact, 1000),
            source: clean(f.source, 500),
          })),
          comparison: clean(input.comparison, 1500),
          costFormula: clean(input.costFormula, 1000),
          question: clean(input.question, 500),
          proof: clean(input.proof, 1500),
          note: clean(input.note, 1500),
        }
        await payload.update({
          collection: 'prospects',
          id: prospectId,
          overrideAccess: true,
          data: { report: report as unknown as Record<string, unknown> },
        })
        return NextResponse.json({ report })
      }
      case 'report-approve':
        return NextResponse.json(await approveReport(prospectId))
      case 'attempt': {
        const channel = oneOf(CHANNELS, body.channel)
        const result = oneOf(RESULTS, body.result)
        if (!channel || !result) return NextResponse.json({ error: 'missing_fields' }, { status: 422 })
        return NextResponse.json(await recordAttempt({ prospectId, channel, result, note: clean(body.note, 300), userId: user.id }))
      }
      case 'convert':
        return NextResponse.json(await convertProspect(prospectId, user.id))
      default:
        return NextResponse.json({ error: 'unknown_action' }, { status: 400 })
    }
  } catch (err) {
    console.error('[generator]', err)
    const message = err instanceof Error ? err.message : ''
    if (message === 'profile_not_approved') return NextResponse.json({ error: 'profile_not_approved' }, { status: 422 })
    return NextResponse.json({ error: message.startsWith('Places') ? 'places_failed' : 'failed' }, { status: 502 })
  }
}
