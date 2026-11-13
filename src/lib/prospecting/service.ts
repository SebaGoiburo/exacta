import { randomBytes } from 'node:crypto'
import { getPayload, type Payload } from 'payload'
import config from '@payload-config'
import type { OfferProfile, Prospect, ProspectBatch, ProspectJob } from '@/payload-types'
import { offerText } from '@/lib/content-engine/service'
import { urlsSeen, type ModelResponse } from '@/lib/content-engine/prompts'
import type { Area } from '@/lib/diagnostic/questions'
import { teamNotice } from '@/lib/emails'
import { emitEvent, publicUrl } from '@/lib/leads'
import { sendToN8n } from '@/lib/n8n'
import { placeContact, placeForResearch, searchPlacesForBatch, type ScoredPlace } from '@/lib/places'
import { getSettings } from '@/lib/settings'
import { site } from '@/lib/site'
import { BLOCK_DAYS, DEFAULT_PROFILES, type Knockout, type ProfileSignal, type Scores } from './model'
import { costOf, findingsForScore, parseProfile, parseResearch, profileRequest, researchRequest, type Research } from './research'
import { rescoreWithAi, scoreCandidate, type BatchContext, type Candidate, type Flags, type ProfileForScoring, type SiteFacts } from './scoring'
import { auditSite, pageSpeed, pool, siteKey, websiteKind } from './site-audit'

export const cms = () => getPayload({ config })

const DAY = 86_400_000
const SHORTLIST = 30
const MAX_CANDIDATES = 100
/** Text Search calls per batch. The daily quota in Google Cloud is 30. */
const MAX_SEARCH_CALLS = 6
const PAGES_PER_TERM = 3
/** AI runs in flight at once, so a batch doesn't trip the model's rate limit. */
const MAX_RUNNING = 3
const JOB_STALE_MS = 15 * 60 * 1000
const BATCH_STALE_MS = 45 * 60 * 1000
/** Days to wait before each follow-up: contact on day 0, then days 3, 7 and 12. */
const FOLLOW_UP_DAYS = [3, 4, 5]
export const REPORT_DAYS = 30

type Rel<T extends { id: number }> = number | T | null | undefined
const idOf = <T extends { id: number }>(v: Rel<T>) => (typeof v === 'object' && v ? v.id : (v ?? null))
const inDays = (days: number) => new Date(Date.now() + days * DAY).toISOString()

/* Offer profiles */

export async function ensureDefaultProfiles(payload: Payload) {
  const { docs } = await payload.find({ collection: 'offer-profiles', limit: 200, depth: 0, overrideAccess: true, pagination: false })
  const byKey = new Map(docs.map((d) => [d.key, d.id]))
  for (const draft of DEFAULT_PROFILES) {
    if (byKey.has(draft.key)) continue
    const created = await payload.create({
      collection: 'offer-profiles',
      overrideAccess: true,
      data: {
        name: draft.name,
        key: draft.key,
        description: draft.description,
        status: 'aprobado',
        origin: 'inicial',
        parent: draft.parentKey ? byKey.get(draft.parentKey) : undefined,
        weights: draft.weights,
        minCapacity: draft.minCapacity,
        signals: draft.signals,
        proof: draft.proof,
        costFormula: draft.costFormula,
      },
    })
    byKey.set(draft.key, created.id)
  }
}

export const profileSignals = (p: OfferProfile): ProfileSignal[] =>
  (p.signals ?? []).map((s) => ({ key: s.key, label: s.label, weight: s.weight, area: s.area }))

export const scoringProfile = (p: OfferProfile): ProfileForScoring => ({
  weights: p.weights,
  signals: profileSignals(p),
  minCapacity: p.minCapacity,
})

/** A free-text offer: the AI drafts the profile, and it stays a draft until a person approves it. */
export async function proposeProfile(offer: string) {
  const payload = await cms()
  const job = await payload.create({
    collection: 'prospect-jobs',
    overrideAccess: true,
    data: { kind: 'profile', status: 'queued', offerText: offer },
  })
  await pump(payload)
  return job
}

export async function approveProfile(id: number, userId: number) {
  const payload = await cms()
  return payload.update({
    collection: 'offer-profiles',
    id,
    overrideAccess: true,
    data: { status: 'aprobado', approvedBy: userId, approvedAt: new Date().toISOString() },
  })
}

/* Batches: first pass, without AI */

/** What we keep about each company: our own measurements, not Google's content. */
export type Facts = {
  query: string
  rank: number
  count: number
  branches: number
  website: Candidate['website']
  site: SiteFacts | null
  pageSpeed: number | null
  hasPhone: boolean
  auto: Record<string, boolean | null | 'na'>
  flags: Flags
}

export async function startBatch(a: { profileId: number; niche: string; zone: string; userId: number }) {
  const payload = await cms()
  const profile = await payload.findByID({ collection: 'offer-profiles', id: a.profileId, depth: 0, overrideAccess: true })
  if (profile.status !== 'aprobado') throw new Error('profile_not_approved')
  const date = new Date().toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })
  return payload.create({
    collection: 'prospect-batches',
    overrideAccess: true,
    data: {
      title: `${profile.name} · ${a.niche} · ${a.zone} · ${date}`,
      profile: profile.id,
      niche: a.niche,
      zone: a.zone,
      status: 'buscando',
      progress: 'Buscando en Google Maps…',
      startedBy: a.userId,
    },
  })
}

/** Runs after the response: searches, reads each site, measures speed, scores and keeps the best 30. */
export async function runBatch(batchId: number) {
  const payload = await cms()
  const update = (data: Partial<ProspectBatch>) =>
    payload.update({ collection: 'prospect-batches', id: batchId, overrideAccess: true, data })

  try {
    const batch = await payload.findByID({ collection: 'prospect-batches', id: batchId, depth: 1, overrideAccess: true })
    const profileDoc = batch.profile as OfferProfile
    const profile = scoringProfile(profileDoc)

    // 1. Search. Several terms separated by commas widen the net; each keeps its own ranking.
    const terms = batch.niche
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean)
      .slice(0, 3)
    type Found = ScoredPlace & { rank: number; query: number }
    const found = new Map<string, Found>()
    const counts: number[] = []
    let calls = 0
    for (const [query, term] of terms.entries()) {
      let token: string | undefined
      let rank = 0
      for (let page = 0; page < PAGES_PER_TERM && calls < MAX_SEARCH_CALLS && found.size < MAX_CANDIDATES; page++) {
        const result = await searchPlacesForBatch(`${term} en ${batch.zone}`, token)
        calls++
        for (const place of result.places) {
          rank++
          if (!found.has(place.id)) found.set(place.id, { ...place, rank, query })
        }
        token = result.nextPageToken
        if (!token) break
      }
      counts[query] = rank
    }
    await update({ found: found.size, placesCalls: calls, progress: `${found.size} comercios encontrados. Revisando sus sitios…` })

    // 2. Branches: results that share a website are one business. The best placed one stays.
    const sitesOf = new Map<string, Found[]>()
    for (const f of found.values()) {
      const key = websiteKind(f.website) === 'own' ? siteKey(f.website) : null
      if (key) sitesOf.set(key, [...(sitesOf.get(key) ?? []), f])
    }
    const branchesOf = (f: Found) => {
      const key = websiteKind(f.website) === 'own' ? siteKey(f.website) : null
      return key ? (sitesOf.get(key) ?? [f]) : [f]
    }
    const merged = [...found.values()].filter((f) => {
      const group = branchesOf(f)
      return group.reduce((best, g) => (g.rank < best.rank ? g : best)) === f
    })

    // 3. Their own sites and, for those that load, PageSpeed on mobile.
    const own = merged.filter((f) => websiteKind(f.website) === 'own')
    const sites = new Map<string, SiteFacts | null>()
    await pool(own, 8, async (f) => {
      sites.set(f.id, await auditSite(f.website!))
    })
    const readable = own.filter((f) => sites.get(f.id)?.reachable)
    await update({ progress: `Midiendo la velocidad de ${readable.length} sitios en PageSpeed…` })
    const speeds = new Map<string, number | null>()
    await pool(readable, 4, async (f) => {
      speeds.set(f.id, await pageSpeed(f.website!))
    })

    // 4. Score each company against its own search.
    const candidates = merged.map((f) => ({
      found: f,
      candidate: {
        placeId: f.id,
        rank: f.rank,
        branches: branchesOf(f).length,
        operational: f.operational,
        rating: f.rating ?? null,
        reviews: f.reviews ?? null,
        priceLevel: f.priceLevel ?? null,
        hasPhone: Boolean(f.phone),
        website: websiteKind(f.website),
        site: sites.get(f.id) ?? null,
        pageSpeed: speeds.get(f.id) ?? null,
      } satisfies Candidate,
    }))
    const allReviews = candidates.map((c) => c.candidate.reviews).filter((r): r is number => r !== null)
    const contexts = terms.map((_, query): BatchContext => {
      const leaders = candidates
        .filter((c) => c.found.query === query)
        .sort((a, b) => a.candidate.rank - b.candidate.rank)
        .slice(0, 3)
        .map(({ candidate: c }) => ({ rating: c.rating, reviews: c.reviews, pageSpeed: c.pageSpeed, website: c.website }))
      return { reviews: allReviews, leaders, count: counts[query] ?? 0 }
    })

    const excluded = await databaseKnockouts(
      payload,
      candidates.map((c) => c.candidate.placeId),
    )
    const scored = candidates.map(({ found: f, candidate }) => {
      const result = scoreCandidate(candidate, contexts[f.query], profile)
      return { f, candidate, result, knockouts: [...result.knockouts, ...(excluded.get(candidate.placeId) ?? [])] }
    })
    const eligible = scored.filter((s) => !s.knockouts.length).sort((a, b) => b.result.score - a.result.score)
    const shortlist = eligible.slice(0, SHORTLIST)

    // 5. Save the best 30. Only the place ID and our own analysis are stored.
    const { docs: previous } = await payload.find({
      collection: 'prospects',
      where: { placeId: { in: shortlist.map((s) => s.candidate.placeId) } },
      limit: SHORTLIST,
      depth: 0,
      overrideAccess: true,
    })
    const previousOf = new Map(previous.map((p) => [p.placeId, p]))
    for (const { f, candidate, result } of shortlist) {
      const facts: Facts = {
        query: terms[f.query],
        rank: candidate.rank,
        count: counts[f.query] ?? 0,
        branches: candidate.branches,
        website: candidate.website,
        site: candidate.site,
        pageSpeed: candidate.pageSpeed,
        hasPhone: candidate.hasPhone,
        auto: result.auto,
        flags: result.flags,
      }
      const data = {
        niche: batch.niche,
        zone: batch.zone,
        batch: batchId,
        profile: profileDoc.id,
        status: 'pendiente' as const,
        shortlisted: true,
        score: result.score,
        tier: result.tier,
        pass: 1,
        missing: result.missing,
        scores: result.scores as unknown as Record<string, unknown>,
        knockouts: [],
        facts: facts as unknown as Record<string, unknown>,
        research: null,
        hook: null,
        report: null,
        reportToken: null,
        reportReviewedAt: null,
        reportExpiresAt: null,
        reportSentAt: null,
      }
      const prev = previousOf.get(candidate.placeId)
      if (prev) await payload.update({ collection: 'prospects', id: prev.id, overrideAccess: true, data })
      else await payload.create({ collection: 'prospects', overrideAccess: true, data: { placeId: candidate.placeId, ...data } })
    }

    await update({
      status: 'puntuada',
      knockedOut: scored.length - eligible.length,
      kept: shortlist.length,
      progress: `Primera pasada lista: ${shortlist.length} prospectos de ${found.size} comercios.`,
    })
  } catch (err) {
    console.error('[prospecting] batch failed', err)
    const message = err instanceof Error ? err.message : String(err)
    await update({
      status: 'fallo',
      error: /Places responded (403|429)/.test(message)
        ? 'Google Maps rechazó la búsqueda: revisá la clave o el cupo diario.'
        : message.slice(0, 300),
      progress: 'La tanda no terminó.',
    }).catch(() => undefined)
  }
}

/** Companies that can't enter a batch: clients, companies in the CRM, recently contacted or already in progress. */
async function databaseKnockouts(payload: Payload, placeIds: string[]) {
  const out = new Map<string, Knockout[]>()
  const add = (placeId: string, k: Knockout) => out.set(placeId, [...(out.get(placeId) ?? []), k])
  if (!placeIds.length) return out
  const now = Date.now()

  const { docs: prospects } = await payload.find({
    collection: 'prospects',
    where: { placeId: { in: placeIds } },
    limit: placeIds.length,
    depth: 0,
    overrideAccess: true,
  })
  for (const p of prospects) {
    if (p.blockedUntil && Date.parse(p.blockedUntil) > now) add(p.placeId, 'bloqueado')
    else if (['elegido', 'informe', 'contactado', 'interesado'].includes(p.status)) add(p.placeId, 'en_proceso')
  }

  const { docs: contacts } = await payload.find({
    collection: 'contacts',
    where: { placeId: { in: placeIds } },
    limit: placeIds.length,
    depth: 0,
    overrideAccess: true,
  })
  if (contacts.length) {
    const { docs: won } = await payload.find({
      collection: 'leads',
      where: { and: [{ contact: { in: contacts.map((c) => c.id) } }, { stage: { equals: 'ganado' } }] },
      limit: 100,
      depth: 0,
      overrideAccess: true,
    })
    const clients = new Set(won.map((l) => idOf(l.contact)))
    for (const c of contacts) {
      if (!c.placeId) continue
      if (clients.has(c.id)) add(c.placeId, 'cliente')
      else if (!out.has(c.placeId)) add(c.placeId, 'en_proceso')
    }
  }
  return out
}

/* Second pass: the AI researches the shortlist */

export async function startResearch(batchId: number) {
  const payload = await cms()
  const pending = await payload.count({
    collection: 'prospect-jobs',
    where: { and: [{ batch: { equals: batchId } }, { status: { in: ['queued', 'running'] } }] },
    overrideAccess: true,
  })
  if (pending.totalDocs) return 0
  const { docs } = await payload.find({
    collection: 'prospects',
    where: {
      and: [{ batch: { equals: batchId } }, { shortlisted: { equals: true } }, { pass: { equals: 1 } }, { status: { not_equals: 'descartado' } }],
    },
    limit: SHORTLIST,
    depth: 0,
    overrideAccess: true,
  })
  for (const prospect of docs) {
    await payload.create({
      collection: 'prospect-jobs',
      overrideAccess: true,
      data: { kind: 'research', status: 'queued', prospect: prospect.id, batch: batchId },
    })
  }
  if (docs.length) {
    await payload.update({
      collection: 'prospect-batches',
      id: batchId,
      overrideAccess: true,
      data: { status: 'investigando', progress: `Investigando ${docs.length} prospectos con IA…` },
    })
  }
  await pump(payload)
  return docs.length
}

// One process serves the site, so a promise chain is enough to never start the same job twice.
let pumping: Promise<void> = Promise.resolve()

export function pump(payload: Payload) {
  pumping = pumping.then(() => startQueued(payload)).catch((err) => console.error('[prospecting] pump failed', err))
  return pumping
}

async function startQueued(payload: Payload) {
  const running = await payload.count({ collection: 'prospect-jobs', where: { status: { equals: 'running' } }, overrideAccess: true })
  const free = MAX_RUNNING - running.totalDocs
  if (free <= 0) return
  const { docs } = await payload.find({
    collection: 'prospect-jobs',
    where: { status: { equals: 'queued' } },
    sort: 'createdAt',
    limit: free,
    depth: 0,
    overrideAccess: true,
  })
  for (const job of docs) await startJob(payload, job)
}

async function startJob(payload: Payload, job: ProspectJob) {
  try {
    const request = job.kind === 'profile' ? profileRequest(job.offerText ?? '', offerText()) : await researchFor(payload, job)
    await payload.update({
      collection: 'prospect-jobs',
      id: job.id,
      overrideAccess: true,
      data: { status: 'running', startedAt: new Date().toISOString(), request: request as unknown as Record<string, unknown> },
    })
    await dispatch(job.id, request)
  } catch (err) {
    console.error('[prospecting] job could not start', err)
    await failJob(payload, job.id, err instanceof Error && err.message.startsWith('Places') ? 'Google Maps no respondió.' : 'No se pudo iniciar.')
  }
}

async function researchFor(payload: Payload, job: ProspectJob) {
  const prospect = await payload.findByID({ collection: 'prospects', id: idOf(job.prospect)!, depth: 0, overrideAccess: true })
  const batch = await payload.findByID({ collection: 'prospect-batches', id: idOf(prospect.batch)!, depth: 1, overrideAccess: true })
  const profile = batch.profile as OfferProfile
  const facts = prospect.facts as unknown as Facts
  const scores = prospect.scores as unknown as Scores
  const place = await placeForResearch(prospect.placeId)
  return researchRequest({
    profile: {
      name: profile.name,
      description: profile.description,
      proof: profile.proof ?? '',
      costFormula: profile.costFormula ?? '',
      signals: profileSignals(profile),
    },
    niche: facts.query || batch.niche,
    zone: batch.zone,
    place,
    facts: { rank: facts.rank, count: facts.count, branches: facts.branches, site: facts.site, website: facts.website, pageSpeed: facts.pageSpeed },
    comparison: scores.gap?.why ?? [],
  })
}

/** The same n8n flow the content engine uses: it forwards the request to the model and returns the answer. */
async function dispatch(jobId: number, request: unknown) {
  const url = process.env.N8N_CONTENT_URL
  if (!url) throw new Error('N8N_CONTENT_URL is not set')
  await sendToN8n(url, 'content.run', { jobId: `prospect:${jobId}`, request })
}

async function failJob(payload: Payload, jobId: number, error: string, extraCost = 0) {
  const job = await payload.findByID({ collection: 'prospect-jobs', id: jobId, depth: 0, overrideAccess: true })
  await payload.update({
    collection: 'prospect-jobs',
    id: jobId,
    overrideAccess: true,
    data: { status: 'failed', error: error.slice(0, 300), request: null, costUsd: (job.costUsd ?? 0) + extraCost },
  })
  const batchId = idOf(job.batch)
  if (batchId) await finishBatchIfDone(payload, batchId)
}

const MAX_CONTINUATIONS = 4

/** n8n's answer for a prospect job. */
export async function handleProspectResult(jobId: number, response: ModelResponse) {
  const payload = await cms()
  try {
    const job = await payload.findByID({ collection: 'prospect-jobs', id: jobId, depth: 0, overrideAccess: true })
    if (job.status !== 'running') return
    const cost = (job.costUsd ?? 0) + costOf(response)

    if (!Array.isArray(response?.content)) return failJob(payload, jobId, response?.error?.message || 'El modelo no respondió.', costOf(response))

    const seen = [...((job.sourcesSeen as string[]) ?? []), ...urlsSeen(response)]
    if (response.stop_reason === 'pause_turn') {
      if ((job.continuations ?? 0) >= MAX_CONTINUATIONS) return failJob(payload, jobId, 'La búsqueda no terminó a tiempo.', costOf(response))
      const request = job.request as { messages: { role: string; content: unknown }[] }
      const next = { ...request, messages: [request.messages[0], { role: 'assistant', content: response.content }] }
      await payload.update({
        collection: 'prospect-jobs',
        id: jobId,
        overrideAccess: true,
        data: { request: next, sourcesSeen: seen, continuations: (job.continuations ?? 0) + 1, costUsd: cost },
      })
      return dispatch(jobId, next)
    }

    if (job.kind === 'profile') {
      const draft = parseProfile(response)
      if (!draft) return failJob(payload, jobId, 'La propuesta de perfil no tenía el formato esperado.', costOf(response))
      const key = `${draft.name
        .toLowerCase()
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
        .slice(0, 40)}-${randomBytes(2).toString('hex')}`
      await payload.create({
        collection: 'offer-profiles',
        overrideAccess: true,
        data: {
          name: draft.name,
          key,
          description: `${draft.description}\n\nPedido original: ${job.offerText ?? ''}\n\nCriterio de la IA: ${draft.reasoning}`.trim(),
          status: 'borrador',
          origin: 'texto_libre',
          weights: draft.weights,
          minCapacity: draft.minCapacity,
          signals: draft.signals,
          proof: draft.proof,
          costFormula: draft.costFormula,
        },
      })
      await payload.update({ collection: 'prospect-jobs', id: jobId, overrideAccess: true, data: { status: 'done', request: null, costUsd: cost } })
      return
    }

    const research = parseResearch(response, (job.sourcesSeen as string[]) ?? [])
    if (!research) return failJob(payload, jobId, 'La investigación no tenía el formato esperado.', costOf(response))
    await applyResearch(payload, idOf(job.prospect)!, research)
    await payload.update({ collection: 'prospect-jobs', id: jobId, overrideAccess: true, data: { status: 'done', request: null, costUsd: cost } })
    const batchId = idOf(job.batch)
    if (batchId) await finishBatchIfDone(payload, batchId)
  } finally {
    await pump(payload)
  }
}

async function applyResearch(payload: Payload, prospectId: number, research: Research) {
  const prospect = await payload.findByID({ collection: 'prospects', id: prospectId, depth: 1, overrideAccess: true })
  const profile = prospect.profile as OfferProfile
  const facts = prospect.facts as unknown as Facts
  const result = rescoreWithAi(
    {
      scores: prospect.scores as unknown as Scores,
      auto: facts.auto,
      flags: facts.flags,
      hasPhone: facts.hasPhone,
      site: facts.site,
      siteDown: facts.website === 'own' && Boolean(facts.site) && !facts.site?.reachable,
    },
    scoringProfile(profile),
    findingsForScore(research),
  )
  await payload.update({
    collection: 'prospects',
    id: prospectId,
    overrideAccess: true,
    data: {
      research: research as unknown as Record<string, unknown>,
      hook: research.hook.text || null,
      scores: result.scores as unknown as Record<string, unknown>,
      score: result.score,
      tier: result.tier,
      missing: result.missing,
      knockouts: result.knockouts,
      pass: 2,
    },
  })
}

async function finishBatchIfDone(payload: Payload, batchId: number) {
  const { docs } = await payload.find({
    collection: 'prospect-jobs',
    where: { batch: { equals: batchId } },
    limit: 200,
    depth: 0,
    overrideAccess: true,
    pagination: false,
  })
  const cost = Math.round(docs.reduce((sum, j) => sum + (j.costUsd ?? 0), 0) * 100) / 100
  const open = docs.filter((j) => j.status === 'queued' || j.status === 'running').length
  const failed = docs.filter((j) => j.status === 'failed').length
  await payload.update({
    collection: 'prospect-batches',
    id: batchId,
    overrideAccess: true,
    data: open
      ? { aiCostUsd: cost, progress: `Investigando con IA: faltan ${open}.` }
      : {
          aiCostUsd: cost,
          status: 'lista',
          finishedAt: new Date().toISOString(),
          progress: failed ? `Lista. ${failed} investigaciones fallaron y quedaron con el puntaje de la primera pasada.` : 'Lista.',
        },
  })
}

/** Work that lost its answer (a restart, n8n down) stops looking busy, and the queue moves on. */
export async function closeStale(payload: Payload) {
  const { docs: jobs } = await payload.find({
    collection: 'prospect-jobs',
    where: { and: [{ status: { equals: 'running' } }, { startedAt: { less_than: new Date(Date.now() - JOB_STALE_MS).toISOString() } }] },
    limit: 50,
    depth: 0,
    overrideAccess: true,
  })
  for (const job of jobs) await failJob(payload, job.id, 'No hubo respuesta a tiempo.')
  const { docs: batches } = await payload.find({
    collection: 'prospect-batches',
    where: { and: [{ status: { equals: 'buscando' } }, { createdAt: { less_than: new Date(Date.now() - BATCH_STALE_MS).toISOString() } }] },
    limit: 10,
    depth: 0,
    overrideAccess: true,
  })
  for (const batch of batches) {
    await payload.update({
      collection: 'prospect-batches',
      id: batch.id,
      overrideAccess: true,
      data: { status: 'fallo', error: 'La búsqueda se interrumpió.', progress: 'La tanda no terminó.' },
    })
  }
  await pump(payload)
}

/* Reports */

/** A well-placed competitor. Only its Google ID and our own measurements are kept; name and rating are read live. */
export type Competitor = {
  placeId: string
  /** Position in Google Maps for the same search when the report was drafted. */
  position: number
  website: Candidate['website']
  booking: boolean | null
  pageSpeed: number | null
}

const LEADERS_TTL_MS = 6 * 60 * 60 * 1000
const LEADER_SPEED_TIMEOUT_MS = 30000
const leadersCache = new Map<string, { at: number; leaders: Competitor[] }>()

/**
 * The first four in Google Maps for a niche and zone, with their sites measured. Asked once per niche for
 * every report of a batch (one search and up to four PageSpeed runs), then reused for a few hours.
 */
async function leadersFor(query: string, zone: string): Promise<Competitor[]> {
  const key = `${query}|${zone}`.toLowerCase()
  const cached = leadersCache.get(key)
  if (cached && Date.now() - cached.at < LEADERS_TTL_MS) return cached.leaders
  const { places } = await searchPlacesForBatch(`${query} en ${zone}`)
  const top = places.slice(0, 4)
  const leaders = await pool(top, 4, async (place): Promise<Competitor> => {
    const website = websiteKind(place.website)
    const site = website === 'own' ? await auditSite(place.website!) : null
    return {
      placeId: place.id,
      position: top.indexOf(place) + 1,
      website,
      booking: site?.reachable ? site.booking : website === 'own' ? null : false,
      // Shorter than the batch's: a person is waiting for the draft and the web server cuts requests at 60 s.
      pageSpeed: site?.reachable ? await pageSpeed(place.website!, LEADER_SPEED_TIMEOUT_MS) : null,
    }
  })
  leadersCache.set(key, { at: Date.now(), leaders })
  return leaders
}

/** The three best placed in the prospect's own search, without the prospect. Empty if Google doesn't answer. */
export async function competitorsFor(prospect: Prospect, zone: string): Promise<Competitor[]> {
  const facts = prospect.facts as unknown as Facts | null
  const query = facts?.query || prospect.niche
  if (!query) return []
  try {
    return (await leadersFor(query, zone)).filter((c) => c.placeId !== prospect.placeId).slice(0, 3)
  } catch (err) {
    console.error('[prospecting] competitors not found', err)
    return []
  }
}

export type ReportContent = {
  company: string
  /** The prospect's own row in the comparison, from what we measured. */
  self?: Omit<Competitor, 'placeId'> & { placeId: string }
  competitors?: Competitor[]
  headline: string
  intro: string
  findings: { title: string; detail: string; impact: string; source: string }[]
  comparison: string
  costFormula: string
  question: string
  proof: string
  note: string
  areas: Record<Area, number> | null
  date: string
}

export function draftReport(prospect: Prospect, profile: OfferProfile, company: string, competitors: Competitor[] = []): ReportContent {
  const research = prospect.research as unknown as Research | null
  const facts = prospect.facts as unknown as Facts | null
  return {
    company,
    self: {
      placeId: prospect.placeId,
      position: facts?.rank ?? 0,
      website: facts?.website ?? 'none',
      booking: facts?.site?.reachable ? facts.site.booking : facts?.website === 'own' ? null : false,
      pageSpeed: facts?.pageSpeed ?? null,
    },
    competitors,
    headline: `Lo que vimos de ${company} desde afuera`,
    intro: `Revisamos lo que ve cualquier persona antes de elegir a ${company}: su perfil en Google Maps, su sitio web y cómo aparece frente a otros ${facts?.query ?? prospect.niche ?? 'negocios'} de ${prospect.zone ?? 'la zona'}. Encontramos tres puntos que vale la pena mirar.`,
    findings: research?.findings ?? [],
    comparison: research?.comparison ?? '',
    costFormula: profile.costFormula ?? '',
    question: research?.openQuestion ?? '',
    proof: profile.proof ?? '',
    note: '',
    areas: research?.areas ?? null,
    date: new Date().toISOString(),
  }
}

export const newReportToken = () => randomBytes(12).toString('base64url')

/** Sebastián's review is what releases the report: from then on it has a link that expires. */
export async function approveReport(prospectId: number) {
  const payload = await cms()
  const prospect = await payload.findByID({ collection: 'prospects', id: prospectId, depth: 0, overrideAccess: true })
  return payload.update({
    collection: 'prospects',
    id: prospectId,
    overrideAccess: true,
    data: {
      reportToken: prospect.reportToken || newReportToken(),
      reportReviewedAt: new Date().toISOString(),
      reportExpiresAt: inDays(REPORT_DAYS),
      status: prospect.status === 'pendiente' || prospect.status === 'elegido' ? 'informe' : prospect.status,
    },
  })
}

export const reportUrl = (token: string) => `${publicUrl()}/informe/${token}`

/* Contact attempts and the follow-up sequence */

type Channel = 'llamada' | 'whatsapp' | 'email' | 'instagram' | 'visita'
type AttemptResult = 'enviado' | 'no_atendio' | 'hablo' | 'rechazo'

export async function recordAttempt(a: { prospectId: number; channel: Channel; result: AttemptResult; note?: string; userId: number }) {
  const payload = await cms()
  const prospect = await payload.findByID({ collection: 'prospects', id: a.prospectId, depth: 0, overrideAccess: true })
  const attempts = [
    ...(prospect.attempts ?? []).map((t) => ({ ...t, by: idOf(t.by) })),
    { date: new Date().toISOString(), channel: a.channel, result: a.result, note: a.note || undefined, by: a.userId },
  ]
  const now = new Date().toISOString()
  const base = { attempts, reportSentAt: prospect.reportSentAt ?? (a.result === 'enviado' ? now : undefined) }

  if (a.result === 'rechazo') {
    return payload.update({
      collection: 'prospects',
      id: a.prospectId,
      overrideAccess: true,
      data: { ...base, status: 'descartado', outcome: 'rechazo', outcomeAt: now, nextAttemptAt: null, blockedUntil: inDays(BLOCK_DAYS) },
    })
  }
  if (a.result === 'hablo') {
    await payload.update({ collection: 'prospects', id: a.prospectId, overrideAccess: true, data: base })
    return convertProspect(a.prospectId, a.userId)
  }
  const step = attempts.length
  if (step > FOLLOW_UP_DAYS.length) {
    return payload.update({
      collection: 'prospects',
      id: a.prospectId,
      overrideAccess: true,
      data: { ...base, status: 'descartado', outcome: 'sin_respuesta', outcomeAt: now, nextAttemptAt: null, blockedUntil: inDays(BLOCK_DAYS) },
    })
  }
  return payload.update({
    collection: 'prospects',
    id: a.prospectId,
    overrideAccess: true,
    data: { ...base, status: 'contactado', nextAttemptAt: inDays(FOLLOW_UP_DAYS[step - 1]) },
  })
}

const ACTIVITY: Record<Channel, 'llamada' | 'whatsapp' | 'email' | 'nota' | 'reunion'> = {
  llamada: 'llamada',
  whatsapp: 'whatsapp',
  email: 'email',
  instagram: 'nota',
  visita: 'reunion',
}
const RESULT_TEXT: Record<AttemptResult, string> = {
  enviado: 'Se le envió el informe',
  no_atendio: 'No atendió',
  hablo: 'Habló con nosotros',
  rechazo: 'No le interesa',
}
const PRIORITY = { A: '3', B: '2', C: '1' } as const

/** The prospect answered: from here on it's a contact and an opportunity in the CRM, with everything we know. */
export async function convertProspect(prospectId: number, userId: number) {
  const payload = await cms()
  const prospect = await payload.findByID({ collection: 'prospects', id: prospectId, depth: 1, overrideAccess: true })
  const existingLead = idOf(prospect.lead)
  if (existingLead) return { leadId: existingLead }

  const place = await placeContact(prospect.placeId)
  const research = prospect.research as unknown as Research | null
  const profile = typeof prospect.profile === 'object' ? prospect.profile : null
  const areas = research?.areas ? Object.values(research.areas) : []
  const maturity = areas.length ? Math.round(areas.reduce((a, b) => a + b, 0) / areas.length) : undefined

  const { docs } = await payload.find({
    collection: 'contacts',
    where: { placeId: { equals: prospect.placeId } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  })
  const contact =
    docs[0] ??
    (await payload.create({
      collection: 'contacts',
      overrideAccess: true,
      context: { skipN8n: true },
      data: {
        name: research?.decisionMaker.name || place.name,
        company: place.name,
        role: research?.decisionMaker.role || undefined,
        phone: place.phone,
        website: place.website,
        source: 'prospeccion',
        placeId: prospect.placeId,
        notes: prospect.notes ?? undefined,
      },
    }))

  const lines = [
    prospect.hook && `Hallazgo: ${prospect.hook}`,
    prospect.reportToken && `Informe: ${reportUrl(prospect.reportToken)}`,
    research?.summary && `Por qué lo elegimos: ${research.summary}`,
  ].filter(Boolean)

  const lead = await payload.create({
    collection: 'leads',
    overrideAccess: true,
    context: { skipN8n: true },
    data: {
      title: `Prospección · ${place.name}`,
      contact: contact.id,
      stage: 'contactado',
      source: 'prospeccion',
      interest: profile?.name ?? prospect.niche ?? undefined,
      message: lines.join('\n') || undefined,
      tier: prospect.tier ?? undefined,
      fit: prospect.score ?? undefined,
      maturity,
      priority: prospect.tier ? PRIORITY[prospect.tier] : '1',
      assignedTo: userId,
      activity: (prospect.attempts ?? []).map((t) => ({
        type: ACTIVITY[t.channel],
        date: t.date,
        text: `${RESULT_TEXT[t.result]}${t.note ? `: ${t.note}` : ''}`,
      })),
    },
  })
  await payload.update({
    collection: 'prospects',
    id: prospectId,
    overrideAccess: true,
    data: { lead: lead.id, status: 'interesado', nextAttemptAt: null },
  })
  return { leadId: lead.id }
}

/* Report opens */

const NOTIFY_GAP_MS = 6 * 60 * 60 * 1000

/** Counts a real open (the page sends it after a few seconds) and tells the team, at most every 6 hours. */
export async function registerOpen(token: string) {
  const payload = await cms()
  const { docs } = await payload.find({
    collection: 'prospects',
    where: { reportToken: { equals: token } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  })
  const prospect = docs[0]
  if (!prospect?.reportExpiresAt || Date.parse(prospect.reportExpiresAt) < Date.now()) return
  const now = new Date()
  const last = prospect.reportLastOpenedAt ? Date.parse(prospect.reportLastOpenedAt) : 0
  const opens = (prospect.reportOpens ?? 0) + 1
  await payload.update({
    collection: 'prospects',
    id: prospect.id,
    overrideAccess: true,
    data: {
      reportOpens: opens,
      reportOpenedAt: prospect.reportOpenedAt ?? now.toISOString(),
      reportLastOpenedAt: now.toISOString(),
      // Whoever is reading the report right now goes to the top of today's calls.
      ...(prospect.status === 'contactado' || prospect.status === 'informe' ? { nextAttemptAt: now.toISOString() } : {}),
    },
  })
  if (now.getTime() - last < NOTIFY_GAP_MS) return
  const settings = await getSettings()
  const company = (prospect.report as unknown as ReportContent | null)?.company ?? 'Un prospecto'
  emitEvent('email.send', {
    email: {
      to: settings.leadNotifyEmail || site.email,
      ...teamNotice({
        title: `Está leyendo el informe: ${company}`,
        url: `${publicUrl()}/admin/prospeccion?tab=llamadas`,
        lines: [
          ['Empresa', company],
          ['Aperturas', opens],
          ['Hallazgo', prospect.hook],
          ['Sugerencia', 'Es un buen momento para llamar.'],
        ],
      }),
    },
  })
}

/** A diagnostic started from a report link joins the same prospect, contact and opportunity. */
export async function linkDiagnostic(a: { token: string; diagnosticId: number; contactId: number; leadId: number }) {
  const payload = await cms()
  const { docs } = await payload.find({
    collection: 'prospects',
    where: { reportToken: { equals: a.token } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  })
  const prospect = docs[0]
  if (!prospect) return
  await payload.update({
    collection: 'prospects',
    id: prospect.id,
    overrideAccess: true,
    data: {
      diagnostic: a.diagnosticId,
      lead: idOf(prospect.lead) ?? a.leadId,
      status: 'interesado',
      nextAttemptAt: null,
    },
  })
  await payload.update({
    collection: 'contacts',
    id: a.contactId,
    overrideAccess: true,
    context: { skipN8n: true },
    data: { placeId: prospect.placeId },
  })
}
