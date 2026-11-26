import { randomBytes } from 'node:crypto'
import { NextResponse } from 'next/server'
import { teamNotice } from '@/lib/emails'
import { emitEvent, publicUrl } from '@/lib/leads'
import { withdrawalEmail } from '@/lib/masterclass/emails'
import { EMAIL_RE } from '@/lib/masterclass/model'
import { clientIp, rateLimited } from '@/lib/rate-limit'
import { getSettings } from '@/lib/settings'
import { site } from '@/lib/site'

const clean = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '')

/** The withdrawal button the law asks for: the request reaches the team and the buyer gets a case code. */
export async function POST(req: Request) {
  if (rateLimited(`withdrawal:${clientIp(req)}`, 4)) return NextResponse.json({ error: 'too_many_requests' }, { status: 429 })
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>
  const name = clean(body.name, 120)
  const email = clean(body.email, 200).toLowerCase()
  const detail = clean(body.detail, 1000)
  if (!name || !EMAIL_RE.test(email)) return NextResponse.json({ error: 'invalid_fields' }, { status: 422 })

  const code = `ARR-${randomBytes(3).toString('hex').toUpperCase()}`
  const settings = await getSettings()
  emitEvent('email.send', { email: { to: email, ...withdrawalEmail({ name, code }) } })
  emitEvent('email.send', {
    email: {
      to: settings.leadNotifyEmail || site.email,
      ...teamNotice({
        title: `Pedido de arrepentimiento ${code}: ${name}`,
        url: `${publicUrl()}/admin/collections/enrollments`,
        lines: [
          ['Email', email],
          ['Detalle', detail],
          [
            'Qué hacer',
            'Devolver el pago desde Mercado Pago en las próximas 48 horas hábiles y marcar la inscripción como devuelta.',
          ],
        ],
      }),
    },
  })
  return NextResponse.json({ code })
}
