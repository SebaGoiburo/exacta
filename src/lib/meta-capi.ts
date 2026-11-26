import { createHash } from 'node:crypto'

/*
 * Meta's Conversions API: the same event the browser's pixel sends, sent from the server too, so Meta counts it
 * even when the browser blocks the pixel. Both carry the same event ID and Meta keeps only one.
 * Only for people who accepted cookies: without consent, neither the pixel nor this sends anything.
 */

const GRAPH = 'https://graph.facebook.com/v24.0'

const hash = (value: string) => createHash('sha256').update(value.trim().toLowerCase()).digest('hex')

export type ServerEvent = {
  name: 'Purchase' | 'Lead'
  eventId: string
  url: string
  email?: string
  phone?: string
  firstName?: string
  value?: number
  currency?: string
  client?: { ip?: string; userAgent?: string; fbp?: string; fbc?: string }
}

export const capiConfigured = () => Boolean(process.env.META_CAPI_TOKEN)

/** Never throws: a lost conversion report must not break a sale. */
export async function sendServerEvent(pixelId: string | null | undefined, event: ServerEvent) {
  const token = process.env.META_CAPI_TOKEN
  if (!token || !pixelId) return
  const user_data: Record<string, unknown> = { country: [hash('ar')] }
  if (event.email) user_data.em = [hash(event.email)]
  if (event.phone) user_data.ph = [hash(event.phone.replace(/\D/g, ''))]
  if (event.firstName) user_data.fn = [hash(event.firstName)]
  if (event.client?.ip) user_data.client_ip_address = event.client.ip
  if (event.client?.userAgent) user_data.client_user_agent = event.client.userAgent
  if (event.client?.fbp) user_data.fbp = event.client.fbp
  if (event.client?.fbc) user_data.fbc = event.client.fbc

  try {
    const res = await fetch(`${GRAPH}/${pixelId}/events?access_token=${encodeURIComponent(token)}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        data: [
          {
            event_name: event.name,
            event_time: Math.floor(Date.now() / 1000),
            event_id: event.eventId,
            action_source: 'website',
            event_source_url: event.url,
            user_data,
            ...(event.value !== undefined ? { custom_data: { value: event.value, currency: event.currency ?? 'ARS' } } : {}),
          },
        ],
      }),
      signal: AbortSignal.timeout(10000),
    })
    if (!res.ok) console.error(`[meta] ${event.name} not accepted: ${res.status} ${(await res.text()).slice(0, 300)}`)
  } catch (err) {
    console.error(`[meta] ${event.name} not sent`, err)
  }
}
