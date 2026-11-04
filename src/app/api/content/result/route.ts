import { NextResponse } from 'next/server'
import type { ModelResponse } from '@/lib/content-engine/prompts'
import { handleResult } from '@/lib/content-engine/service'
import { readSignedBody } from '@/lib/n8n'

/** Only n8n calls this, with the model's answer for a run. */
export async function POST(req: Request) {
  const body = await readSignedBody(req)
  if (!body) return NextResponse.json({ error: 'invalid_signature' }, { status: 401 })

  try {
    await handleResult(Number(body.jobId), body.response as ModelResponse)
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[content] result failed', err)
    return NextResponse.json({ error: 'failed' }, { status: 500 })
  }
}
