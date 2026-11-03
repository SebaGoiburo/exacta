import { getPayload, type Payload } from 'payload'
import config from '@payload-config'
import { businessStatus } from '@/lib/business-hours'
import { getFaqs, getProducts } from '@/lib/content'
import { publicUrl } from '@/lib/leads'
import { getSettings } from '@/lib/settings'
import { site } from '@/lib/site'
import messages from '@/messages/es.json'
import type { Conversation } from '@/payload-types'
import {
  buildLlmRequest,
  fallbackReply,
  mergeCollected,
  parseAgentOutput,
  type Collected,
  type HistoryMessage,
} from './prompt'

/** After this many replies the conversation goes to a person: it also caps what one chat can spend. */
const MAX_AI_REPLIES = 25
const PREVIEW_LENGTH = 120
const TEMPLATE_LANGUAGE = 'es_AR'

export const cms = () => getPayload({ config })

const preview = (text: string) => text.slice(0, PREVIEW_LENGTH)

export type InboundMessage = {
  waId: string
  phoneNumberId: string
  profileName?: string
  waMessageId: string
  text: string
}

/** What the site publishes, plus what the team added for the agent. */
async function buildKnowledge(payload: Payload) {
  const [products, faqs, extra] = await Promise.all([
    getProducts(),
    getFaqs(),
    payload.find({
      collection: 'knowledge',
      where: { active: { equals: true } },
      limit: 100,
      depth: 0,
      overrideAccess: true,
    }),
  ])

  const services = messages.services.items.map((s) => `- ${s.title}: ${s.body} (${s.tags.join(', ')})`)
  const productLines = products.map(
    (p) => `- ${p.name}: ${p.tagline.es}. ${p.body.es} Para: ${p.audience.es}. ${p.features.es.join('; ')}.`,
  )
  const faqLines = faqs.map((f) => `- ${f.q.es} ${f.a.es}`)

  return [
    `Empresa: Exacta Transformación Digital, en ${site.city}. ${messages.meta.description}`,
    `Servicios:\n${services.join('\n')}`,
    `Productos:\n${productLines.join('\n')}`,
    `Preguntas frecuentes:\n${faqLines.join('\n')}`,
    ...extra.docs.map((d) => `${d.title}:\n${d.content}`),
  ].join('\n\n')
}

function collectedOf(conversation: Conversation): Collected {
  const c = conversation.collected ?? {}
  return {
    name: c.name ?? undefined,
    email: c.email ?? undefined,
    company: c.company ?? undefined,
    role: c.role ?? undefined,
    companySize: c.companySize ?? undefined,
    need: c.need ?? undefined,
  }
}

async function loadHistory(payload: Payload, conversation: Conversation): Promise<HistoryMessage[]> {
  const { docs } = await payload.find({
    collection: 'conversation-messages',
    where: {
      and: [
        { conversation: { equals: conversation.id } },
        { createdAt: { greater_than_equal: conversation.sessionStart ?? conversation.createdAt } },
      ],
    },
    sort: '-createdAt',
    limit: 30,
    depth: 0,
    overrideAccess: true,
  })
  return docs.reverse().map((m) => ({ sender: m.sender, text: m.text }))
}

const textMessage = (to: string, phoneNumberId: string | null | undefined, text: string) => ({
  phoneNumberId,
  body: { messaging_product: 'whatsapp', to, type: 'text', text: { body: text } },
})

/** Saves an outgoing message and returns what n8n has to send. */
async function saveReply(
  payload: Payload,
  conversation: Conversation,
  text: string,
  sender: 'agente' | 'asesor',
  data: Partial<Conversation>,
) {
  const now = new Date().toISOString()
  const message = await payload.create({
    collection: 'conversation-messages',
    overrideAccess: true,
    data: { conversation: conversation.id, sender, text },
  })
  await payload.update({
    collection: 'conversations',
    id: conversation.id,
    overrideAccess: true,
    data: { lastMessageAt: now, lastPreview: preview(text), ...data },
  })
  return message
}

/** Links the conversation to the CRM: a contact as soon as there's an email or a handoff, and one opportunity. */
async function syncCrm(payload: Payload, conversation: Conversation, collected: Collected, handoff: boolean) {
  const context = { skipN8n: true }
  const relId = (v: unknown) => (v && typeof v === 'object' ? (v as { id: number }).id : (v as number | null | undefined))
  let contactId = relId(conversation.contact)
  let leadId = relId(conversation.lead)

  if (!contactId && (collected.email || handoff)) {
    const { docs } = await payload.find({
      collection: 'contacts',
      where: collected.email ? { email: { equals: collected.email } } : { phone: { equals: conversation.waId } },
      limit: 1,
      depth: 0,
      overrideAccess: true,
    })
    contactId =
      docs[0]?.id ??
      (
        await payload.create({
          collection: 'contacts',
          overrideAccess: true,
          context,
          data: {
            name: collected.name || conversation.profileName || conversation.waId,
            email: collected.email,
            phone: conversation.waId,
            source: 'whatsapp',
          },
        })
      ).id
  }

  if (contactId) {
    const existing = await payload.findByID({ collection: 'contacts', id: contactId, depth: 0, overrideAccess: true })
    await payload.update({
      collection: 'contacts',
      id: contactId,
      overrideAccess: true,
      context,
      data: {
        // A real name beats the WhatsApp profile name that may have opened the contact.
        name: collected.name || existing.name,
        email: existing.email || collected.email,
        phone: existing.phone || conversation.waId,
        company: existing.company || collected.company,
        role: existing.role || collected.role,
        companySize: existing.companySize || collected.companySize,
      },
    })

    const title = `WhatsApp · ${collected.company || collected.name || conversation.profileName || conversation.waId}`
    if (leadId) {
      await payload.update({
        collection: 'leads',
        id: leadId,
        overrideAccess: true,
        context,
        data: { title, message: collected.need },
      })
    } else {
      leadId = (
        await payload.create({
          collection: 'leads',
          overrideAccess: true,
          context,
          data: { title, contact: contactId, stage: 'nuevo', source: 'whatsapp', locale: 'es', message: collected.need },
        })
      ).id
    }
  }

  return { contact: contactId ?? null, lead: leadId ?? null }
}

/** The notice to the advisor. It's a template because Meta only allows templates to start a conversation. */
async function handoffNotice(conversation: Conversation, collected: Collected) {
  const settings = await getSettings()
  if (!settings.handoffPhone || !settings.handoffTemplate) return null
  const who = collected.name || conversation.profileName || conversation.waId
  return {
    phoneNumberId: conversation.phoneNumberId,
    body: {
      messaging_product: 'whatsapp',
      to: settings.handoffPhone.replace(/\D/g, ''),
      type: 'template',
      template: {
        name: settings.handoffTemplate,
        language: { code: TEMPLATE_LANGUAGE },
        components: [
          {
            type: 'body',
            parameters: [
              { type: 'text', text: who },
              { type: 'text', text: collected.company || 'sin empresa indicada' },
              { type: 'text', text: `${publicUrl()}/admin/conversaciones?c=${conversation.id}` },
            ],
          },
        ],
      },
    },
  }
}

/** Hands the conversation to a person: CRM record, closing message and the notice to the advisor. */
async function handoff(payload: Payload, conversation: Conversation, collected: Collected, text: string) {
  const crm = await syncCrm(payload, conversation, collected, true)
  const message = await saveReply(payload, conversation, text, 'agente', {
    status: 'derivada',
    handoffAt: new Date().toISOString(),
    aiReplies: (conversation.aiReplies ?? 0) + 1,
    collected,
    ...crm,
  })
  return {
    action: 'send' as const,
    messageId: message.id,
    send: textMessage(conversation.waId, conversation.phoneNumberId, text),
    notify: await handoffNotice(conversation, collected),
  }
}

/** Saves what arrived and decides who answers it. */
export async function handleInbound(input: InboundMessage) {
  const payload = await cms()

  const duplicate = await payload.find({
    collection: 'conversation-messages',
    where: { waMessageId: { equals: input.waMessageId } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  })
  if (duplicate.docs.length) return { action: 'none' as const }

  const now = new Date().toISOString()
  const { docs } = await payload.find({
    collection: 'conversations',
    where: { waId: { equals: input.waId } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  })

  const shared = {
    phoneNumberId: input.phoneNumberId,
    profileName: input.profileName,
    lastMessageAt: now,
    lastInboundAt: now,
    lastPreview: preview(input.text),
  }
  const conversation = docs[0]
    ? await payload.update({
        collection: 'conversations',
        id: docs[0].id,
        overrideAccess: true,
        data: { ...shared, unread: (docs[0].unread ?? 0) + 1 },
      })
    : await payload.create({
        collection: 'conversations',
        overrideAccess: true,
        data: { ...shared, waId: input.waId, status: 'agente', unread: 1, aiReplies: 0, sessionStart: now },
      })

  await payload.create({
    collection: 'conversation-messages',
    overrideAccess: true,
    data: { conversation: conversation.id, sender: 'cliente', text: input.text, waMessageId: input.waMessageId },
  })

  // With a person in charge, the agent stays silent and the message just waits in the panel.
  if (conversation.status !== 'agente') return { action: 'none' as const }

  const status = businessStatus()
  const collected = collectedOf(conversation)

  if ((conversation.aiReplies ?? 0) >= MAX_AI_REPLIES) {
    return handoff(payload, conversation, collected, fallbackReply(status))
  }

  return {
    action: 'llm' as const,
    conversationId: conversation.id,
    llm: buildLlmRequest({
      knowledge: await buildKnowledge(payload),
      status,
      collected,
      history: await loadHistory(payload, conversation),
    }),
  }
}

/** Applies the model's answer. If it failed or made no sense, a person takes over. */
export async function handleAgentResult(conversationId: number, response: unknown) {
  const payload = await cms()
  const conversation = await payload.findByID({
    collection: 'conversations',
    id: conversationId,
    depth: 0,
    overrideAccess: true,
  })

  // Someone took control while the model was answering: that person's word comes first.
  if (conversation.status !== 'agente') return { action: 'none' as const }

  const output = parseAgentOutput(response)
  const previous = collectedOf(conversation)

  if (!output) return handoff(payload, conversation, previous, fallbackReply(businessStatus()))

  const collected = mergeCollected(previous, output.collected)
  if (output.handoff) return handoff(payload, conversation, collected, output.reply)

  const crm = await syncCrm(payload, conversation, collected, false)
  const message = await saveReply(payload, conversation, output.reply, 'agente', {
    aiReplies: (conversation.aiReplies ?? 0) + 1,
    collected,
    ...crm,
  })
  return {
    action: 'send' as const,
    messageId: message.id,
    send: textMessage(conversation.waId, conversation.phoneNumberId, output.reply),
    notify: null,
  }
}

/** Meta didn't accept a message: it's marked in the panel and a person takes over. */
export async function handleSendFailure(messageId: number) {
  const payload = await cms()
  const message = await payload.update({
    collection: 'conversation-messages',
    id: messageId,
    overrideAccess: true,
    data: { failed: true },
  })
  const id = typeof message.conversation === 'object' ? message.conversation.id : message.conversation
  await payload.update({
    collection: 'conversations',
    id,
    overrideAccess: true,
    data: { status: 'derivada', handoffAt: new Date().toISOString() },
  })
}

export { textMessage, saveReply }
