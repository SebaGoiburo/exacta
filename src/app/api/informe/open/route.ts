import { headers } from 'next/headers'
import { NextResponse } from 'next/server'
import { clientIp, rateLimited } from '@/lib/rate-limit'
import { cms, registerOpen } from '@/lib/prospecting/service'

const TOKEN = /^[A-Za-z0-9_-]{10,40}$/

/**
 * The report page calls this a few seconds after it's on screen, so link scanners in email
 * clients don't count as opens. Our own team previewing the report doesn't count either.
 */
export async function POST(req: Request) {
  if (rateLimited(`report-open:${clientIp(req)}`, 20)) return NextResponse.json({ ok: true })
  let token = ''
  try {
    token = String((await req.json())?.token ?? '')
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }
  if (!TOKEN.test(token)) return NextResponse.json({ ok: true })

  try {
    const payload = await cms()
    const { user } = await payload.auth({ headers: await headers() })
    if (!user) await registerOpen(token)
  } catch (err) {
    console.error('[report] open not registered', err)
  }
  return NextResponse.json({ ok: true })
}
