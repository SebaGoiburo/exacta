import { getPayload, type Payload } from 'payload'
import config from '@payload-config'
import { businessStatus } from '@/lib/business-hours'
import { getFaqs, getProducts } from '@/lib/content'
import { publicUrl } from '@/lib/leads'
import { getSettings } from '@/lib/settings'
import { site } from '@/lib/site'
import messages from '@/messages/es.json'
import type { Conversation } from '@/payload-types'
import { randomBytes } from 'node:crypto'
import { MAX_AUDIO_SECONDS, transcribe, type Transcription } from './transcribe'
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
/** Model replies across all conversations in 24 hours: a ceiling on what a flood of messages can cost. */
const MAX_AI_PER_DAY = 300
/** More messages than this from one number in two minutes is a bot, not a person typing. */
const BURST_MESSAGES = 10
const BURST_WINDOW_MS = 2 * 60 * 1000
const VOICE_NOTE_DAYS = 30
const NOTIFY_GAP_MS = 30 * 60 * 1000
const DAY_MS = 24 * 60 * 60 * 1000

/** Template that reopens a conversation after WhatsApp's 24-hour window. Meta approves its exact text. */
export const RECONTACT_TEMPLATE = 'retomar_conversacion'
export const RECONTACT_TEXT =
  'Hola, te escribimos de Exacta por el mensaje que nos dejaste. ¿Seguís necesitando ayuda? Contanos por acá y te respondemos.'

const VENDOR_REPLY = `Gracias por escribirnos. Por este canal atendemos solo a empresas que buscan nuestros servicios. Si querés acercarnos una propuesta, mandala a ${site.email} y la revisamos.`
const JOB_REPLY = `Gracias por tu interés en trabajar con nosotros. Por este canal no recibimos postulaciones: mandanos tu CV a ${site.email} y lo tenemos en cuenta.`
const FILE_REPLY = `Por este canal no recibimos fotos ni archivos. Si querés compartirnos algo, mandalo a ${site.email}. Y si preferís, contanos por acá en un mensaje de texto o de audio.`
const AUDIO_TOO_LONG_REPLY = `Recibimos tu audio, pero es muy largo para escucharlo por acá. ¿Nos contás qué necesitás en un mensaje de texto o en un audio de menos de ${MAX_AUDIO_SECONDS / 60} minutos?`

export const cms = () => getPayload({ config })

const preview = (text: string) => text.slice(0, PREVIEW_LENGTH)

export type InboundMessage = {
  waId: string
  phoneNumberId: string
  profileName?: string
  waMessageId: string
  /** The text, or a file's caption. Empty for voice notes. */
  text: string
  /** 'otro': Meta said something arrived but didn't send anything we can read. */
  kind: 'texto' | 'audio' | 'archivo' | 'otro'
  /** The voice note as n8n downloaded it from Meta. Null if the download failed. */
  audio?: { data: Buffer; mimeType: string } | null
  /** The message type as Meta names it, and the reason it gives when it doesn't deliver the content. */
  metaType?: string
  metaDetail?: string
}

/** What the agent and the team read when the content didn't arrive. */
const UNSEEN_LABEL: Record<string, string> = {
  unsupported:
    'un mensaje que WhatsApp no entrega por la API (de ver una sola vez, una encuesta, un mensaje editado u otro similar)',
  unknown: 'un mensaje de un tipo que WhatsApp no identifica',
  location: 'una ubicación',
  contacts: 'un contacto',
  order: 'un pedido de catálogo',
  system: 'un aviso del sistema de WhatsApp',
}

/** Recorded, but nobody needs to answer them. */
const SILENT_TYPES = ['reaction', 'request_welcome']

function unseenText(input: InboundMessage) {
  if (input.metaType === 'reaction') return input.text ? `[Reaccionó con ${input.text}]` : '[Quitó una reacción]'
  if (input.metaType === 'request_welcome') return '[Abrió el chat por primera vez]'
  const label = UNSEEN_LABEL[input.metaType ?? ''] ?? `un mensaje de tipo "${input.metaType ?? 'desconocido'}"`
  return `[La persona envió ${label}. No podés verlo: pedile que lo escriba.]`
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
    notifiedAt: new Date().toISOString(),
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

/** Keeps the voice note for the team to listen to. Its name never carries anything from WhatsApp. */
async function saveVoiceNote(payload: Payload, input: InboundMessage) {
  if (!input.audio) return null
  const type = input.audio.mimeType.split(';')[0].trim()
  const ext = type.includes('ogg') ? 'ogg' : type.includes('amr') ? 'amr' : 'audio'
  try {
    const doc = await payload.create({
      collection: 'voice-notes',
      overrideAccess: true,
      data: { waMessageId: input.waMessageId },
      file: {
        data: input.audio.data,
        mimetype: type,
        name: `audio-${Date.now()}-${randomBytes(4).toString('hex')}.${ext}`,
        size: input.audio.data.length,
      },
    })
    return doc.id
  } catch (err) {
    console.error('[whatsapp] voice note not saved', err)
    return null
  }
}

let lastCleanup = 0

/** Voice notes are deleted after 30 days; their transcription stays with the message. */
function cleanupVoiceNotes(payload: Payload) {
  if (Date.now() - lastCleanup < 6 * 60 * 60 * 1000) return
  lastCleanup = Date.now()
  payload
    .delete({
      collection: 'voice-notes',
      where: { createdAt: { less_than: new Date(Date.now() - VOICE_NOTE_DAYS * DAY_MS).toISOString() } },
      overrideAccess: true,
    })
    .catch((err) => console.error('[whatsapp] voice note cleanup failed', err))
}

type AudioProblem = Extract<Transcription, { ok: false }>['reason']

const AUDIO_PROBLEM: Record<AudioProblem, string> = {
  too_long: 'Audio de más de 3 minutos, sin transcribir',
  unsupported: 'Audio en un formato que no se puede transcribir',
  empty: 'Audio sin palabras reconocibles',
  failed: 'Audio que no se pudo transcribir',
}

type DiscardReason = NonNullable<Conversation['discardReason']>

const discardData = (reason: DiscardReason) => ({
  status: 'descartada' as const,
  discardReason: reason,
  discardedAt: new Date().toISOString(),
  unread: 0,
})

async function discard(payload: Payload, conversation: Conversation, reason: DiscardReason) {
  await payload.update({ collection: 'conversations', id: conversation.id, overrideAccess: true, data: discardData(reason) })
}

/** A fixed message from the agent, without asking the model. */
async function fixedReply(payload: Payload, conversation: Conversation, text: string, data: Partial<Conversation> = {}) {
  const message = await saveReply(payload, conversation, text, 'agente', data)
  return {
    action: 'send' as const,
    messageId: message.id,
    send: textMessage(conversation.waId, conversation.phoneNumberId, text),
    notify: null,
  }
}

async function isBurst(payload: Payload, conversationId: number) {
  const recent = await payload.count({
    collection: 'conversation-messages',
    where: {
      and: [
        { conversation: { equals: conversationId } },
        { sender: { equals: 'cliente' } },
        { createdAt: { greater_than: new Date(Date.now() - BURST_WINDOW_MS).toISOString() } },
      ],
    },
    overrideAccess: true,
  })
  return recent.totalDocs > BURST_MESSAGES
}

async function overDailyLimit(payload: Payload) {
  const today = await payload.count({
    collection: 'conversation-messages',
    where: { and: [{ sender: { equals: 'agente' } }, { createdAt: { greater_than: new Date(Date.now() - DAY_MS).toISOString() } }] },
    overrideAccess: true,
  })
  return today.totalDocs >= MAX_AI_PER_DAY
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
  // Discarded conversations are only recorded: no transcription, no model, no notice.
  const discarded = docs[0]?.status === 'descartada'
  // A reaction or an opened chat is kept in the thread, but doesn't count as a new message.
  const silent = input.kind === 'otro' && SILENT_TYPES.includes(input.metaType ?? '')

  let text = input.text
  let transcribed = false
  let audioId: number | null = null
  let audioProblem: AudioProblem | null = null
  if (input.kind === 'audio') {
    if (discarded) {
      text = '[Audio]'
    } else if (!input.audio) {
      audioProblem = 'failed'
      text = '[Audio que no se pudo descargar de WhatsApp]'
    } else {
      const [result, saved] = await Promise.all([transcribe(input.audio.data, input.audio.mimeType), saveVoiceNote(payload, input)])
      audioId = saved
      if (result.ok) {
        text = result.text
        transcribed = true
      } else {
        audioProblem = result.reason
        text = `[${AUDIO_PROBLEM[result.reason]}]`
      }
    }
  } else if (input.kind === 'archivo') {
    text = input.text ? `${input.text}\n[Envió además una imagen o un archivo que no podés ver]` : '[Imagen o archivo]'
  } else if (input.kind === 'otro') {
    text = unseenText(input)
  }

  const shared = {
    phoneNumberId: input.phoneNumberId,
    profileName: input.profileName,
    lastMessageAt: now,
    lastInboundAt: now,
    lastPreview: preview(input.kind === 'audio' ? `Audio: ${text}` : text),
  }
  const conversation = docs[0]
    ? await payload.update({
        collection: 'conversations',
        id: docs[0].id,
        overrideAccess: true,
        data: { ...shared, unread: discarded ? 0 : (docs[0].unread ?? 0) + (silent ? 0 : 1) },
      })
    : await payload.create({
        collection: 'conversations',
        overrideAccess: true,
        data: { ...shared, waId: input.waId, status: 'agente', unread: silent ? 0 : 1, aiReplies: 0, sessionStart: now },
      })

  await payload.create({
    collection: 'conversation-messages',
    overrideAccess: true,
    data: {
      conversation: conversation.id,
      sender: 'cliente',
      text,
      kind: input.kind,
      audio: audioId,
      transcribed,
      metaType: input.metaType ?? null,
      metaDetail: input.metaDetail ?? null,
      waMessageId: input.waMessageId,
    },
  })
  cleanupVoiceNotes(payload)

  if (silent) return { action: 'none' as const }

  // With a person in charge, the agent stays silent. The advisor's phone gets a notice, at most every 30 minutes.
  if (conversation.status === 'humano' || conversation.status === 'derivada') {
    const last = conversation.notifiedAt ? Date.parse(conversation.notifiedAt) : 0
    if (Date.now() - last < NOTIFY_GAP_MS) return { action: 'none' as const }
    const notify = await handoffNotice(conversation, collectedOf(conversation))
    if (notify) {
      await payload.update({ collection: 'conversations', id: conversation.id, overrideAccess: true, data: { notifiedAt: now } })
    }
    return { action: 'none' as const, notify }
  }
  if (conversation.status !== 'agente') return { action: 'none' as const }

  if (await isBurst(payload, conversation.id)) {
    await discard(payload, conversation, 'rafaga')
    return { action: 'none' as const }
  }

  const status = businessStatus()
  const collected = collectedOf(conversation)

  if (audioProblem === 'too_long') return fixedReply(payload, conversation, AUDIO_TOO_LONG_REPLY)
  // Someone has to listen to it: the voice note is in the panel.
  if (audioProblem) return handoff(payload, conversation, collected, fallbackReply(status))

  if (input.kind === 'archivo' && !input.text) {
    const { docs: last } = await payload.find({
      collection: 'conversation-messages',
      where: { and: [{ conversation: { equals: conversation.id } }, { sender: { equals: 'agente' } }] },
      sort: '-createdAt',
      limit: 1,
      depth: 0,
      overrideAccess: true,
    })
    // Said once is enough: a second photo in a row doesn't get the same message again.
    if (last[0]?.text === FILE_REPLY) return { action: 'none' as const }
    return fixedReply(payload, conversation, FILE_REPLY)
  }

  if ((conversation.aiReplies ?? 0) >= MAX_AI_REPLIES || (await overDailyLimit(payload))) {
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

  // Vendors, job seekers and spam don't reach the team or the CRM. An open opportunity is never discarded.
  if (output.intent !== 'cliente' && !conversation.lead) {
    if (output.intent === 'spam') {
      await discard(payload, conversation, 'spam')
      return { action: 'none' as const }
    }
    return fixedReply(payload, conversation, output.intent === 'proveedor' ? VENDOR_REPLY : JOB_REPLY, discardData(output.intent))
  }

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
