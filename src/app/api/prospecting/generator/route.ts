import { headers } from 'next/headers'
import { after, NextResponse } from 'next/server'
import type { Where } from 'payload'
import { placeLabel, placesConfigured } from '@/lib/places'
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
  runBatch,
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
    // Whoever opened the report in the last three days goes first; then the best scores.
    const recent = (p: (typeof docs)[number]) =>
      p.reportLastOpenedAt && Date.now() - Date.parse(p.reportLastOpenedAt) < 3 * 86400000 ? Date.parse(p.reportLastOpenedAt) : 0
    docs.sort((a, b) => recent(b) - recent(a) || (b.score ?? 0) - (a.score ?? 0))
    return NextResponse.json({ prospects: docs })
  }

  await ensureDefaultProfiles(payload)
  await closeStale(payload)
  const [profiles, batches, running] = await Promise.all([
    payload.find({ collection: 'offer-profiles', sort: 'name', limit: 100, depth: 0, overrideAccess: true, pagination: false }),
    payload.find({ collection: 'prospect-batches', sort: '-createdAt', limit: 15, depth: 1, overrideAccess: true }),
    payload.count({ collection: 'prospect-jobs', where: { status: { in: ['queued', 'running'] } }, overrideAccess: true }),
  ])
  return NextResponse.json({
    configured: placesConfigured(),
    profiles: profiles.docs,
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
        const report = draftReport(prospect, prospect.profile as OfferProfile, label.name, competitors)
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
        // Competitors can be removed from the report, never added or changed by hand.
        const keep = Array.isArray(input.competitors) ? new Set(input.competitors.map((c) => c?.placeId)) : null
        const report: ReportContent = {
          ...current,
          competitors: (current.competitors ?? []).filter((c) => !keep || keep.has(c.placeId)),
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
