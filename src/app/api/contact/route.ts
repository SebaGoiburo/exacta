import { NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const MAX = { name: 120, company: 160, email: 200, phone: 40, interest: 80, message: 3000, page: 200 }

// Naive per-instance rate limit: enough to stop a single client hammering the form.
const hits = new Map<string, number[]>()
const WINDOW_MS = 10 * 60 * 1000
const LIMIT = 5

function rateLimited(ip: string) {
  const now = Date.now()
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS)
  recent.push(now)
  hits.set(ip, recent)
  return recent.length > LIMIT
}

const clean = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '')

/**
 * Contact form → CRM. Finds or creates the contact by email and opens a new opportunity
 * in the "nuevo" stage. The CRM hooks then notify n8n (leads.created).
 */
export async function POST(req: Request) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
  if (rateLimited(ip)) return NextResponse.json({ error: 'too_many_requests' }, { status: 429 })

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }

  // Honeypot filled: pretend success so bots don't retry.
  if (clean(body.website, 200)) return NextResponse.json({ ok: true })

  const input = {
    name: clean(body.name, MAX.name),
    company: clean(body.company, MAX.company),
    email: clean(body.email, MAX.email).toLowerCase(),
    phone: clean(body.phone, MAX.phone),
    interest: clean(body.interest, MAX.interest),
    message: clean(body.message, MAX.message),
    locale: (body.locale === 'en' ? 'en' : 'es') as 'es' | 'en',
    page: clean(body.page, MAX.page),
  }

  const missing = (['name', 'email', 'phone'] as const).filter((k) => !input[k])
  if (missing.length) return NextResponse.json({ error: 'missing_fields', fields: missing }, { status: 422 })
  if (!EMAIL_RE.test(input.email)) return NextResponse.json({ error: 'invalid_email' }, { status: 422 })

  try {
    const payload = await getPayload({ config })

    const existing = await payload.find({
      collection: 'contacts',
      where: { email: { equals: input.email } },
      limit: 1,
      overrideAccess: true,
    })
    const contact =
      existing.docs[0] ??
      (await payload.create({
        collection: 'contacts',
        overrideAccess: true,
        data: {
          name: input.name,
          email: input.email,
          phone: input.phone,
          company: input.company || undefined,
          source: 'web-contacto',
        },
      }))

    await payload.create({
      collection: 'leads',
      overrideAccess: true,
      data: {
        title: `${input.interest || 'Consulta web'} · ${input.company || input.name}`,
        contact: contact.id,
        stage: 'nuevo',
        interest: input.interest || undefined,
        message: input.message || undefined,
        source: 'web-contacto',
        page: input.page || undefined,
        locale: input.locale,
      },
    })
  } catch (err) {
    console.error('[contact] could not save lead', err)
    return NextResponse.json({ error: 'save_failed' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
