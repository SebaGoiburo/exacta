import { randomBytes } from 'node:crypto'
import { NextResponse } from 'next/server'
import { cleanAttribution } from '@/lib/attribution-shared'
import { QUESTIONS } from '@/lib/diagnostic/questions'
import { invalidAnswers, scoreDiagnostic, type Answers } from '@/lib/diagnostic/scoring'
import { diagnosticEmail, teamNotice } from '@/lib/emails'
import { emitEvent, newEventId, publicUrl, saveLead } from '@/lib/leads'
import { clientIp, rateLimited } from '@/lib/rate-limit'
import { linkDiagnostic } from '@/lib/prospecting/service'
import { getSettings } from '@/lib/settings'
import { site } from '@/lib/site'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const clean = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '')

const PRIORITY = { A: '3', B: '2', C: '0' } as const

/** Keeps only known question ids, so stored answers are always well formed. */
function cleanAnswers(value: unknown): Answers {
  if (!value || typeof value !== 'object') return {}
  const input = value as Record<string, unknown>
  return Object.fromEntries(QUESTIONS.map((q) => [q.id, clean(input[q.id], 20)]))
}

/** Scored only here: the browser never sees the weights or the resulting tier. */
export async function POST(req: Request) {
  const ip = clientIp(req)
  if (rateLimited(`diagnostic:${ip}`)) return NextResponse.json({ error: 'too_many_requests' }, { status: 429 })

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }

  // Honeypot filled: pretend success so bots don't retry.
  if (clean(body.url, 200)) return NextResponse.json({ ok: true })

  const locale = (body.locale === 'en' ? 'en' : 'es') as 'es' | 'en'
  const name = clean(body.name, 120)
  const email = clean(body.email, 200).toLowerCase()
  const phone = clean(body.phone, 40)
  const company = clean(body.company, 160)
  const website = clean(body.website, 200)
  const message = clean(body.message, 2000)

  const missing = Object.entries({ name, email, phone, company })
    .filter(([, v]) => !v)
    .map(([k]) => k)
  if (missing.length) return NextResponse.json({ error: 'missing_fields', fields: missing }, { status: 422 })
  if (!EMAIL_RE.test(email)) return NextResponse.json({ error: 'invalid_email' }, { status: 422 })
  if (body.consent !== true) return NextResponse.json({ error: 'consent_required' }, { status: 422 })

  const answers = cleanAnswers(body.answers)
  const invalid = invalidAnswers(answers)
  if (invalid.length) return NextResponse.json({ error: 'invalid_answers', fields: invalid }, { status: 422 })

  const result = scoreDiagnostic(answers, email)
  const attribution = cleanAttribution(body.attribution)
  const token = randomBytes(16).toString('hex')
  const eventId = newEventId()

  try {
    const { payload, contact, lead } = await saveLead({
      name,
      email,
      phone,
      company,
      website,
      message,
      locale,
      attribution,
      title: `Diagnóstico · ${company}`,
      source: 'diagnostico',
      page: clean(body.page, 200),
      tier: result.tier,
      fit: result.fit,
      maturity: result.maturity,
      priority: PRIORITY[result.tier],
    })

    const diagnostic = await payload.create({
      collection: 'diagnostics',
      overrideAccess: true,
      data: {
        token,
        contact: contact.id,
        lead: lead.id,
        locale,
        tier: result.tier,
        fit: result.fit,
        maturity: result.maturity,
        areas: result.areas,
        answers,
      },
    })

    const report = clean(body.report, 40)
    if (/^[A-Za-z0-9_-]{10,40}$/.test(report)) {
      await linkDiagnostic({ token: report, diagnosticId: diagnostic.id, contactId: contact.id, leadId: lead.id }).catch((err) =>
        console.error('[diagnostic] report link failed', err),
      )
    }

    const settings = await getSettings()
    const prefix = locale === 'en' ? '/en' : ''
    const resultUrl = `${publicUrl()}${prefix}/diagnostico/resultado/${token}`
    const panelUrl = `${publicUrl()}/admin/collections/leads/${lead.id}`

    emitEvent('lead.captured', {
      kind: 'diagnostic',
      eventId,
      locale,
      contact: { id: contact.id, name, email, phone, company, website },
      lead: { id: lead.id, title: lead.title, message, url: panelUrl },
      diagnostic: { token, url: resultUrl, ...result },
      attribution,
      client: attribution.consent ? { ip, userAgent: req.headers.get('user-agent') } : undefined,
      email: {
        to: email,
        ...diagnosticEmail({
          locale,
          name,
          resultUrl,
          maturity: result.maturity,
          bookingUrl: settings.bookingUrl,
          invite: result.tier !== 'C',
        }),
      },
      notice: {
        to: settings.leadNotifyEmail || site.email,
        ...teamNotice({
          title: `Diagnóstico perfil ${result.tier}: ${company}`,
          url: panelUrl,
          lines: [
            ['Perfil', `${result.tier} (ajuste ${result.fit}/100)`],
            ['Madurez digital', `${result.maturity}/100`],
            ['Nombre', name],
            ['Empresa', company],
            ['Email', email],
            ['Teléfono', phone],
            ['Quiere resolver', message],
          ],
        }),
      },
    })

    return NextResponse.json({ ok: true, token, eventId })
  } catch (err) {
    console.error('[diagnostic] could not save', err)
    return NextResponse.json({ error: 'save_failed' }, { status: 500 })
  }
}
