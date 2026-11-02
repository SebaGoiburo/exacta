import { randomUUID } from 'node:crypto'
import { getPayload } from 'payload'
import config from '@payload-config'
import type { Locale } from '@/i18n/routing'
import type { Attribution } from './attribution-shared'
import { sendToN8n } from './n8n'
import { site } from './site'

export const publicUrl = () => process.env.NEXT_PUBLIC_SERVER_URL || site.url

export type LeadInput = {
  name: string
  email: string
  phone: string
  company?: string
  website?: string
  title: string
  source: 'web-contacto' | 'diagnostico'
  interest?: string
  message?: string
  page?: string
  locale: Locale
  attribution: Attribution
  tier?: 'A' | 'B' | 'C'
  fit?: number
  maturity?: number
  /** 0 low to 3 very high, as stored in the CRM. */
  priority?: '0' | '1' | '2' | '3'
}

/** Finds the contact by email, filling only what it was missing, and opens a new opportunity. */
export async function saveLead(input: LeadInput) {
  const payload = await getPayload({ config })

  const { docs } = await payload.find({
    collection: 'contacts',
    where: { email: { equals: input.email } },
    limit: 1,
    overrideAccess: true,
  })

  // The caller sends one complete event instead of the generic created and updated ones.
  const context = { skipN8n: true }
  const existing = docs[0]
  const contact = existing
    ? await payload.update({
        collection: 'contacts',
        id: existing.id,
        overrideAccess: true,
        context,
        data: {
          company: existing.company || input.company || undefined,
          website: existing.website || input.website || undefined,
          phone: existing.phone || input.phone,
        },
      })
    : await payload.create({
        collection: 'contacts',
        overrideAccess: true,
        context,
        data: {
          name: input.name,
          email: input.email,
          phone: input.phone,
          company: input.company || undefined,
          website: input.website || undefined,
          source: input.source,
        },
      })

  const lead = await payload.create({
    collection: 'leads',
    overrideAccess: true,
    context,
    data: {
      title: input.title,
      contact: contact.id,
      stage: 'nuevo',
      priority: input.priority ?? '1',
      interest: input.interest || undefined,
      message: input.message || undefined,
      source: input.source,
      page: input.page || undefined,
      locale: input.locale,
      tier: input.tier,
      fit: input.fit,
      maturity: input.maturity,
      attribution: input.attribution,
    },
  })

  return { payload, contact, lead }
}

/** Fire and forget: the lead is already saved, so a failed delivery must never fail the form. */
export function emitEvent(event: string, data: unknown) {
  const url = process.env.N8N_EVENTS_WEBHOOK_URL
  if (!url) return
  sendToN8n(url, event, data).catch((err) => console.error(`[n8n] ${event} not delivered`, err))
}

export const newEventId = () => randomUUID()
