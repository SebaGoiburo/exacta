import { NextResponse } from 'next/server'
import { readSignedBody } from '@/lib/n8n'
import { handleAgentResult, handleInbound, handleSendFailure } from '@/lib/whatsapp/service'

const clean = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '')

const KINDS = ['texto', 'audio', 'archivo', 'otro'] as const
type Kind = (typeof KINDS)[number]
/** A 3-minute voice note is well under 1 MB; anything far bigger isn't one. */
const MAX_AUDIO_BYTES = 8 * 1024 * 1024

/** The voice note n8n downloaded from Meta, as base64. Null when it's missing or too big. */
function readAudio(value: unknown) {
  const audio = value as { data?: unknown; mimeType?: unknown } | null
  if (!audio || typeof audio.data !== 'string' || typeof audio.mimeType !== 'string') return null
  const data = Buffer.from(audio.data, 'base64')
  return data.length && data.length <= MAX_AUDIO_BYTES ? { data, mimeType: audio.mimeType.slice(0, 100) } : null
}

/** Only n8n calls this: every request has to carry the signature made with the shared secret. */
export async function POST(req: Request) {
  const body = await readSignedBody(req)
  if (!body) return NextResponse.json({ error: 'invalid_signature' }, { status: 401 })

  try {
    if (body.step === 'inbound') {
      const waId = clean(body.waId, 30)
      const waMessageId = clean(body.waMessageId, 200)
      const text = clean(body.text, 4000)
      const kind = KINDS.includes(body.kind as Kind) ? (body.kind as Kind) : 'texto'
      if (!waId || !waMessageId || (kind === 'texto' && !text)) {
        return NextResponse.json({ error: 'missing_fields' }, { status: 422 })
      }

      return NextResponse.json(
        await handleInbound({
          waId,
          waMessageId,
          text,
          kind,
          audio: kind === 'audio' ? readAudio(body.audio) : null,
          metaType: clean(body.metaType, 40) || undefined,
          metaDetail: clean(body.metaDetail, 500) || undefined,
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
