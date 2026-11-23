import { createHmac, timingSafeEqual } from 'node:crypto'

/*
 * Pure helpers for the Instagram auto-replies, kept apart from the database so they can be tested.
 */

/** Uppercase, no accents, single spaces: how keywords are stored and how comments are compared. */
export function normalizeKeyword(text: string) {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9Ñ]+/g, ' ')
    .trim()
}

/**
 * The keyword the text contains as a whole word ("turnos!!" matches TURNOS, "returnos" doesn't). When more than
 * one fits, the longest wins, so "IA PARA PYMES" beats "IA".
 */
export function matchKeyword<T extends { keyword: string }>(text: string, keywords: T[]): T | null {
  const padded = ` ${normalizeKeyword(text)} `
  const found = keywords.filter((k) => k.keyword && padded.includes(` ${normalizeKeyword(k.keyword)} `))
  return found.sort((a, b) => b.keyword.length - a.keyword.length)[0] ?? null
}

/**
 * The link with the campaign marks. On our own site it also carries the opportunity's number, so when the
 * person fills in a form that opportunity gets their details instead of a new one being opened.
 */
export function linkWithRef(link: string, a: { keyword: string; leadId?: number | null; siteUrl: string }) {
  let url: URL
  try {
    url = new URL(link)
  } catch {
    return link
  }
  const own = (() => {
    try {
      return url.hostname.replace(/^www\./, '') === new URL(a.siteUrl).hostname.replace(/^www\./, '')
    } catch {
      return false
    }
  })()
  url.searchParams.set('utm_source', 'instagram')
  url.searchParams.set('utm_medium', 'dm')
  url.searchParams.set('utm_campaign', a.keyword.toLowerCase().replace(/\s+/g, '-'))
  if (own && a.leadId) url.searchParams.set('utm_content', `ig-${a.leadId}`)
  return url.toString()
}

/** The opportunity number a form's campaign marks point to, if the person came from an Instagram reply. */
export function instagramLeadRef(utmContent?: string | null) {
  const match = /^ig-(\d{1,10})$/.exec(utmContent ?? '')
  return match ? Number(match[1]) : null
}

/** The private message: the team's text and the link at the end. Instagram cuts messages at 1000 characters. */
export function replyText(message: string, link?: string | null) {
  const text = message.trim()
  return (link ? `${text}\n\n${link}` : text).slice(0, 1000)
}

/**
 * Whether Meta signed the body. Meta's docs don't settle which secret signs Instagram Login webhooks, the
 * Instagram app's or the Meta app's, so either one is accepted: both belong to our own app.
 */
export function validSignature(raw: string, header: string | null, secrets: string[]) {
  const received = Buffer.from(header ?? '')
  return secrets.filter(Boolean).some((secret) => {
    const expected = Buffer.from(`sha256=${createHmac('sha256', secret).update(raw).digest('hex')}`)
    return received.length === expected.length && timingSafeEqual(received, expected)
  })
}
