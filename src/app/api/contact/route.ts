import { NextResponse } from 'next/server'
import { cleanAttribution } from '@/lib/attribution-shared'
import { contactEmail, teamNotice } from '@/lib/emails'
import { emitEvent, newEventId, publicUrl, saveLead } from '@/lib/leads'
import { clientIp, rateLimited } from '@/lib/rate-limit'
import { getSettings } from '@/lib/settings'
import { site } from '@/lib/site'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const MAX = { name: 120, company: 160, email: 200, phone: 40, interest: 80, message: 3000, page: 200 }

const clean = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '')

/** Contact form → CRM, then one complete event so n8n can thank the person and alert the team. */
export async function POST(req: Request) {
  const ip = clientIp(req)
  if (rateLimited(`contact:${ip}`)) return NextResponse.json({ error: 'too_many_requests' }, { status: 429 })

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

  const attribution = cleanAttribution(body.attribution)
  const eventId = newEventId()

  try {
    const { contact, lead } = await saveLead({
      ...input,
      title: `${input.interest || 'Consulta web'} · ${input.company || input.name}`,
      source: 'web-contacto',
      attribution,
    })

    const settings = await getSettings()
    const panelUrl = `${publicUrl()}/admin/collections/leads/${lead.id}`

    emitEvent('lead.captured', {
      kind: 'contact',
      eventId,
      locale: input.locale,
      contact: { id: contact.id, name: input.name, email: input.email, phone: input.phone, company: input.company },
      lead: { id: lead.id, title: lead.title, message: input.message, url: panelUrl },
      attribution,
      client: attribution.consent ? { ip, userAgent: req.headers.get('user-agent') } : undefined,
      email: { to: input.email, ...contactEmail({ locale: input.locale, name: input.name }) },
      notice: {
        to: settings.leadNotifyEmail || site.email,
        ...teamNotice({
          title: `Nueva consulta: ${input.company || input.name}`,
          url: panelUrl,
          lines: [
            ['Nombre', input.name],
            ['Empresa', input.company],
            ['Email', input.email],
            ['Teléfono', input.phone],
            ['Interés', input.interest],
            ['Mensaje', input.message],
          ],
        }),
      },
    })

    return NextResponse.json({ ok: true, eventId })
  } catch (err) {
    console.error('[contact] could not save lead', err)
    return NextResponse.json({ error: 'save_failed' }, { status: 500 })
  }
}
