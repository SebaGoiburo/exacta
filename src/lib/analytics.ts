import { ATTRIBUTION_KEYS, type Attribution } from './attribution-shared'

/*
 * Browser side of measurement. Nothing here loads or sends anything to third parties
 * until the person accepts cookies. Storage can fail (private windows), so every access is guarded.
 */

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void
    gtag?: (...args: unknown[]) => void
    dataLayer?: unknown[]
    _fbq?: unknown
  }
}

export type Consent = 'granted' | 'denied'
export type TrackingIds = {
  metaPixelId?: string | null
  ga4Id?: string | null
  googleAdsId?: string | null
  googleAdsLeadLabel?: string | null
}

const CONSENT_KEY = 'exacta-consent'
const ATTRIBUTION_KEY = 'exacta-attribution'
export const CONSENT_OPEN_EVENT = 'exacta:consent-open'

function read(storage: () => Storage, key: string) {
  try {
    return storage().getItem(key)
  } catch {
    return null
  }
}

function write(storage: () => Storage, key: string, value: string) {
  try {
    storage().setItem(key, value)
  } catch {
    // The site works the same without storage.
  }
}

export function readConsent(): Consent | null {
  const value = read(() => localStorage, CONSENT_KEY)
  return value === 'granted' || value === 'denied' ? value : null
}

export const saveConsent = (value: Consent) => write(() => localStorage, CONSENT_KEY, value)

/** Keeps the first campaign of the visit, so a later internal click doesn't overwrite it. */
export function captureAttribution() {
  if (read(() => sessionStorage, ATTRIBUTION_KEY)) return
  const params = new URLSearchParams(window.location.search)
  const data: Record<string, string> = { landing: window.location.pathname }
  if (document.referrer) data.referrer = document.referrer
  for (const key of ATTRIBUTION_KEYS) {
    const value = params.get(key)
    if (value) data[key] = value
  }
  write(() => sessionStorage, ATTRIBUTION_KEY, JSON.stringify(data))
}

const cookie = (name: string) => document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`))?.[1]

export function getAttribution(): Attribution {
  let stored: Attribution = {}
  try {
    stored = JSON.parse(read(() => sessionStorage, ATTRIBUTION_KEY) ?? '{}')
  } catch {
    // Ignore a damaged value.
  }
  const consent = readConsent() === 'granted'
  return {
    ...stored,
    consent,
    ...(consent ? { fbp: cookie('_fbp'), fbc: cookie('_fbc') } : {}),
  }
}

function addScript(src: string) {
  const script = document.createElement('script')
  script.async = true
  script.src = src
  document.head.appendChild(script)
}

let ids: TrackingIds = {}
let loaded = false

/** Injects the tags. Only called after consent, and only once per page load. */
export function loadTracking(next: TrackingIds) {
  ids = next
  if (loaded) return
  loaded = true

  const googleId = next.ga4Id || next.googleAdsId
  if (googleId) {
    window.dataLayer = window.dataLayer || []
    window.gtag = function gtag() {
      // gtag.js only accepts the original `arguments` object.
      // eslint-disable-next-line prefer-rest-params
      window.dataLayer?.push(arguments)
    }
    window.gtag('js', new Date())
    if (next.ga4Id) window.gtag('config', next.ga4Id)
    if (next.googleAdsId) window.gtag('config', next.googleAdsId)
    addScript(`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(googleId)}`)
  }

  if (next.metaPixelId) {
    const queue: unknown[][] = []
    const fbq = (...args: unknown[]) => void queue.push(args)
    Object.assign(fbq, { queue, version: '2.0', loaded: true, push: fbq })
    window.fbq = fbq
    window._fbq = fbq
    addScript('https://connect.facebook.net/en_US/fbevents.js')
    window.fbq('init', next.metaPixelId)
    window.fbq('track', 'PageView')
  }
}

/** Reports a navigation inside the site. The first page view is sent when the tags load. */
export function trackPageView(path: string) {
  if (!loaded) return
  window.fbq?.('track', 'PageView')
  window.gtag?.('event', 'page_view', { page_path: path })
}

type TrackEvent = 'diagnostic_start' | 'lead' | 'contact_click'

/** `eventId` lets Meta merge this browser event with the same one sent from the server. */
export function track(event: TrackEvent, params: Record<string, string> = {}, eventId?: string) {
  if (!loaded) return
  const options = eventId ? { eventID: eventId } : undefined

  if (event === 'lead') {
    window.fbq?.('track', 'Lead', params, options)
    window.gtag?.('event', 'generate_lead', params)
    if (ids.googleAdsId && ids.googleAdsLeadLabel) {
      window.gtag?.('event', 'conversion', {
        send_to: `${ids.googleAdsId}/${ids.googleAdsLeadLabel}`,
        transaction_id: eventId,
      })
    }
  } else if (event === 'contact_click') {
    window.fbq?.('track', 'Contact', params)
    window.gtag?.('event', 'contact', params)
  } else {
    window.fbq?.('trackCustom', 'DiagnosticStart', params)
    window.gtag?.('event', 'diagnostic_start', params)
  }
}
