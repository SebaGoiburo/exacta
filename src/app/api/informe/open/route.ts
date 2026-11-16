import { headers } from 'next/headers'
import { NextResponse } from 'next/server'
import { clientIp, rateLimited } from '@/lib/rate-limit'
import {
  cms,
  registerClick,
  registerOpen,
  registerReach,
  REPORT_CTAS,
  REPORT_SECTIONS,
  type ReportCta,
  type ReportSection,
} from '@/lib/prospecting/service'

const TOKEN = /^[A-Za-z0-9_-]{10,40}$/

/**
 * What the report page tells us about its reading: the open (a few seconds after it's on screen, so link
 * scanners don't count), how far the reader got and which button they pressed. Our own team doesn't count.
 */
export async function POST(req: Request) {
  if (rateLimited(`report-open:${clientIp(req)}`, 60)) return NextResponse.json({ ok: true })
  let body: { token?: unknown; event?: unknown; value?: unknown }
  try {
    body = (await req.json()) ?? {}
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }
  const token = String(body.token ?? '')
  if (!TOKEN.test(token)) return NextResponse.json({ ok: true })
  const event = body.event ?? 'open'
  const value = String(body.value ?? '')

  try {
    const payload = await cms()
    const { user } = await payload.auth({ headers: await headers() })
    if (user) return NextResponse.json({ ok: true })
    if (event === 'open') await registerOpen(token)
    else if (event === 'reach' && REPORT_SECTIONS.includes(value as ReportSection))
      await registerReach(token, value as ReportSection)
    else if (event === 'click' && REPORT_CTAS.includes(value as ReportCta)) await registerClick(token, value as ReportCta)
  } catch (err) {
    console.error('[report] reading not registered', err)
  }
  return NextResponse.json({ ok: true })
}
