import { randomUUID } from 'node:crypto'
import type { Payload } from 'payload'
import type { Locale } from '@/i18n/routing'
import { confirmSubscriptionEmail, postEmail } from './emails'
import { emitEvent, publicUrl } from './leads'
import { localePath } from './seo'

/*
 * Blog subscription with double opt-in: nobody gets anything until they confirm their email.
 * Answers never say whether an address was already subscribed.
 */

/** Pause between emails, so the mailbox doesn't get flagged for sending in bursts. */
const SEND_GAP_MS = 1500

const link = (path: string, token: string, locale: Locale) =>
  `${publicUrl()}${localePath(locale, path)}?token=${encodeURIComponent(token)}`

export async function subscribe(payload: Payload, a: { email: string; locale: Locale; page?: string }) {
  const email = a.email.toLowerCase()
  const { docs } = await payload.find({
    collection: 'subscribers',
    where: { email: { equals: email } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
    showHiddenFields: true,
  })
  const existing = docs[0]
  if (existing?.status === 'confirmado') return

  const token = randomUUID()
  if (existing) {
    await payload.update({
      collection: 'subscribers',
      id: existing.id,
      overrideAccess: true,
      data: { status: 'pendiente', token, locale: a.locale, page: a.page },
    })
  } else {
    await payload.create({
      collection: 'subscribers',
      overrideAccess: true,
      data: { email, status: 'pendiente', token, locale: a.locale, page: a.page },
    })
  }

  emitEvent('email.send', {
    email: { to: email, ...confirmSubscriptionEmail({ locale: a.locale, url: link('/suscripcion/confirmar', token, a.locale) }) },
  })
}

async function byToken(payload: Payload, token: string) {
  if (!token) return null
  const { docs } = await payload.find({
    collection: 'subscribers',
    where: { token: { equals: token } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
    showHiddenFields: true,
  })
  return docs[0] ?? null
}

export async function confirm(payload: Payload, token: string) {
  const subscriber = await byToken(payload, token)
  if (!subscriber || subscriber.status === 'baja') return false
  if (subscriber.status !== 'confirmado') {
    await payload.update({
      collection: 'subscribers',
      id: subscriber.id,
      overrideAccess: true,
      data: { status: 'confirmado', confirmedAt: new Date().toISOString() },
    })
  }
  return true
}

export async function unsubscribe(payload: Payload, token: string) {
  const subscriber = await byToken(payload, token)
  if (!subscriber) return false
  await payload.update({ collection: 'subscribers', id: subscriber.id, overrideAccess: true, data: { status: 'baja' } })
  return true
}

type PublishedPost = { id: number; slug?: string | null; title: unknown; excerpt?: unknown }

const text = (value: unknown) => {
  if (typeof value === 'string') return value
  if (value && typeof value === 'object' && 'es' in value) return String((value as { es: unknown }).es ?? '')
  return ''
}

/** Marks the article as sent first, so a second save can't send it twice. Runs in the background. */
export async function sendPostToSubscribers(payload: Payload, post: PublishedPost) {
  await payload.update({
    collection: 'posts',
    id: post.id,
    overrideAccess: true,
    context: { skipN8n: true },
    data: { newsletterSentAt: new Date().toISOString() },
  })

  const { docs } = await payload.find({
    collection: 'subscribers',
    where: { status: { equals: 'confirmado' } },
    pagination: false,
    depth: 0,
    overrideAccess: true,
    showHiddenFields: true,
  })

  for (const subscriber of docs) {
    const locale: Locale = subscriber.locale === 'en' ? 'en' : 'es'
    emitEvent('email.send', {
      email: {
        to: subscriber.email,
        ...postEmail({
          locale,
          title: text(post.title),
          excerpt: text(post.excerpt),
          url: `${publicUrl()}${localePath(locale, `/blog/${post.slug}`)}`,
          unsubscribeUrl: link('/suscripcion/baja', subscriber.token, locale),
        }),
      },
    })
    await new Promise((resolve) => setTimeout(resolve, SEND_GAP_MS))
  }
  console.log(`[newsletter] article ${post.id} sent to ${docs.length} subscribers`)
}
