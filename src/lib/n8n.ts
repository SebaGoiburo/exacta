import { createHmac } from 'node:crypto'

/**
 * Sends an event to an n8n webhook. Every request is signed with HMAC-SHA256 over the raw body
 * (header `x-exacta-signature: sha256=<hex>`), so n8n can reject anything that didn't come from the site.
 * Webhook URLs and the secret live only on the server, never in the browser.
 */
export async function sendToN8n(webhookUrl: string, event: string, payload: unknown) {
  const secret = process.env.N8N_WEBHOOK_SECRET
  if (!secret) throw new Error('N8N_WEBHOOK_SECRET is not set')

  const body = JSON.stringify({ event, sentAt: new Date().toISOString(), data: payload })
  const signature = createHmac('sha256', secret).update(body).digest('hex')

  const res = await fetch(webhookUrl, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-exacta-event': event,
      'x-exacta-signature': `sha256=${signature}`,
    },
    body,
    signal: AbortSignal.timeout(8000),
  })
  if (!res.ok) throw new Error(`n8n responded ${res.status}`)
}
