import type { Candidate, SiteFacts } from './scoring'

/*
 * What can be seen from outside a company's website, without AI: one request for the home page
 * and, separately, Google's PageSpeed for mobile. Both fail quietly: missing data counts as unknown.
 */

const USER_AGENT = 'Mozilla/5.0 (compatible; ExactaSiteCheck/1.0)'
const MAX_HTML = 1_500_000
const SOCIAL_HOSTS = /(^|\.)(instagram\.com|facebook\.com|fb\.com|linktr\.ee|wa\.me|whatsapp\.com|tiktok\.com|twitter\.com|x\.com|youtube\.com|linkedin\.com|beacons\.ai|taplink\.cc)$/i

export function websiteKind(url: string | undefined | null): Candidate['website'] {
  if (!url) return 'none'
  try {
    return SOCIAL_HOSTS.test(new URL(url).hostname) ? 'social' : 'own'
  } catch {
    return 'none'
  }
}

/** The registrable part of a host, enough to tell branches of the same business apart. */
export function siteKey(url: string | undefined | null) {
  if (!url) return null
  try {
    return new URL(url).hostname.replace(/^www\./, '').toLowerCase()
  } catch {
    return null
  }
}

const has = (html: string, re: RegExp) => re.test(html)

/** Pure: reads the facts out of an HTML page. Exported for tests. */
export function readHtml(html: string, finalUrl: string): SiteFacts {
  const years = [...html.matchAll(/(?:©|&copy;|&#169;|copyright)\s*(?:\d{4}\s*[-–]\s*)?((?:19|20)\d{2})/gi)].map((m) => Number(m[1]))
  const thisYear = new Date().getFullYear()
  const valid = years.filter((y) => y <= thisYear)
  return {
    reachable: true,
    https: finalUrl.startsWith('https:'),
    viewport: has(html, /<meta[^>]+name=["']?viewport/i),
    copyrightYear: valid.length ? Math.max(...valid) : null,
    whatsapp: has(html, /wa\.me\/|api\.whatsapp\.com|whatsapp:\/\/|web\.whatsapp\.com\/send/i),
    tel: has(html, /href=["']?tel:/i),
    email: has(html, /href=["']?mailto:/i),
    form: has(html, /<form[\s>]/i) && has(html, /<textarea|type=["']?email|wpcf7|gform|elementor-form|wpforms/i),
    booking: has(
      html,
      /calendly\.com|doctoralia|turnito|agendapro|simplybook|setmore|booksy|fresha|reservo\.|tuturno|turnosweb|medicloud|meitre|woki\.|opentable|tablebooker|covermanager|reservar (un )?turno online|turnos online|agenda online|reserv[aá] online/i,
    ),
    ecommerce: has(
      html,
      /woocommerce|cdn\.shopify|myshopify|tiendanube|nuvemshop|mercadoshops|vtex|prestashop|magento|add[-_]to[-_]cart|agregar al carrito|añadir al carrito/i,
    ),
    metaPixel: has(html, /connect\.facebook\.net\/[^"']*fbevents|fbq\(/i),
    googleTag: has(html, /googletagmanager\.com|gtag\(|google-analytics\.com|GTM-[A-Z0-9]+/i),
    instagram: has(html, /instagram\.com\//i),
    facebook: has(html, /facebook\.com\/(?!tr\?|plugins|sharer)/i),
    newsletter: has(html, /newsletter|suscrib[ií]te|mailchimp|klaviyo|brevo|sendinblue|mailerlite/i),
    chat: has(html, /tawk\.to|tidio|crisp\.chat|intercom|zendesk|livechat|jivosite|manychat|botmaker|fb-customerchat|hs-scripts|leadsales|cliengo/i),
  }
}

const DOWN: SiteFacts = {
  reachable: false,
  https: false,
  viewport: false,
  copyrightYear: null,
  whatsapp: false,
  tel: false,
  email: false,
  form: false,
  booking: false,
  ecommerce: false,
  metaPixel: false,
  googleTag: false,
  instagram: false,
  facebook: false,
  newsletter: false,
  chat: false,
}

/**
 * The site's facts, DOWN if it doesn't load, or null if it refused us (a firewall is not a broken site).
 */
export async function auditSite(url: string): Promise<SiteFacts | null> {
  try {
    const res = await fetch(url, {
      headers: { 'user-agent': USER_AGENT, accept: 'text/html,application/xhtml+xml' },
      redirect: 'follow',
      signal: AbortSignal.timeout(10000),
      cache: 'no-store',
    })
    if ([401, 403, 429].includes(res.status)) return null
    if (!res.ok) return DOWN
    const type = res.headers.get('content-type') ?? ''
    if (type && !type.includes('html')) return null
    const html = (await res.text()).slice(0, MAX_HTML)
    return readHtml(html, res.url || url)
  } catch {
    return DOWN
  }
}

let skipKey = false

/** Google's mobile performance score, 0 to 100, or null if PageSpeed didn't answer. */
export async function pageSpeed(url: string): Promise<number | null> {
  const key = process.env.PAGESPEED_API_KEY || process.env.GOOGLE_MAPS_API_KEY
  const attempt = async (withKey: boolean) => {
    const params = new URLSearchParams({ url, strategy: 'mobile', category: 'performance' })
    if (withKey && key) params.set('key', key)
    const res = await fetch(`https://www.googleapis.com/pagespeedonline/v5/runPagespeed?${params}`, {
      signal: AbortSignal.timeout(70000),
      cache: 'no-store',
    })
    return res
  }
  try {
    let res = await attempt(!skipKey)
    // The Maps key may not have PageSpeed enabled: then it works, with a lower quota, without a key.
    if (!skipKey && key && (res.status === 400 || res.status === 403)) {
      skipKey = true
      res = await attempt(false)
    }
    if (!res.ok) return null
    const data = (await res.json()) as { lighthouseResult?: { categories?: { performance?: { score?: number | null } } } }
    const score = data.lighthouseResult?.categories?.performance?.score
    return typeof score === 'number' ? Math.round(score * 100) : null
  } catch {
    return null
  }
}

/** Runs tasks with a ceiling on how many are in flight. */
export async function pool<T, R>(items: T[], size: number, work: (item: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length)
  let next = 0
  const runners = Array.from({ length: Math.min(size, items.length) }, async () => {
    while (next < items.length) {
      const i = next++
      out[i] = await work(items[i])
    }
  })
  await Promise.all(runners)
  return out
}
