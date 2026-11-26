import { NextResponse } from 'next/server'
import { cleanAttribution } from '@/lib/attribution-shared'
import { EMAIL_RE, normalizePhone } from '@/lib/masterclass/model'
import { enroll, EnrollError, LANDING_PATH } from '@/lib/masterclass/service'
import { clientIp, rateLimited } from '@/lib/rate-limit'

const clean = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().replace(/\s+/g, ' ').slice(0, max) : '')

/** The landing's form: holds a seat and answers with Mercado Pago's payment page. */
export async function POST(req: Request) {
  if (rateLimited(`masterclass:${clientIp(req)}`, 8)) return NextResponse.json({ error: 'too_many_requests' }, { status: 429 })

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }
  if (clean(body.website, 200)) return NextResponse.json({ error: 'failed' }, { status: 400 })

  const name = clean(body.name, 120)
  const email = clean(body.email, 200).toLowerCase()
  const phone = normalizePhone(clean(body.phone, 40))
  const fields = [!name && 'name', !EMAIL_RE.test(email) && 'email', !phone && 'phone'].filter(Boolean)
  if (fields.length) return NextResponse.json({ error: 'invalid_fields', fields }, { status: 422 })

  try {
    const result = await enroll({ name, email, phone: phone!, attribution: cleanAttribution(body.attribution) })
    if ('paid' in result) return NextResponse.json({ url: `${LANDING_PATH}/gracias?e=${result.token}` })
    return NextResponse.json({ url: result.url })
  } catch (err) {
    if (err instanceof EnrollError) return NextResponse.json({ error: err.message }, { status: 409 })
    console.error('[masterclass] enroll failed', err)
    return NextResponse.json({ error: 'failed' }, { status: 500 })
  }
}
