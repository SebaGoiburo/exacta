import { NextResponse } from 'next/server'
import type { ModelResponse } from '@/lib/content-engine/prompts'
import { handleResult } from '@/lib/content-engine/service'
import { readSignedBody } from '@/lib/n8n'
import { handleProspectResult } from '@/lib/prospecting/service'

const PROSPECT_JOB = /^prospect:(\d+)$/

/**
 * Only n8n calls this, with the model's answer for a run. The prospect generator shares the same
 * n8n flow; its runs are told apart by their id, `prospect:<id>`.
 */
export async function POST(req: Request) {
  const body = await readSignedBody(req)
  if (!body) return NextResponse.json({ error: 'invalid_signature' }, { status: 401 })

  try {
    const prospectJob = typeof body.jobId === 'string' ? PROSPECT_JOB.exec(body.jobId) : null
    if (prospectJob) await handleProspectResult(Number(prospectJob[1]), body.response as ModelResponse)
    else await handleResult(Number(body.jobId), body.response as ModelResponse)
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[content] result failed', err)
    return NextResponse.json({ error: 'failed' }, { status: 500 })
  }
}
