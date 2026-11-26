import { NextResponse } from 'next/server'
import { readSignedBody } from '@/lib/n8n'
import { sendReminders } from '@/lib/masterclass/service'

/** n8n's clock: every 10 minutes it asks for the reminders that are due. Only signed requests count. */
export async function POST(req: Request) {
  const body = await readSignedBody(req)
  if (!body) return NextResponse.json({ error: 'invalid_signature' }, { status: 401 })
  try {
    return NextResponse.json(await sendReminders())
  } catch (err) {
    console.error('[masterclass] reminders failed', err)
    return NextResponse.json({ error: 'failed' }, { status: 500 })
  }
}
