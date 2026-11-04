import { NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'
import { routing, type Locale } from '@/i18n/routing'
import { subscribe } from '@/lib/newsletter'
import { clientIp, rateLimited } from '@/lib/rate-limit'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const MAX_EMAIL = 254

/** Subscribes from the blog form. It answers the same whether or not the address already existed. */
export async function POST(req: Request) {
  if (rateLimited(`newsletter:${clientIp(req)}`)) return NextResponse.json({ error: 'too_many' }, { status: 429 })

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }

  // Honeypot: only bots fill this. They get a normal answer and nothing is saved.
  if (body.website) return NextResponse.json({ ok: true })

  const email = typeof body.email === 'string' ? body.email.trim() : ''
  if (!EMAIL_RE.test(email) || email.length > MAX_EMAIL) return NextResponse.json({ error: 'invalid_email' }, { status: 422 })
  if (body.consent !== true) return NextResponse.json({ error: 'consent' }, { status: 422 })

  const locale: Locale = routing.locales.includes(body.locale as Locale) ? (body.locale as Locale) : routing.defaultLocale
  const page = typeof body.page === 'string' ? body.page.slice(0, 300) : undefined

  try {
    await subscribe(await getPayload({ config }), { email, locale, page })
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[newsletter] subscribe failed', err)
    return NextResponse.json({ error: 'failed' }, { status: 500 })
  }
}
