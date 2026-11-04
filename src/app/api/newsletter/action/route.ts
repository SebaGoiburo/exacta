import { NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'
import { routing, type Locale } from '@/i18n/routing'
import { publicUrl } from '@/lib/leads'
import { confirm, unsubscribe } from '@/lib/newsletter'
import { localePath } from '@/lib/seo'

/**
 * The button on the confirm and unsubscribe pages. It's a POST so that email scanners,
 * which open every link they find, can't subscribe or unsubscribe anyone.
 */
export async function POST(req: Request) {
  const form = await req.formData()
  const action = form.get('action')
  const token = String(form.get('token') ?? '')
  const raw = String(form.get('locale') ?? '')
  const locale: Locale = routing.locales.includes(raw as Locale) ? (raw as Locale) : routing.defaultLocale

  const payload = await getPayload({ config })
  let done = false
  try {
    if (action === 'confirmar') done = await confirm(payload, token)
    if (action === 'baja') done = await unsubscribe(payload, token)
  } catch (err) {
    console.error('[newsletter] action failed', err)
  }

  const result = done ? (action === 'baja' ? 'baja-lista' : 'confirmada') : 'invalido'
  return NextResponse.redirect(`${publicUrl()}${localePath(locale, `/suscripcion/${result}`)}`, 303)
}
