import {
  AUTO_SIGNALS,
  DIMENSIONS,
  isAutoSignal,
  type Dimension,
  type DimensionScore,
  type Evidence,
  type Knockout,
  type ProfileSignal,
  type Scores,
  type Weights,
} from './model'

/*
 * The general formula, kept free of I/O so it can be tested. Every number is compared against the
 * same search (niche + zone): 80 reviews is a lot for a dentist and little for a pizzeria.
 */

/** What we read from the company's own website. Null fields mean we couldn't tell. */
export type SiteFacts = {
  reachable: boolean
  https: boolean
  viewport: boolean
  copyrightYear: number | null
  whatsapp: boolean
  tel: boolean
  email: boolean
  form: boolean
  booking: boolean
  ecommerce: boolean
  metaPixel: boolean
  googleTag: boolean
  instagram: boolean
  facebook: boolean
  newsletter: boolean
  chat: boolean
}

export type Candidate = {
  placeId: string
  /** Position in Google Maps for "niche + zone", 1 is first. */
  rank: number
  /** Results in the same search that share its website: branches of one business. */
  branches: number
  operational: boolean
  rating: number | null
  reviews: number | null
  priceLevel: string | null
  hasPhone: boolean
  website: 'none' | 'social' | 'own'
  /** Null when there is no own website to read. */
  site: SiteFacts | null
  /** PageSpeed mobile performance, 0 to 100. Null when it couldn't be measured. */
  pageSpeed: number | null
}

/** The search as a whole, so each company can be compared with the rest of its niche. */
export type BatchContext = {
  reviews: number[]
  /** The first three in Google Maps. */
  leaders: { rating: number | null; reviews: number | null; pageSpeed: number | null; website: Candidate['website'] }[]
  count: number
}

/** What the AI added in the second pass, already checked against its sources. */
export type AiFindings = {
  signals: Record<string, boolean | null>
  timing: { value: number; evidence: Evidence; why: string[] } | null
  decisionMaker: boolean
  /** Contact channels the AI found that the site didn't show (email, Instagram, LinkedIn). */
  extraChannels: string[]
  chainElsewhere: boolean
}

export type ScoreResult = {
  scores: Scores
  /** Weighted total, after the missing-data penalty. */
  score: number
  tier: 'A' | 'B' | 'C'
  knockouts: Knockout[]
  missing: number
}

export type ProfileForScoring = { weights: Weights; signals: ProfileSignal[]; minCapacity: number }

const clamp = (n: number, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, n))
const round = (n: number) => Math.round(n)
const avg = (ns: number[]) => ns.reduce((a, b) => a + b, 0) / ns.length
const known = <T>(xs: (T | null | undefined)[]) => xs.filter((x): x is T => x !== null && x !== undefined)

const NEUTRAL: DimensionScore = { value: 50, evidence: 'sin_dato', why: ['Sin datos: cuenta como 50'] }

/** Share of the niche below this value, 0 to 100. Ties count half. */
export function percentile(value: number, all: number[]) {
  if (!all.length) return 50
  const below = all.filter((v) => v < value).length
  const equal = all.filter((v) => v === value).length
  return round(((below + equal / 2) / all.length) * 100)
}

const PRICE: Record<string, number> = {
  PRICE_LEVEL_INEXPENSIVE: 25,
  PRICE_LEVEL_MODERATE: 50,
  PRICE_LEVEL_EXPENSIVE: 75,
  PRICE_LEVEL_VERY_EXPENSIVE: 100,
}

const OLD_SITE_YEARS = 3

/**
 * True when the company shows the problem, false when it doesn't, null when we can't tell,
 * and 'na' when the question doesn't apply (site speed for a company with no site).
 */
export function autoSignal(key: string, c: Candidate, ctx: BatchContext, now = new Date()): boolean | null | 'na' {
  const ownSite = c.website === 'own'
  // An own site that refused our request: we can't tell, which is not the same as "it has none".
  const unread = ownSite && !c.site
  const site = ownSite && c.site?.reachable ? c.site : null
  const readable = site !== null
  /** For questions about the site itself: unknown if unread, not applicable if there's no working site. */
  const onSite = (answer: (s: SiteFacts) => boolean | null) => (unread ? null : site ? answer(site) : 'na')
  switch (key) {
    case 'no_website':
      return c.website !== 'own'
    case 'site_down':
      return ownSite ? (c.site ? !c.site.reachable : null) : 'na'
    case 'slow_mobile':
      return onSite(() => (c.pageSpeed === null ? null : c.pageSpeed < 50))
    case 'not_mobile':
      return onSite((s) => !s.viewport)
    case 'no_https':
      return onSite((s) => !s.https)
    case 'old_site':
      return onSite((s) => (s.copyrightYear === null ? null : now.getFullYear() - s.copyrightYear >= OLD_SITE_YEARS))
    case 'no_contact_cta':
      return onSite((s) => !s.whatsapp && !s.form && !s.tel)
    case 'no_booking':
      return readable ? !site.booking : ownSite ? null : true
    case 'no_cart':
      return readable ? !site.ecommerce : ownSite ? null : true
    case 'no_tracking':
      return readable ? !site.metaPixel && !site.googleTag : ownSite ? null : true
    case 'no_lead_capture':
      return readable ? !site.form && !site.newsletter : ownSite ? null : true
    case 'no_chat':
      return readable ? !site.chat && !site.whatsapp : ownSite ? null : true
    case 'low_visibility': {
      if (c.rating === null) return null
      return c.rank > Math.min(5, Math.max(3, Math.floor(ctx.count / 4))) && c.rating >= 4.3
    }
    case 'multi_branch':
      return c.branches >= 2
    default:
      return null
  }
}

function capacity(c: Candidate, ctx: BatchContext): DimensionScore {
  const parts: number[] = []
  const why: string[] = []
  if (c.reviews !== null) {
    const p = percentile(c.reviews, ctx.reviews)
    parts.push(p)
    why.push(`Cantidad de reseñas: por encima del ${p}% del rubro en la zona`)
  }
  if (c.priceLevel && PRICE[c.priceLevel] !== undefined) {
    parts.push(PRICE[c.priceLevel])
    why.push(`Nivel de precios en Google: ${PRICE[c.priceLevel]}/100`)
  }
  const branches = c.branches >= 3 ? 90 : c.branches === 2 ? 65 : 35
  parts.push(branches)
  why.push(c.branches > 1 ? `${c.branches} sucursales en la búsqueda` : 'Una sola sede en la búsqueda')
  const site = c.site
  let invest = c.website === 'none' ? 20 : c.website === 'social' ? 35 : 55
  if (c.website === 'own' && site?.reachable) {
    if (site.metaPixel || site.googleTag) invest += 20
    if (site.ecommerce || site.booking) invest += 10
  }
  parts.push(clamp(invest))
  why.push(`Inversión digital visible: ${clamp(invest)}/100`)
  // Branches and the website are always known, so evidence depends on the market signals.
  const market = (c.reviews !== null ? 1 : 0) + (c.priceLevel ? 1 : 0)
  return { value: round(avg(parts)), evidence: market === 2 ? 'alta' : market === 1 ? 'media' : 'sin_dato', why }
}

/** Answers for the profile's automatic signals. Stored, so the AI pass can rescore without Google data. */
export function autoSignalValues(c: Candidate, ctx: BatchContext, signals: ProfileSignal[]) {
  return Object.fromEntries(signals.filter((s) => isAutoSignal(s.key)).map((s) => [s.key, autoSignal(s.key, c, ctx)])) as Record<
    string,
    boolean | null | 'na'
  >
}

export function needScore(auto: Record<string, boolean | null | 'na'>, signals: ProfileSignal[], ai: AiFindings | null) {
  let total = 0
  let points = 0
  let unknown = 0
  const why: string[] = []
  for (const signal of signals) {
    const value = isAutoSignal(signal.key) ? (auto[signal.key] ?? null) : (ai?.signals[signal.key] ?? null)
    if (value === 'na') continue
    total += signal.weight
    if (value === true) {
      points += signal.weight
      why.push(`Sí: ${signal.label}`)
    } else if (value === null) {
      points += signal.weight / 2
      unknown += signal.weight
    } else {
      why.push(`No: ${signal.label}`)
    }
  }
  if (!total) return { score: NEUTRAL, unknownShare: 1 }
  const unknownShare = unknown / total
  const evidence: Evidence = unknownShare >= 0.6 ? 'sin_dato' : unknownShare > 0.25 ? 'media' : 'alta'
  return { score: { value: round((points / total) * 100), evidence, why } as DimensionScore, unknownShare }
}

function gap(c: Candidate, ctx: BatchContext): DimensionScore {
  const parts: number[] = []
  const why: string[] = []
  const span = Math.max(ctx.count - 1, 1)
  parts.push(clamp(((c.rank - 1) / span) * 100))
  why.push(`Puesto ${c.rank} de ${ctx.count} en Google Maps`)

  const leaders = ctx.leaders
  const leaderRating = known(leaders.map((l) => l.rating))
  if (c.rating !== null && leaderRating.length) {
    const diff = avg(leaderRating) - c.rating
    parts.push(clamp(diff * 100))
    why.push(`Calificación ${c.rating} frente a ${avg(leaderRating).toFixed(1)} de los tres primeros`)
  }
  const leaderReviews = known(leaders.map((l) => l.reviews))
  if (c.reviews !== null && leaderReviews.length && avg(leaderReviews) > 0) {
    parts.push(clamp(100 - (c.reviews / avg(leaderReviews)) * 100))
    why.push(`${c.reviews} reseñas frente a ${round(avg(leaderReviews))} de los tres primeros`)
  }
  const leaderSpeed = known(leaders.map((l) => l.pageSpeed))
  if (leaderSpeed.length) {
    const mine = c.website === 'own' ? c.pageSpeed : 0
    if (mine !== null) {
      parts.push(clamp(((avg(leaderSpeed) - mine) / 40) * 100))
      why.push(c.website === 'own' ? `Velocidad móvil ${mine} frente a ${round(avg(leaderSpeed))}` : 'Los primeros tienen web propia y él no')
    }
  }
  return { value: round(avg(parts)), evidence: parts.length >= 3 ? 'alta' : parts.length === 2 ? 'media' : 'sin_dato', why }
}

function demand(c: Candidate, ctx: BatchContext): DimensionScore {
  if (c.reviews === null) return NEUTRAL
  const p = percentile(c.reviews, ctx.reviews)
  return { value: p, evidence: 'media', why: [`Movimiento de clientes según reseñas: por encima del ${p}% del rubro`] }
}

export function accessScore(hasPhone: boolean, siteFacts: SiteFacts | null, ai: AiFindings | null): DimensionScore {
  const site = siteFacts?.reachable ? siteFacts : null
  const channels: [string, number, boolean][] = [
    ['Teléfono en Google', 35, hasPhone],
    ['WhatsApp en su web', 20, Boolean(site?.whatsapp)],
    ['Email en su web', 15, Boolean(site?.email)],
    ['Instagram', 15, Boolean(site?.instagram) || Boolean(ai?.extraChannels.includes('instagram'))],
    ['Formulario de contacto', 10, Boolean(site?.form)],
    ['Facebook', 5, Boolean(site?.facebook)],
    ['Email encontrado por la IA', 10, Boolean(ai?.extraChannels.includes('email')) && !site?.email],
    ['Nombre de quien decide', 25, Boolean(ai?.decisionMaker)],
  ]
  const found = channels.filter(([, , ok]) => ok)
  return {
    value: clamp(found.reduce((sum, [, pts]) => sum + pts, 0)),
    evidence: site || ai ? 'alta' : 'media',
    why: found.length ? found.map(([label]) => label) : ['Sin canales de contacto a la vista'],
  }
}

export function timingScore(siteDown: boolean, ai: AiFindings | null): DimensionScore {
  if (ai?.timing) return { value: clamp(round(ai.timing.value)), evidence: ai.timing.evidence, why: ai.timing.why }
  if (siteDown) return { value: 85, evidence: 'alta', why: ['Su sitio web no carga ahora mismo'] }
  return NEUTRAL
}

export function tierOf(score: number): 'A' | 'B' | 'C' {
  return score >= 70 ? 'A' : score >= 50 ? 'B' : 'C'
}

/** Points taken off when two or more criteria have no data, so guesses don't outrank facts. */
export const MISSING_PENALTY = 10

/** What a company is excluded for, given its scores. Database checks (client, blocked) are added by the batch. */
export type Flags = { operational: boolean; noContact: boolean; needUnknownShare: number }

/** The weighted total, its group and the knockouts that apply. */
export function combine(scores: Scores, profile: ProfileForScoring, flags: Flags, ai: AiFindings | null): ScoreResult {
  const weightSum = DIMENSIONS.reduce((sum, d) => sum + (profile.weights[d] ?? 0), 0) || 1
  const raw = DIMENSIONS.reduce((sum, d) => sum + scores[d].value * (profile.weights[d] ?? 0), 0) / weightSum
  const missing = DIMENSIONS.filter((d: Dimension) => scores[d].evidence === 'sin_dato').length
  const score = clamp(round(raw - (missing >= 2 ? MISSING_PENALTY : 0)))

  const knockouts: Knockout[] = []
  if (!flags.operational) knockouts.push('cerrado')
  if (flags.noContact) knockouts.push('sin_contacto')
  if (scores.capacity.evidence !== 'sin_dato' && scores.capacity.value < profile.minCapacity) knockouts.push('capacidad_baja')
  if (flags.needUnknownShare < 0.5 && scores.need.value < 30) knockouts.push('sin_necesidad')
  if (ai?.chainElsewhere) knockouts.push('cadena')

  return { scores, score, tier: tierOf(score), knockouts, missing }
}

export function scoreCandidate(c: Candidate, ctx: BatchContext, profile: ProfileForScoring, ai: AiFindings | null = null) {
  const auto = autoSignalValues(c, ctx, profile.signals)
  const needResult = needScore(auto, profile.signals, ai)
  const scores: Scores = {
    capacity: capacity(c, ctx),
    need: needResult.score,
    gap: gap(c, ctx),
    demand: demand(c, ctx),
    access: accessScore(c.hasPhone, c.site, ai),
    timing: timingScore(c.website === 'own' && Boolean(c.site) && !c.site?.reachable, ai),
  }
  const flags: Flags = {
    operational: c.operational,
    noContact: !c.hasPhone && c.website === 'none',
    needUnknownShare: needResult.unknownShare,
  }
  return { ...combine(scores, profile, flags, ai), auto, flags }
}

/** Second pass: capacity, gap and demand stay as measured; need, access and timing take the AI's findings. */
export function rescoreWithAi(
  stored: { scores: Scores; auto: Record<string, boolean | null | 'na'>; flags: Flags; hasPhone: boolean; site: SiteFacts | null; siteDown: boolean },
  profile: ProfileForScoring,
  ai: AiFindings,
) {
  const needResult = needScore(stored.auto, profile.signals, ai)
  const scores: Scores = {
    ...stored.scores,
    need: needResult.score,
    access: accessScore(stored.hasPhone, stored.site, ai),
    timing: timingScore(stored.siteDown, ai),
  }
  return combine(scores, profile, { ...stored.flags, needUnknownShare: needResult.unknownShare }, ai)
}

export const signalLabel = (key: string, signals: ProfileSignal[]) =>
  signals.find((s) => s.key === key)?.label ?? AUTO_SIGNALS[key as keyof typeof AUTO_SIGNALS] ?? key
