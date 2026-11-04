import { createSign } from 'node:crypto'

/*
 * Reads Search Console and Analytics with a read-only service account. If they aren't connected,
 * or Google fails, the engine keeps working on web research and says so: it never makes numbers up.
 */

const SCOPES = 'https://www.googleapis.com/auth/webmasters.readonly https://www.googleapis.com/auth/analytics.readonly'
const DAY_MS = 24 * 60 * 60 * 1000
const WINDOW_DAYS = 28
/** Search Console's latest days are still incomplete. */
const LAG_DAYS = 3

type Account = { client_email: string; private_key: string }
let cached: { token: string; expires: number } | null = null

function account(): Account | null {
  const encoded = process.env.GOOGLE_SERVICE_ACCOUNT_B64
  if (!encoded) return null
  try {
    const parsed = JSON.parse(Buffer.from(encoded, 'base64').toString('utf8'))
    return parsed.client_email && parsed.private_key ? parsed : null
  } catch {
    return null
  }
}

export const googleConnected = () => account() !== null

async function accessToken() {
  if (cached && cached.expires > Date.now() + 60_000) return cached.token
  const acc = account()
  if (!acc) throw new Error('no_account')
  const now = Math.floor(Date.now() / 1000)
  const b64 = (v: object) => Buffer.from(JSON.stringify(v)).toString('base64url')
  const unsigned = `${b64({ alg: 'RS256', typ: 'JWT' })}.${b64({
    iss: acc.client_email,
    scope: SCOPES,
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  })}`
  const signature = createSign('RSA-SHA256').update(unsigned).sign(acc.private_key, 'base64url')
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: `${unsigned}.${signature}`,
    }),
    signal: AbortSignal.timeout(15000),
  })
  if (!res.ok) throw new Error(`token ${res.status}`)
  const json = (await res.json()) as { access_token: string; expires_in: number }
  cached = { token: json.access_token, expires: Date.now() + json.expires_in * 1000 }
  return cached.token
}

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${await accessToken()}` },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(25000),
  })
  if (!res.ok) throw new Error(`${new URL(url).hostname} ${res.status}`)
  return (await res.json()) as T
}

const day = (daysAgo: number) => new Date(Date.now() - daysAgo * DAY_MS).toISOString().slice(0, 10)

type GscRow = { keys: string[]; clicks: number; impressions: number; position: number }

export type QueryRow = { query: string; clicks: number; impressions: number; position: number; impressionsBefore: number }

const BRAND = 'exacta'

/** True when `word` is `target` with at most one typo: a missing, extra, changed or swapped letter. */
function oneTypoFrom(word: string, target: string) {
  if (word === target) return true
  if (Math.abs(word.length - target.length) > 1) return false
  let i = 0
  while (i < word.length && word[i] === target[i]) i++
  const swapped = word[i] === target[i + 1] && word[i + 1] === target[i] && word.slice(i + 2) === target.slice(i + 2)
  return (
    swapped ||
    word.slice(i + 1) === target.slice(i + 1) ||
    word.slice(i) === target.slice(i + 1) ||
    word.slice(i + 1) === target.slice(i)
  )
}

/** People looking for the company by name, misspelled or not, say nothing about demand for a topic. */
export function isBrandQuery(query: string) {
  const words = query
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .split(/[^a-z0-9]+/)
  return words.some((word) => oneTypoFrom(word, BRAND) || word.startsWith('exactatransformacion'))
}

/** Separates what the engine should look at: what already brings people, what's growing, what's within reach. */
export function summarizeQueries(current: GscRow[], previous: GscRow[]) {
  const before = new Map(previous.map((r) => [r.keys[0], r.impressions]))
  const brand = current.filter((r) => isBrandQuery(r.keys[0]))
  const rows: QueryRow[] = current.filter((r) => !isBrandQuery(r.keys[0])).map((r) => ({
    query: r.keys[0],
    clicks: r.clicks,
    impressions: r.impressions,
    position: Math.round(r.position * 10) / 10,
    impressionsBefore: before.get(r.keys[0]) ?? 0,
  }))
  const byImpressions = (a: QueryRow, b: QueryRow) => b.impressions - a.impressions
  return {
    brandExcluded: { queries: brand.length, impressions: brand.reduce((sum, r) => sum + r.impressions, 0) },
    top: [...rows].sort(byImpressions).slice(0, 40),
    rising: rows
      .filter((r) => r.impressions >= 10 && r.impressions >= r.impressionsBefore * 1.5)
      .sort((a, b) => b.impressions - b.impressionsBefore - (a.impressions - a.impressionsBefore))
      .slice(0, 20),
    // On page two or low on page one: a good article can win these.
    withinReach: rows
      .filter((r) => r.position >= 5 && r.position <= 20 && r.impressions >= 10)
      .sort(byImpressions)
      .slice(0, 20),
  }
}

export type SearchData = {
  searchConsole: { status: 'ok' | 'not_connected' | 'failed'; period?: string; data?: ReturnType<typeof summarizeQueries> }
  analytics: {
    status: 'ok' | 'not_connected' | 'failed'
    period?: string
    pages?: { page: string; sessions: number; keyEvents: number }[]
  }
}

async function searchConsole(site: string): Promise<SearchData['searchConsole']> {
  const url = `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(site)}/searchAnalytics/query`
  const query = (startDate: string, endDate: string) =>
    postJson<{ rows?: GscRow[] }>(url, { startDate, endDate, dimensions: ['query'], rowLimit: 500 })
  const start = LAG_DAYS + WINDOW_DAYS
  const [current, previous] = await Promise.all([
    query(day(start), day(LAG_DAYS)),
    query(day(start + WINDOW_DAYS), day(start + 1)),
  ])
  return {
    status: 'ok',
    period: `${day(start)} a ${day(LAG_DAYS)}`,
    data: summarizeQueries(current.rows ?? [], previous.rows ?? []),
  }
}

async function analytics(propertyId: string): Promise<SearchData['analytics']> {
  type Report = { rows?: { dimensionValues: { value: string }[]; metricValues: { value: string }[] }[] }
  const report = await postJson<Report>(`https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`, {
    dateRanges: [{ startDate: `${WINDOW_DAYS}daysAgo`, endDate: 'yesterday' }],
    dimensions: [{ name: 'landingPage' }],
    metrics: [{ name: 'sessions' }, { name: 'keyEvents' }],
    orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
    limit: 25,
  })
  return {
    status: 'ok',
    period: `últimos ${WINDOW_DAYS} días`,
    pages: (report.rows ?? []).map((r) => ({
      page: r.dimensionValues[0].value,
      sessions: Number(r.metricValues[0].value),
      keyEvents: Number(r.metricValues[1].value),
    })),
  }
}

export async function readSearchData(settings: { gscSiteUrl?: string | null; ga4PropertyId?: string | null }): Promise<SearchData> {
  const connected = googleConnected()
  const attempt = async <T extends { status: string }>(configured: string | null | undefined, run: (v: string) => Promise<T>) => {
    if (!connected || !configured) return { status: 'not_connected' } as T
    try {
      return await run(configured)
    } catch (err) {
      console.error('[content] Google data not available', err)
      return { status: 'failed' } as T
    }
  }
  const [gsc, ga] = await Promise.all([
    attempt(settings.gscSiteUrl, searchConsole),
    attempt(settings.ga4PropertyId, analytics),
  ])
  return { searchConsole: gsc, analytics: ga }
}
