import { NextResponse } from 'next/server'
import { readSignedBody } from '@/lib/n8n'
import { handleAgentResult, handleInbound, handleSendFailure } from '@/lib/whatsapp/service'

const clean = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '')

/** Only n8n calls this: every request has to carry the signature made with the shared secret. */
export async function POST(req: Request) {
  const body = await readSignedBody(req)
  if (!body) return NextResponse.json({ error: 'invalid_signature' }, { status: 401 })

  try {
    if (body.step === 'inbound') {
      const waId = clean(body.waId, 30)
      const waMessageId = clean(body.waMessageId, 200)
      const text = clean(body.text, 4000)
      if (!waId || !waMessageId || !text) return NextResponse.json({ error: 'missing_fields' }, { status: 422 })

      return NextResponse.json(
        await handleInbound({
          waId,
          waMessageId,
          text,
          phoneNumberId: clean(body.phoneNumberId, 40),
          profileName: clean(body.profileName, 120) || undefined,
        }),
      )
    }

    if (body.step === 'result') {
      return NextResponse.json(await handleAgentResult(Number(body.conversationId), body.response))
    }

    if (body.step === 'failed') {
      await handleSendFailure(Number(body.messageId))
      return NextResponse.json({ ok: true })
    }

    return NextResponse.json({ error: 'unknown_step' }, { status: 400 })
  } catch (err) {
    console.error('[whatsapp] agent step failed', err)
    return NextResponse.json({ error: 'failed' }, { status: 500 })
  }
}
