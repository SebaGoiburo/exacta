import { createHmac } from 'node:crypto'
import { getPayload, type Payload } from 'payload'
import config from '@payload-config'
import type { InstagramAccount, InstagramKeyword, Lead } from '@/payload-types'
import { teamNotice } from '../emails'
import { emitEvent, publicUrl } from '../leads'
import { getSettings } from '../settings'
import { site } from '../site'
import { linkWithRef, loginUrlParts, matchKeyword, replyText } from './keywords'

export { validSignature } from './keywords'

/*
 * Instagram auto-replies with the Instagram API with Unified Login: the setup Meta gives new apps. An admin signs
 * in once through the configuration created in the app, which gives a system user token that doesn't expire.
 * Meta posts comments and direct messages to /api/instagram/webhook; a keyword gets its link by private message
 * (one per comment, Meta's rule) and the person becomes a new opportunity, with source Instagram.
 */

const VERSION = 'v24.0'
const GRAPH = `https://graph.facebook.com/${VERSION}`
const DAY_MS = 24 * 60 * 60 * 1000
/** Past this many replies a day the team stops getting one email each: the pipeline already has them. */
const NOTICES_PER_DAY = 20

export class InstagramError extends Error {}

export const STATE_COOKIE = 'exacta_ig_state'
export const ACCOUNTS_PAGE = '/admin/collections/instagram-accounts'

/**
 * The sign-in URL Meta generates for the configuration (pasted in Ajustes) gives the app and configuration IDs.
 * The secret is the Meta app's, the one WhatsApp already uses, and lives only on the server.
 */
export async function appConfig(payload: Payload) {
  const s = await payload.findGlobal({ slug: 'settings', overrideAccess: true })
  const { appId, configId } = loginUrlParts(s.instagramLoginUrl ?? '')
  return { appId, configId, appSecret: process.env.META_APP_SECRET?.trim() || '' }
}

/** The token Meta's webhook setup asks for. Derived from the site's secret, so there's nothing to store. */
export function webhookVerifyToken() {
  return createHmac('sha256', process.env.PAYLOAD_SECRET || '')
    .update('instagram-webhook')
    .digest('hex')
    .slice(0, 32)
}

export const redirectUri = () => `${publicUrl()}/api/instagram/callback`
export const webhookUrl = () => `${publicUrl()}/api/instagram/webhook`

export function authorizeUrl(a: { appId: string; configId: string }, state: string) {
  const url = new URL(`https://www.facebook.com/${VERSION}/dialog/oauth`)
  url.searchParams.set('client_id', a.appId)
  url.searchParams.set('config_id', a.configId)
  url.searchParams.set('redirect_uri', redirectUri())
  url.searchParams.set('response_type', 'code')
  url.searchParams.set('override_default_response_type', 'true')
  url.searchParams.set('state', state)
  return url.toString()
}

type GraphOptions = { token?: string; method?: 'GET' | 'POST'; query?: Record<string, string>; body?: unknown }

async function graph<T>(path: string, { token, method = 'GET', query, body }: GraphOptions = {}): Promise<T> {
  const target = new URL(`${GRAPH}${path}`)
  for (const [k, v] of Object.entries(query ?? {})) target.searchParams.set(k, v)
  const res = await fetch(target, {
    method,
    headers: {
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...(body ? { 'content-type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(15000),
  })
  const data = (await res.json().catch(() => ({}))) as T & { error?: { message?: string; code?: number } }
  if (!res.ok || data.error) {
    throw new InstagramError(
      `Instagram ${res.status} (${data.error?.code ?? '?'}): ${data.error?.message ?? 'sin detalle'}`.slice(0, 300),
    )
  }
  return data
}

/* ---------- Connecting accounts ---------- */

type DebugToken = {
  data?: { expires_at?: number; scopes?: string[]; granular_scopes?: { scope: string; target_ids?: string[] }[] }
}

/**
 * Turns the code from Meta's sign-in into the token, and connects every Instagram account the admin shared in it
 * (both at once, if both were chosen). Each one is subscribed to comments and messages.
 */
export async function connectAccounts(payload: Payload, code: string) {
  const { appId, configId, appSecret } = await appConfig(payload)
  if (!appId || !configId || !appSecret) throw new InstagramError('not_configured')

  const exchange = await graph<{ access_token?: string }>('/oauth/access_token', {
    query: { client_id: appId, client_secret: appSecret, redirect_uri: redirectUri(), code },
  }).catch(() => ({}) as { access_token?: string })
  const token = exchange.access_token
  if (!token) throw new InstagramError('exchange_failed')

  // The token itself says which Instagram accounts it was given, and whether it expires.
  const debug = await graph<DebugToken>('/debug_token', {
    query: { input_token: token, access_token: `${appId}|${appSecret}` },
  })
  const scopes = debug.data?.scopes ?? []
  if (!['instagram_basic', 'instagram_manage_messages', 'instagram_manage_comments'].every((s) => scopes.includes(s))) {
    throw new InstagramError('missing_permissions')
  }
  const ids = await findInstagramIds(token, debug.data)
  if (!ids.length) throw new InstagramError('no_accounts')
  const expiresAt = debug.data?.expires_at ? new Date(debug.data.expires_at * 1000).toISOString() : null

  const connected: string[] = []
  for (const igId of ids) {
    const profile = await graph<{ id: string; username?: string }>(`/${igId}`, { token, query: { fields: 'id,username' } }).catch(
      (err) => {
        console.error(`[instagram] cannot read account ${igId}`, err)
        return null
      },
    )
    // Not an Instagram account (a Page or an ad account shared in the same sign-in), or one the token can't read.
    if (!profile?.username) continue
    await graph(`/${igId}/subscribed_apps`, { token, method: 'POST', query: { subscribed_fields: 'comments,messages' } })

    const data = { username: profile.username, igId, token, tokenExpiresAt: expiresAt }
    const { docs } = await payload.find({
      collection: 'instagram-accounts',
      where: { igId: { equals: igId } },
      limit: 1,
      overrideAccess: true,
    })
    if (docs[0]) await payload.update({ collection: 'instagram-accounts', id: docs[0].id, data, overrideAccess: true })
    else await payload.create({ collection: 'instagram-accounts', data: { ...data, active: true }, overrideAccess: true })
    connected.push(profile.username)
  }
  if (!connected.length) throw new InstagramError('no_access')
  return connected
}

type Found = { id?: string; username?: string }

/**
 * The Instagram accounts the sign-in shared. Meta doesn't document where the Unified login lists them, so every
 * known place is tried: the token's targets (accounts, Pages or business portfolios), the Pages, and the portfolios.
 * What each place answered goes to the log, without the token, so a failed connection can be diagnosed.
 */
async function findInstagramIds(token: string, debug: DebugToken['data']) {
  const found = new Set<string>()
  const notes: string[] = []
  const ask = async <T>(path: string, fields?: string): Promise<T | null> => {
    try {
      const data = await graph<T>(path, { token, query: fields ? { fields } : {} })
      notes.push(`${path} -> ${JSON.stringify(data).slice(0, 300)}`)
      return data
    } catch (err) {
      notes.push(`${path} -> ${err instanceof Error ? err.message : 'error'}`)
      return null
    }
  }
  const add = (items?: Found[] | null) => items?.forEach((a) => a?.id && a.username && found.add(a.id))

  notes.push(`scopes ${JSON.stringify((debug?.granular_scopes ?? []).map((g) => [g.scope, g.target_ids ?? []]))}`)
  const targets = [...new Set((debug?.granular_scopes ?? []).flatMap((g) => g.target_ids ?? []))]
  for (const target of targets.slice(0, 10)) {
    const node = await ask<Found & { instagram_business_account?: Found }>(
      `/${target}`,
      'id,username,instagram_business_account{id,username}',
    )
    add([node ?? {}, node?.instagram_business_account ?? {}])
    if (!node?.username && !node?.instagram_business_account) {
      add((await ask<{ data?: Found[] }>(`/${target}/instagram_business_accounts`, 'id,username'))?.data)
      add((await ask<{ data?: Found[] }>(`/${target}/owned_instagram_accounts`, 'id,username'))?.data)
    }
  }
  if (!found.size) {
    await ask('/me', 'id,name')
    const pages = await ask<{ data?: { instagram_business_account?: Found }[] }>(
      '/me/accounts',
      'instagram_business_account{id,username}',
    )
    add(pages?.data?.map((p) => p.instagram_business_account ?? {}))
    const businesses = await ask<{ data?: { id: string }[] }>('/me/businesses', 'id,name')
    for (const b of businesses?.data?.slice(0, 5) ?? []) {
      add((await ask<{ data?: Found[] }>(`/${b.id}/instagram_business_accounts`, 'id,username'))?.data)
      add((await ask<{ data?: Found[] }>(`/${b.id}/owned_instagram_accounts`, 'id,username'))?.data)
    }
  }
  console.log(`[instagram] looking for accounts: ${notes.join(' | ')}`.slice(0, 6000))
  return [...found]
}

/* ---------- Webhook ---------- */

type CommentValue = {
  id?: string
  text?: string
  from?: { id?: string; username?: string }
  media?: { id?: string }
}
type MessagingEvent = {
  sender?: { id?: string }
  recipient?: { id?: string }
  message?: { mid?: string; text?: string; is_echo?: boolean; is_deleted?: boolean }
}
type WebhookBody = {
  object?: string
  entry?: { id?: string; changes?: { field?: string; value?: CommentValue }[]; messaging?: MessagingEvent[] }[]
}

/** Runs after Meta already got its 200. Each event is handled on its own, so one failure doesn't stop the rest. */
export async function handleWebhook(body: WebhookBody) {
  if (body.object !== 'instagram') return
  const payload = await getPayload({ config })
  for (const entry of body.entry ?? []) {
    const account = await accountFor(payload, entry.id)
    if (!account) continue
    for (const change of entry.changes ?? []) {
      if (change.field !== 'comments' || !change.value) continue
      await handleComment(payload, account, change.value).catch((err) => console.error('[instagram] comment failed', err))
    }
    for (const event of entry.messaging ?? []) {
      await handleMessage(payload, account, event).catch((err) => console.error('[instagram] message failed', err))
    }
  }
}

async function accountFor(payload: Payload, igId?: string) {
  if (!igId) return null
  const { docs } = await payload.find({
    collection: 'instagram-accounts',
    where: { igId: { equals: igId }, active: { equals: true } },
    limit: 1,
    overrideAccess: true,
  })
  return docs[0]?.token ? docs[0] : null
}

async function keywordsFor(payload: Payload, account: InstagramAccount) {
  const { docs } = await payload.find({
    collection: 'instagram-keywords',
    where: { active: { equals: true } },
    limit: 100,
    depth: 0,
    overrideAccess: true,
  })
  return docs.filter((k) => !k.accounts?.length || k.accounts.some((a) => (typeof a === 'object' ? a.id : a) === account.id))
}

async function handleComment(payload: Payload, account: InstagramAccount, value: CommentValue) {
  const commentId = value.id
  const from = value.from
  // Our own comments, the public replies included, come back through the webhook too.
  if (!commentId || !from?.id || from.id === account.igId || from.username === account.username) return
  const keyword = matchKeyword(value.text ?? '', await keywordsFor(payload, account))
  if (!keyword) return
  if (await answeredRecently(payload, from.id, keyword.id)) return

  const log = await openLog(payload, {
    eventKey: `c:${commentId}`,
    kind: 'comentario',
    username: from.username,
    igUserId: from.id,
    text: value.text,
    keyword: keyword.id,
    account: account.id,
  })
  if (!log) return

  const permalink = value.media?.id
    ? await graph<{ permalink?: string }>(`/${value.media.id}`, { token: account.token!, query: { fields: 'permalink' } })
        .then((m) => m.permalink)
        .catch(() => undefined)
    : undefined
  const lead = await saveInstagramLead(payload, {
    account,
    keyword,
    igUserId: from.id,
    username: from.username,
    text: value.text ?? '',
    kind: 'comentario',
    permalink,
  })

  const error = await sendReply(account, { comment_id: commentId }, keyword, lead.id)
  if (!error && keyword.publicReply?.trim()) {
    await graph(`/${commentId}/replies`, {
      token: account.token!,
      method: 'POST',
      query: { message: keyword.publicReply.trim() },
    }).catch((err) => console.error('[instagram] public reply failed', err))
  }
  await closeLog(payload, log.id, { lead: lead.id, permalink, error })
  await notifyTeam(payload, { account, keyword, username: from.username, text: value.text, lead, error, kind: 'comentario' })
}

async function handleMessage(payload: Payload, account: InstagramAccount, event: MessagingEvent) {
  const senderId = event.sender?.id
  const message = event.message
  if (!senderId || !message?.mid || message.is_echo || message.is_deleted || senderId === account.igId) return
  const text = message.text ?? ''
  const keyword = matchKeyword(text, await keywordsFor(payload, account))

  if (!keyword) {
    await noticeReply(payload, account, senderId, text)
    return
  }
  if (await answeredRecently(payload, senderId, keyword.id)) return

  const profile = await graph<{ username?: string; name?: string }>(`/${senderId}`, {
    token: account.token!,
    query: { fields: 'username,name' },
  }).catch(() => ({}) as { username?: string; name?: string })

  const log = await openLog(payload, {
    eventKey: `m:${message.mid}`,
    kind: 'mensaje',
    username: profile.username,
    igUserId: senderId,
    text,
    keyword: keyword.id,
    account: account.id,
  })
  if (!log) return

  const lead = await saveInstagramLead(payload, {
    account,
    keyword,
    igUserId: senderId,
    username: profile.username,
    name: profile.name,
    text,
    kind: 'mensaje',
  })
  const error = await sendReply(account, { id: senderId }, keyword, lead.id)
  await closeLog(payload, log.id, { lead: lead.id, error })
  await notifyTeam(payload, { account, keyword, username: profile.username, text, lead, error, kind: 'mensaje' })
}

/** The private message with the keyword's text and link. Returns the error to record, or undefined if it went out. */
async function sendReply(
  account: InstagramAccount,
  recipient: { comment_id: string } | { id: string },
  keyword: InstagramKeyword,
  leadId: number,
) {
  const link = keyword.link ? linkWithRef(keyword.link, { keyword: keyword.keyword, leadId, siteUrl: publicUrl() }) : null
  try {
    await graph(`/${account.igId}/messages`, {
      token: account.token!,
      method: 'POST',
      body: { recipient, message: { text: replyText(keyword.message, link) } },
    })
    return undefined
  } catch (err) {
    console.error('[instagram] private reply failed', err)
    return err instanceof Error ? err.message.slice(0, 300) : 'No se pudo enviar'
  }
}

/** A person commenting the same word under three reels gets one message, not three. */
async function answeredRecently(payload: Payload, igUserId: string, keywordId: number) {
  const { totalDocs } = await payload.count({
    collection: 'instagram-replies',
    where: {
      igUserId: { equals: igUserId },
      keyword: { equals: keywordId },
      createdAt: { greater_than: new Date(Date.now() - DAY_MS).toISOString() },
    },
    overrideAccess: true,
  })
  return totalDocs > 0
}

/** Creates the record first: its unique key is what stops Meta's retries from answering twice. */
async function openLog(
  payload: Payload,
  data: {
    eventKey: string
    kind: 'comentario' | 'mensaje'
    username?: string
    igUserId: string
    text?: string
    keyword: number
    account: number
  },
) {
  try {
    return await payload.create({
      collection: 'instagram-replies',
      overrideAccess: true,
      data: { ...data, text: data.text?.slice(0, 2000), status: 'procesando' },
    })
  } catch {
    return null
  }
}

async function closeLog(payload: Payload, id: number, a: { lead: number; permalink?: string; error?: string }) {
  await payload.update({
    collection: 'instagram-replies',
    id,
    overrideAccess: true,
    data: { lead: a.lead, permalink: a.permalink, status: a.error ? 'fallo' : 'enviado', error: a.error },
  })
}

/* ---------- CRM ---------- */

const CLOSED: Lead['stage'][] = ['ganado', 'perdido']

/**
 * The contact by their Instagram ID and their open opportunity, or new ones in the pipeline's first column.
 * Instagram only gives the username: email and phone arrive if they fill in the form behind the link.
 */
async function saveInstagramLead(
  payload: Payload,
  a: {
    account: InstagramAccount
    keyword: InstagramKeyword
    igUserId: string
    username?: string
    name?: string
    text: string
    kind: 'comentario' | 'mensaje'
    permalink?: string
  },
) {
  const handle = a.username ? `@${a.username}` : 'Persona de Instagram'
  const { docs } = await payload.find({
    collection: 'contacts',
    where: a.username
      ? { or: [{ instagramId: { equals: a.igUserId } }, { instagram: { equals: a.username } }] }
      : { instagramId: { equals: a.igUserId } },
    limit: 1,
    overrideAccess: true,
  })
  const contact =
    docs[0] ??
    (await payload.create({
      collection: 'contacts',
      overrideAccess: true,
      data: {
        name: a.name?.trim() || handle,
        instagram: a.username,
        instagramId: a.igUserId,
        source: 'instagram',
      },
    }))

  const did = a.kind === 'comentario' ? `Comentó ${a.keyword.keyword}` : `Escribió ${a.keyword.keyword} por mensaje directo`
  const note = {
    type: 'instagram' as const,
    date: new Date().toISOString(),
    text: `${did} en @${a.account.username}${a.permalink ? ` (${a.permalink})` : ''}: "${a.text.slice(0, 500)}"`,
  }

  const open = await payload.find({
    collection: 'leads',
    where: { contact: { equals: contact.id }, stage: { not_in: CLOSED } },
    sort: '-createdAt',
    limit: 1,
    depth: 0,
    overrideAccess: true,
  })
  if (open.docs[0]) {
    const lead = open.docs[0]
    return payload.update({
      collection: 'leads',
      id: lead.id,
      overrideAccess: true,
      depth: 0,
      data: { activity: [...(lead.activity ?? []), note] },
    })
  }

  return payload.create({
    collection: 'leads',
    overrideAccess: true,
    depth: 0,
    data: {
      title: `${handle} · ${a.keyword.interest || a.keyword.keyword}`,
      contact: contact.id,
      stage: 'nuevo',
      priority: '1',
      source: 'instagram',
      interest: a.keyword.interest || a.keyword.keyword,
      message: a.text.slice(0, 2000),
      page: a.permalink,
      locale: 'es',
      attribution: {
        utm_source: 'instagram',
        utm_medium: a.kind === 'comentario' ? 'comentario' : 'dm',
        utm_campaign: a.keyword.keyword.toLowerCase(),
        utm_content: `@${a.account.username}`,
      },
      activity: [note],
    },
  })
}

async function teamEmail(title: string, lines: [string, string | undefined][], leadId: number) {
  const settings = await getSettings()
  emitEvent('email.send', {
    email: {
      to: settings.leadNotifyEmail || site.email,
      ...teamNotice({ title, lines, url: `${publicUrl()}/admin/collections/leads/${leadId}` }),
    },
  })
}

async function notifyTeam(
  payload: Payload,
  a: {
    account: InstagramAccount
    keyword: InstagramKeyword
    username?: string
    text?: string
    lead: Lead
    error?: string
    kind: 'comentario' | 'mensaje'
  },
) {
  // A reel that takes off shouldn't bury the inbox: failures always go out, the rest up to a daily limit.
  if (!a.error) {
    const { totalDocs } = await payload.count({
      collection: 'instagram-replies',
      where: { createdAt: { greater_than: new Date(Date.now() - DAY_MS).toISOString() } },
      overrideAccess: true,
    })
    if (totalDocs > NOTICES_PER_DAY) return
  }
  const who = a.username ? `@${a.username}` : 'Alguien'
  await teamEmail(
    a.error
      ? `Instagram: no se le pudo mandar el mensaje a ${who}`
      : `Instagram: ${who} ${a.kind === 'comentario' ? 'comentó' : 'escribió'} ${a.keyword.keyword}`,
    [
      ['Cuenta', `@${a.account.username}`],
      [a.kind === 'comentario' ? 'Comentario' : 'Mensaje', a.text],
      [
        'Qué se hizo',
        a.error ? 'No salió el mensaje privado: escribile a mano desde Instagram.' : 'Le llegó el enlace por mensaje privado.',
      ],
      ['Oportunidad', 'Quedó en la columna "Nuevo" del pipeline.'],
    ],
    a.lead.id,
  )
}

/**
 * Someone who already got a reply writes back. The conversation happens in the Instagram app, so the team gets one
 * notice a day per person, and the text is noted in their opportunity.
 */
async function noticeReply(payload: Payload, account: InstagramAccount, senderId: string, text: string) {
  const byId = await payload.find({
    collection: 'contacts',
    where: { instagramId: { equals: senderId } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  })
  let contact = byId.docs[0]
  if (!contact) {
    // Meta's docs don't promise the same ID for someone's comments and their messages: the username settles it.
    const profile = await graph<{ username?: string }>(`/${senderId}`, {
      token: account.token!,
      query: { fields: 'username' },
    }).catch(() => ({}) as { username?: string })
    if (!profile.username) return
    const byName = await payload.find({
      collection: 'contacts',
      where: { instagram: { equals: profile.username } },
      limit: 1,
      depth: 0,
      overrideAccess: true,
    })
    contact = byName.docs[0]
  }
  if (!contact) return
  const day = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString().slice(0, 10)
  try {
    await payload.create({
      collection: 'instagram-replies',
      overrideAccess: true,
      data: {
        eventKey: `r:${senderId}:${day}`,
        kind: 'respuesta',
        status: 'avisado',
        username: contact.instagram ?? undefined,
        igUserId: senderId,
        text: text.slice(0, 2000),
        account: account.id,
      },
    })
  } catch {
    return // Already noticed today.
  }
  const open = await payload.find({
    collection: 'leads',
    where: { contact: { equals: contact.id }, stage: { not_in: CLOSED } },
    sort: '-createdAt',
    limit: 1,
    depth: 0,
    overrideAccess: true,
  })
  const lead = open.docs[0]
  if (!lead) return
  await payload.update({
    collection: 'leads',
    id: lead.id,
    overrideAccess: true,
    data: {
      activity: [
        ...(lead.activity ?? []),
        { type: 'instagram', date: new Date().toISOString(), text: `Respondió por mensaje directo: "${text.slice(0, 500)}"` },
      ],
    },
  })
  await teamEmail(
    `Instagram: ${contact.name} te respondió por mensaje`,
    [
      ['Cuenta', `@${account.username}`],
      ['Mensaje', text || '(una foto, audio o reacción)'],
      ['Qué hacer', 'Contestale desde la app de Instagram: tenés 24 horas para seguir la charla.'],
    ],
    lead.id,
  )
}
