import { createHmac, timingSafeEqual } from 'node:crypto'

/*
 * Site and n8n talk to each other signing every request with HMAC-SHA256 over the raw body
 * (header `x-exacta-signature: sha256=<hex>`), so each side rejects anything the other didn't send.
 * Webhook URLs and the secret live only on the server, never in the browser.
 */

const SIGNATURE_HEADER = 'x-exacta-signature'

function sign(body: string) {
  const secret = process.env.N8N_WEBHOOK_SECRET
  if (!secret) throw new Error('N8N_WEBHOOK_SECRET is not set')
  return `sha256=${createHmac('sha256', secret).update(body).digest('hex')}`
}

function post(webhookUrl: string, event: string, payload: unknown, timeoutMs: number) {
  const body = JSON.stringify({ event, sentAt: new Date().toISOString(), data: payload })
  return fetch(webhookUrl, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-exacta-event': event,
      [SIGNATURE_HEADER]: sign(body),
    },
    body,
    signal: AbortSignal.timeout(timeoutMs),
  })
}

export async function sendToN8n(webhookUrl: string, event: string, payload: unknown) {
  const res = await post(webhookUrl, event, payload, 8000)
  if (!res.ok) throw new Error(`n8n responded ${res.status}`)
}

/** For calls that need n8n's answer, like sending a WhatsApp message and getting its ID. */
export async function requestN8n<T>(webhookUrl: string, event: string, payload: unknown): Promise<T> {
  const res = await post(webhookUrl, event, payload, 20000)
  if (!res.ok) throw new Error(`n8n responded ${res.status}`)
  return (await res.json()) as T
}

/** Returns the JSON body only if n8n signed it. Null means the request has to be rejected. */
export async function readSignedBody(req: Request): Promise<Record<string, unknown> | null> {
  const raw = await req.text()
  const received = Buffer.from(req.headers.get(SIGNATURE_HEADER) ?? '')
  const expected = Buffer.from(sign(raw))
  if (received.length !== expected.length || !timingSafeEqual(received, expected)) return null
  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}
