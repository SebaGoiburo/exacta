import { headers } from 'next/headers'
import { NextResponse } from 'next/server'
import { requestN8n } from '@/lib/n8n'
import { cms, saveReply, textMessage } from '@/lib/whatsapp/service'

const WINDOW_MS = 24 * 60 * 60 * 1000
const MAX_TEXT = 4000

/** What an advisor does from the Conversaciones screen. */
export async function POST(req: Request) {
  const payload = await cms()
  const { user } = await payload.auth({ headers: await headers() })
  if (user?.collection !== 'users') return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }

  const id = Number(body.id)
  const conversation = await payload
    .findByID({ collection: 'conversations', id, depth: 0, overrideAccess: true })
    .catch(() => null)
  if (!conversation) return NextResponse.json({ error: 'not_found' }, { status: 404 })

  const update = (data: Record<string, unknown>) =>
    payload.update({ collection: 'conversations', id, overrideAccess: true, data })

  if (body.action === 'read') {
    await update({ unread: 0 })
    return NextResponse.json({ ok: true })
  }

  if (body.action === 'take') {
    await update({ status: 'humano', assignedTo: user.id, unread: 0 })
    return NextResponse.json({ ok: true })
  }

  // Back to the agent, starting clean. It keeps the data it already has about the person.
  if (body.action === 'finish') {
    await update({ status: 'agente', assignedTo: null, unread: 0, aiReplies: 0, sessionStart: new Date().toISOString() })
    return NextResponse.json({ ok: true })
  }

  if (body.action === 'reply') {
    const text = typeof body.text === 'string' ? body.text.trim().slice(0, MAX_TEXT) : ''
    if (!text) return NextResponse.json({ error: 'empty' }, { status: 422 })

    // Outside this window Meta only accepts approved templates.
    const last = conversation.lastInboundAt ? new Date(conversation.lastInboundAt).getTime() : 0
    if (Date.now() - last > WINDOW_MS) return NextResponse.json({ error: 'window_closed' }, { status: 409 })

    const url = process.env.N8N_WHATSAPP_SEND_URL
    if (!url) return NextResponse.json({ error: 'not_configured' }, { status: 503 })

    let result: { messageId?: string; error?: string }
    try {
      result = await requestN8n<{ messageId?: string; error?: string }>(
        url,
        'whatsapp.send',
        textMessage(conversation.waId, conversation.phoneNumberId, text),
      )
    } catch (err) {
      console.error('[whatsapp] send failed', err)
      return NextResponse.json({ error: 'send_failed' }, { status: 502 })
    }
    if (!result.messageId) return NextResponse.json({ error: 'send_failed', detail: result.error }, { status: 502 })

    // Answering means taking the conversation, so the agent can't talk over the advisor.
    await saveReply(payload, conversation, text, 'asesor', { status: 'humano', assignedTo: user.id, unread: 0 })
    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ error: 'unknown_action' }, { status: 400 })
}
