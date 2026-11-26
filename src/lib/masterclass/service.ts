import { randomBytes } from 'node:crypto'
import { getPayload, type Payload, type Where } from 'payload'
import config from '@payload-config'
import type { Enrollment, Masterclass } from '@/payload-types'
import type { Attribution } from '../attribution-shared'
import { teamNotice } from '../emails'
import { emitEvent, publicUrl, saveLead } from '../leads'
import { sendServerEvent } from '../meta-capi'
import { getSettings } from '../settings'
import { site } from '../site'
import { confirmationEmail, reminderEmail, type ClassInfo } from './emails'
import { argDate, googleCalendarUrl, HOLD_MINUTES, offer, pesos } from './model'

/*
 * Selling masterclass seats with Mercado Pago Checkout Pro: the person leaves name, email and WhatsApp, a seat is
 * held for them while they pay on Mercado Pago's own page, and the seat is theirs when Mercado Pago confirms.
 * Payments are always read back from Mercado Pago's API, so a forged notification can't mark anything paid.
 */

export const LANDING_PATH = '/ia-para-humanos'
const MP = 'https://api.mercadopago.com'
const LIVE_HOURS = 3

export class EnrollError extends Error {}

export const mpConfigured = () => Boolean(process.env.MERCADOPAGO_ACCESS_TOKEN)

async function mp<T>(path: string, init: { method?: 'GET' | 'POST'; body?: unknown; idempotencyKey?: string } = {}): Promise<T> {
  const token = process.env.MERCADOPAGO_ACCESS_TOKEN
  if (!token) throw new EnrollError('not_configured')
  const res = await fetch(`${MP}${path}`, {
    method: init.method ?? 'GET',
    headers: {
      authorization: `Bearer ${token}`,
      'content-type': 'application/json',
      ...(init.idempotencyKey ? { 'x-idempotency-key': init.idempotencyKey } : {}),
    },
    body: init.body ? JSON.stringify(init.body) : undefined,
    signal: AbortSignal.timeout(15000),
  })
  const data = (await res.json().catch(() => ({}))) as T & { message?: string }
  if (!res.ok) throw new Error(`Mercado Pago ${res.status}: ${data.message ?? 'sin detalle'}`)
  return data
}

/** The open masterclass the landing sells: the next one that hasn't finished. */
export async function currentMasterclass(payload: Payload) {
  const { docs } = await payload.find({
    collection: 'masterclasses',
    where: {
      status: { in: ['abierta', 'cerrada'] },
      startsAt: { greater_than: new Date(Date.now() - LIVE_HOURS * 3600000).toISOString() },
    },
    sort: 'startsAt',
    limit: 1,
    depth: 0,
    overrideAccess: true,
  })
  return docs[0] ?? null
}

/** Seats paid plus seats someone is paying right now, in total and at the launch price. */
async function seatsTaken(payload: Payload, masterclassId: number, exceptId?: number) {
  const where = (extra: Where): Where => ({
    and: [
      { masterclass: { equals: masterclassId } },
      ...(exceptId ? [{ id: { not_equals: exceptId } }] : []),
      {
        or: [
          { status: { equals: 'pagada' } },
          { and: [{ status: { equals: 'pendiente' } }, { holdUntil: { greater_than: new Date().toISOString() } }] },
        ],
      },
      extra,
    ],
  })
  const [all, launch] = await Promise.all([
    payload.count({ collection: 'enrollments', where: where({}), overrideAccess: true }),
    payload.count({ collection: 'enrollments', where: where({ tier: { equals: 'lanzamiento' } }), overrideAccess: true }),
  ])
  return { total: all.totalDocs, launch: launch.totalDocs }
}

export async function availability(payload: Payload, m: Masterclass, exceptId?: number) {
  const o = offer(
    {
      capacity: m.capacity,
      releasedSeats: m.releasedSeats,
      launchSeats: m.launchSeats,
      launchPrice: m.launchPrice,
      price: m.price,
    },
    await seatsTaken(payload, m.id, exceptId),
  )
  const closed = m.status !== 'abierta' || Date.parse(m.startsAt) < Date.now()
  return { ...o, closed, selling: !closed && !o.soldOut && mpConfigured() }
}

export type Availability = Awaited<ReturnType<typeof availability>>

/* ---------- Enrolling ---------- */

export type EnrollInput = {
  name: string
  email: string
  phone: string
  attribution: Attribution
  /** The browser's address and agent, for Meta's server event. Kept only if the person accepted cookies. */
  client?: { ip?: string; userAgent?: string }
}

/**
 * Holds a seat and returns Mercado Pago's payment page. Someone who started and didn't finish gets the same
 * enrollment back (and their seat held again), so retrying never takes two seats.
 */
export async function enroll(input: EnrollInput): Promise<{ url: string } | { paid: true; token: string }> {
  const payload = await getPayload({ config })
  const m = await currentMasterclass(payload)
  if (!m || m.status !== 'abierta') throw new EnrollError('closed')
  if (!mpConfigured()) throw new EnrollError('not_configured')

  const { docs } = await payload.find({
    collection: 'enrollments',
    where: { masterclass: { equals: m.id }, email: { equals: input.email } },
    sort: '-createdAt',
    limit: 5,
    depth: 0,
    overrideAccess: true,
  })
  const paid = docs.find((e) => e.status === 'pagada')
  if (paid) return { paid: true, token: paid.token }
  const previous = docs.find((e) => e.status === 'pendiente' || e.status === 'rechazada')

  const seats = await availability(payload, m, previous?.id)
  if (seats.closed) throw new EnrollError('closed')
  if (seats.soldOut) throw new EnrollError('sold_out')

  const holdUntil = new Date(Date.now() + HOLD_MINUTES * 60000).toISOString()
  const data = {
    name: input.name,
    email: input.email,
    phone: input.phone,
    status: 'pendiente' as const,
    amount: seats.price,
    tier: seats.tier,
    holdUntil,
    attribution: input.attribution.consent
      ? { ...input.attribution, clientIp: input.client?.ip, userAgent: input.client?.userAgent }
      : input.attribution,
  }
  let enrollment: Enrollment
  if (previous) {
    enrollment = await payload.update({ collection: 'enrollments', id: previous.id, data, overrideAccess: true, depth: 0 })
  } else {
    enrollment = await payload.create({
      collection: 'enrollments',
      data: { ...data, masterclass: m.id, token: randomBytes(18).toString('base64url') },
      overrideAccess: true,
      depth: 0,
    })
    // In the pipeline from the start: whoever doesn't finish paying is worth a WhatsApp.
    const { lead } = await saveLead({
      name: input.name,
      email: input.email,
      phone: input.phone,
      title: `${m.title} · ${argDate(m.startsAt).short}`,
      source: 'ia-para-humanos',
      interest: 'Masterclass IA para Humanos',
      message: `Empezó la inscripción a ${pesos(seats.price)}. Si no aparece como pagada, escribile por WhatsApp.`,
      page: LANDING_PATH,
      locale: 'es',
      attribution: input.attribution,
    }).catch((err) => {
      console.error('[masterclass] lead not saved', err)
      return { lead: null }
    })
    if (lead) {
      enrollment = await payload.update({
        collection: 'enrollments',
        id: enrollment.id,
        data: { lead: lead.id },
        overrideAccess: true,
        depth: 0,
      })
    }
  }

  const back = `${publicUrl()}${LANDING_PATH}/gracias?e=${enrollment.token}`
  const preference = await mp<{ id: string; init_point: string }>('/checkout/preferences', {
    method: 'POST',
    idempotencyKey: `${enrollment.token}-${holdUntil}`,
    body: {
      items: [
        {
          id: `masterclass-${m.id}`,
          title: m.title,
          description: `Clase en vivo por Google Meet, ${argDate(m.startsAt).long} a las ${argDate(m.startsAt).time}`,
          category_id: 'learnings',
          quantity: 1,
          currency_id: 'ARS',
          unit_price: seats.price,
        },
      ],
      payer: { name: input.name, email: input.email },
      external_reference: enrollment.token,
      back_urls: { success: back, pending: back, failure: back },
      auto_return: 'approved',
      notification_url: `${publicUrl()}/api/masterclass/webhook`,
      statement_descriptor: 'IA PARA HUMANOS',
      // Cash vouchers take days to clear, longer than the seat is held: card, debit and Mercado Pago balance only.
      payment_methods: { excluded_payment_types: [{ id: 'ticket' }, { id: 'atm' }] },
      expires: true,
      expiration_date_to: holdUntil,
    },
  })
  await payload.update({
    collection: 'enrollments',
    id: enrollment.id,
    data: { mpPreferenceId: preference.id },
    overrideAccess: true,
  })
  return { url: preference.init_point }
}

/* ---------- Payments ---------- */

type MpPayment = { id: number; status: string; status_detail?: string; external_reference?: string; transaction_amount?: number }

/**
 * Reads a payment from Mercado Pago and brings its enrollment up to date. Called by the notification and by the
 * thank-you page, so a late or lost notification never leaves a paid seat unconfirmed.
 */
export async function syncPayment(paymentId: string) {
  if (!/^\d{1,20}$/.test(paymentId)) return null
  const payment = await mp<MpPayment>(`/v1/payments/${paymentId}`)
  if (!payment.external_reference) return null
  const payload = await getPayload({ config })
  const { docs } = await payload.find({
    collection: 'enrollments',
    where: { token: { equals: payment.external_reference } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  })
  const enrollment = docs[0]
  if (!enrollment) return null

  const base = { mpPaymentId: String(payment.id), mpStatus: [payment.status, payment.status_detail].filter(Boolean).join(' · ') }
  if (payment.status === 'approved') return markPaid(payload, enrollment, base)
  if (payment.status === 'refunded' || payment.status === 'charged_back') {
    return payload.update({
      collection: 'enrollments',
      id: enrollment.id,
      data: { ...base, status: 'devuelta' },
      overrideAccess: true,
      depth: 0,
    })
  }
  if ((payment.status === 'rejected' || payment.status === 'cancelled') && enrollment.status === 'pendiente') {
    return payload.update({
      collection: 'enrollments',
      id: enrollment.id,
      data: { ...base, status: 'rechazada' },
      overrideAccess: true,
      depth: 0,
    })
  }
  return payload.update({ collection: 'enrollments', id: enrollment.id, data: base, overrideAccess: true, depth: 0 })
}

async function markPaid(payload: Payload, enrollment: Enrollment, base: { mpPaymentId: string; mpStatus: string }) {
  if (enrollment.status === 'pagada') return enrollment
  const masterclassId = typeof enrollment.masterclass === 'object' ? enrollment.masterclass.id : enrollment.masterclass
  const { totalDocs } = await payload.count({
    collection: 'enrollments',
    where: { masterclass: { equals: masterclassId }, status: { equals: 'pagada' } },
    overrideAccess: true,
  })
  const updated = await payload.update({
    collection: 'enrollments',
    id: enrollment.id,
    data: { ...base, status: 'pagada', paidAt: new Date().toISOString(), seat: totalDocs + 1 },
    overrideAccess: true,
    depth: 0,
  })
  const m = await payload.findByID({ collection: 'masterclasses', id: masterclassId, depth: 0, overrideAccess: true })

  const leadId = typeof updated.lead === 'object' ? updated.lead?.id : updated.lead
  if (leadId) {
    const lead = await payload.findByID({ collection: 'leads', id: leadId, depth: 0, overrideAccess: true }).catch(() => null)
    if (lead) {
      await payload.update({
        collection: 'leads',
        id: lead.id,
        overrideAccess: true,
        data: {
          stage: 'ganado',
          expectedRevenue: updated.amount ?? undefined,
          activity: [
            ...(lead.activity ?? []),
            {
              type: 'nota',
              date: new Date().toISOString(),
              text: `Pagó ${pesos(updated.amount ?? 0)} en Mercado Pago. Lugar n.º ${updated.seat}.`,
            },
          ],
        },
      })
    }
  }

  emitEvent('email.send', {
    email: {
      to: updated.email,
      ...confirmationEmail({
        name: updated.name,
        amount: updated.amount ?? 0,
        seat: updated.seat,
        info: classInfo(m, updated.token),
      }),
    },
  })
  await payload.update({
    collection: 'enrollments',
    id: updated.id,
    data: { confirmedAt: new Date().toISOString() },
    overrideAccess: true,
  })

  const settings = await getSettings()
  const attribution = (updated.attribution ?? {}) as Attribution & { clientIp?: string; userAgent?: string }
  if (attribution.consent) {
    await sendServerEvent(settings.metaPixelId, {
      name: 'Purchase',
      // The same ID the thank-you page gives the pixel: Meta counts the purchase once.
      eventId: `purchase-${updated.token}`,
      url: `${publicUrl()}${LANDING_PATH}`,
      email: updated.email,
      phone: updated.phone,
      firstName: updated.name.split(/\s+/)[0],
      value: updated.amount ?? 0,
      currency: 'ARS',
      client: { ip: attribution.clientIp, userAgent: attribution.userAgent, fbp: attribution.fbp, fbc: attribution.fbc },
    })
  }
  const seats = await availability(payload, m)
  emitEvent('email.send', {
    email: {
      to: settings.leadNotifyEmail || site.email,
      ...teamNotice({
        title: `Nueva inscripción pagada: ${updated.name} (${pesos(updated.amount ?? 0)})`,
        url: `${publicUrl()}/admin/collections/enrollments/${updated.id}`,
        lines: [
          ['Masterclass', m.title],
          ['Email', updated.email],
          ['WhatsApp', updated.phone],
          ['Lugar', `n.º ${updated.seat}`],
          ['Quedan', `${seats.left} de ${seats.total}`],
          ['Factura', `Emitir factura C por ${pesos(updated.amount ?? 0)} a ${updated.name}`],
        ],
      }),
    },
  })
  return updated
}

/* ---------- Calendar and reminders ---------- */

export function classInfo(m: Masterclass, token: string): ClassInfo {
  const details = `Masterclass en vivo de IA para Humanos.${m.meetUrl ? ` Enlace: ${m.meetUrl}` : ' El enlace de Google Meet te llega por mail.'}`
  return {
    title: m.title,
    startsAt: m.startsAt,
    durationMin: m.durationMin ?? 150,
    meetUrl: m.meetUrl,
    calendarUrl: googleCalendarUrl({ title: m.title, startsAt: m.startsAt, durationMin: m.durationMin ?? 150, details }),
    icsUrl: `${publicUrl()}/api/masterclass/calendario?e=${token}`,
  }
}

/** Sends what's due: the reminder 24 hours before and the one an hour before. The site's clock calls this every 10 minutes. */
export async function sendReminders() {
  const payload = await getPayload({ config })
  const now = Date.now()
  const { docs: classes } = await payload.find({
    collection: 'masterclasses',
    where: {
      startsAt: { greater_than: new Date(now).toISOString(), less_than: new Date(now + 24 * 3600000).toISOString() },
    },
    limit: 5,
    depth: 0,
    overrideAccess: true,
  })
  let sent = 0
  for (const m of classes) {
    const minutesLeft = (Date.parse(m.startsAt) - now) / 60000
    // "Tomorrow" only goes out the evening before; whoever buys later already has the confirmation.
    if (minutesLeft > 70 && minutesLeft < 20 * 60) continue
    const when: '24h' | '1h' = minutesLeft <= 70 ? '1h' : '24h'
    const field = when === '1h' ? 'reminded1At' : 'reminded24At'
    const { docs } = await payload.find({
      collection: 'enrollments',
      where: { masterclass: { equals: m.id }, status: { equals: 'pagada' }, [field]: { exists: false } },
      limit: 200,
      depth: 0,
      overrideAccess: true,
    })
    if (!docs.length) continue
    if (!m.meetUrl) {
      const settings = await getSettings()
      emitEvent('email.send', {
        email: {
          to: settings.leadNotifyEmail || site.email,
          ...teamNotice({
            title: `Falta el enlace de Meet de "${m.title}"`,
            url: `${publicUrl()}/admin/collections/masterclasses/${m.id}`,
            lines: [['Qué hacer', 'Cargalo en la masterclass: los recordatorios ya salieron sin enlace.']],
          }),
        },
      })
    }
    for (const e of docs) {
      emitEvent('email.send', { email: { to: e.email, ...reminderEmail({ name: e.name, info: classInfo(m, e.token), when }) } })
      // Both marks when the hour reminder goes: nobody gets "tomorrow" an hour before.
      await payload.update({
        collection: 'enrollments',
        id: e.id,
        data:
          when === '1h'
            ? { reminded1At: new Date().toISOString(), reminded24At: e.reminded24At ?? new Date().toISOString() }
            : { reminded24At: new Date().toISOString() },
        overrideAccess: true,
      })
      sent++
    }
  }
  return { sent }
}

export async function enrollmentByToken(payload: Payload, token: string) {
  if (!/^[\w-]{10,40}$/.test(token)) return null
  const { docs } = await payload.find({
    collection: 'enrollments',
    where: { token: { equals: token } },
    limit: 1,
    depth: 1,
    overrideAccess: true,
  })
  return docs[0] ?? null
}
