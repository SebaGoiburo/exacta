import { after, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'
import { appConfig, handleWebhook, validSignature, webhookVerifyToken } from '@/lib/instagram/service'

/** Meta's check when the webhook is set up: it sends the token shown in the panel and expects the challenge back. */
export async function GET(req: Request) {
  const params = new URL(req.url).searchParams
  if (params.get('hub.mode') === 'subscribe' && params.get('hub.verify_token') === webhookVerifyToken()) {
    return new Response(params.get('hub.challenge') ?? '', { status: 200 })
  }
  return new Response('forbidden', { status: 403 })
}

/** Comments and direct messages. Meta gets its 200 at once; the replies go out right after. */
export async function POST(req: Request) {
  const raw = await req.text()
  const payload = await getPayload({ config })
  const { appSecret } = await appConfig(payload)
  if (!validSignature(raw, req.headers.get('x-hub-signature-256'), [appSecret])) {
    console.warn('[instagram] webhook with an invalid signature')
    return NextResponse.json({ error: 'invalid_signature' }, { status: 401 })
  }
  let body: unknown
  try {
    body = JSON.parse(raw)
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }
  after(() =>
    handleWebhook(body as Parameters<typeof handleWebhook>[0]).catch((err) => console.error('[instagram] webhook failed', err)),
  )
  return NextResponse.json({ ok: true })
}
