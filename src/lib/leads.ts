import { randomUUID } from 'node:crypto'
import { getPayload, type Payload } from 'payload'
import config from '@payload-config'
import type { Locale } from '@/i18n/routing'
import type { Contact } from '@/payload-types'
import type { Attribution } from './attribution-shared'
import { instagramLeadRef } from './instagram/keywords'
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

/**
 * Finds the contact by email, filling only what it was missing, and opens a new opportunity. If the person came
 * from an Instagram auto-reply, the opportunity Instagram opened gets their details instead.
 */
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

  const fromInstagram = await completeInstagramLead(payload, input, existing ?? null, context)
  if (fromInstagram) return { payload, ...fromInstagram }

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

/**
 * The Instagram opportunity the form's link points to (utm_content=ig-<id>), now with the person's details.
 * Null when there's none or it's already closed: then the form opens its own opportunity as usual.
 */
async function completeInstagramLead(
  payload: Payload,
  input: LeadInput,
  emailContact: Contact | null,
  context: Record<string, unknown>,
) {
  const leadId = instagramLeadRef(input.attribution.utm_content)
  if (!leadId) return null
  const lead = await payload.findByID({ collection: 'leads', id: leadId, depth: 0, overrideAccess: true }).catch(() => null)
  if (!lead || lead.source !== 'instagram' || lead.stage === 'ganado' || lead.stage === 'perdido') return null
  const igContactId = typeof lead.contact === 'object' ? lead.contact.id : lead.contact
  const igContact = await payload
    .findByID({ collection: 'contacts', id: igContactId, depth: 0, overrideAccess: true })
    .catch(() => null)
  if (!igContact) return null

  let contact: Contact
  if (emailContact && emailContact.id !== igContact.id) {
    // They were already a contact: that one keeps the opportunity, and learns their Instagram.
    contact = await payload.update({
      collection: 'contacts',
      id: emailContact.id,
      overrideAccess: true,
      context,
      data: {
        phone: emailContact.phone || input.phone,
        company: emailContact.company || input.company || undefined,
        website: emailContact.website || input.website || undefined,
        instagram: emailContact.instagram || igContact.instagram,
        instagramId: emailContact.instagramId || igContact.instagramId,
      },
    })
  } else {
    contact = await payload.update({
      collection: 'contacts',
      id: igContact.id,
      overrideAccess: true,
      context,
      data: {
        name: input.name,
        email: input.email,
        phone: igContact.phone || input.phone,
        company: igContact.company || input.company || undefined,
        website: igContact.website || input.website || undefined,
      },
    })
  }

  const updated = await payload.update({
    collection: 'leads',
    id: lead.id,
    overrideAccess: true,
    context,
    depth: 0,
    data: {
      title: input.title,
      contact: contact.id,
      priority: input.priority ?? lead.priority,
      interest: input.interest || lead.interest || undefined,
      message: [lead.message, input.message].filter(Boolean).join('\n\n') || undefined,
      page: input.page || lead.page || undefined,
      locale: input.locale,
      tier: input.tier ?? lead.tier,
      fit: input.fit ?? lead.fit,
      maturity: input.maturity ?? lead.maturity,
      attribution: { ...(lead.attribution as Record<string, unknown> | null), ...input.attribution },
      activity: [
        ...(lead.activity ?? []),
        {
          type: 'nota',
          date: new Date().toISOString(),
          text: `Completó el formulario desde el enlace de Instagram: ${input.title}`,
        },
      ],
    },
  })

  // The placeholder contact Instagram created is left without opportunities once merged: it goes.
  if (contact.id !== igContact.id) {
    const { totalDocs } = await payload.count({
      collection: 'leads',
      where: { contact: { equals: igContact.id } },
      overrideAccess: true,
    })
    if (!totalDocs)
      await payload.delete({ collection: 'contacts', id: igContact.id, overrideAccess: true, context }).catch(() => undefined)
  }

  return { contact, lead: updated }
}

/** Fire and forget: the lead is already saved, so a failed delivery must never fail the form. */
export function emitEvent(event: string, data: unknown) {
  const url = process.env.N8N_EVENTS_WEBHOOK_URL
  if (!url) return
  sendToN8n(url, event, data).catch((err) => console.error(`[n8n] ${event} not delivered`, err))
}

export const newEventId = () => randomUUID()
