import type { Locale } from '@/i18n/routing'
import { site, whatsappLink } from './site'

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`)

function shell(body: string) {
  return `<!doctype html><html><body style="margin:0;background:#f3f5f8;padding:32px 16px;font-family:Arial,Helvetica,sans-serif;color:#16202c"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:8px"><tr><td style="padding:36px 32px;font-size:16px;line-height:1.6">${body}<p style="margin:32px 0 0;padding-top:20px;border-top:1px solid #e8ecf1;font-size:13px;color:#46566a">Exacta Transformación Digital · ${esc(site.city)}<br>${esc(site.email)}</p></td></tr></table></body></html>`
}

const button = (href: string, label: string) =>
  `<p style="margin:28px 0"><a href="${esc(href)}" style="display:inline-block;background:#a63fa2;color:#ffffff;text-decoration:none;font-weight:bold;padding:13px 22px;border-radius:999px">${esc(label)}</a></p>`

const first = (name: string) => esc(name.trim().split(/\s+/)[0] ?? '')

type Message = { subject: string; html: string }

export function diagnosticEmail(a: {
  locale: Locale
  name: string
  resultUrl: string
  maturity: number
  bookingUrl?: string | null
  /** Only leads that fit the profile are invited to book. */
  invite: boolean
}): Message {
  const es = a.locale === 'es'
  const invite = a.invite
    ? `<p>${es ? 'Si querés, revisamos juntos qué conviene resolver primero en tu caso.' : 'If you like, we can go over what to solve first in your case.'}</p>${button(
        a.bookingUrl ||
          whatsappLink(es ? 'Hola, completé el diagnóstico y quiero conversar.' : 'Hi, I completed the assessment and would like to talk.'),
        es ? 'Agendar una reunión' : 'Book a meeting',
      )}`
    : ''

  return {
    subject: es ? `Tu diagnóstico: ${a.maturity}/100` : `Your assessment: ${a.maturity}/100`,
    html: shell(
      `<p>${es ? 'Hola' : 'Hi'} ${first(a.name)},</p><p>${
        es
          ? `Gracias por completar el diagnóstico. Tu operación marcó <strong>${a.maturity} sobre 100</strong>. La lectura completa, con el detalle por área y por dónde empezar, queda disponible en este enlace:`
          : `Thanks for completing the assessment. Your operation scored <strong>${a.maturity} out of 100</strong>. The full reading, with detail by area and where to start, is available here:`
      }</p>${button(a.resultUrl, es ? 'Ver mi lectura' : 'See my reading')}${invite}`,
    ),
  }
}

export function contactEmail(a: { locale: Locale; name: string }): Message {
  const es = a.locale === 'es'
  return {
    subject: es ? 'Recibimos tu consulta' : 'We received your inquiry',
    html: shell(
      `<p>${es ? 'Hola' : 'Hi'} ${first(a.name)},</p><p>${
        es
          ? 'Gracias por escribirnos. Ya tenemos tu consulta y una persona de nuestro equipo te va a responder.'
          : 'Thanks for reaching out. We have your inquiry and someone from our team will get back to you.'
      }</p>`,
    ),
  }
}

/** Internal notice for the team. */
export function teamNotice(a: { title: string; lines: [string, string | number | undefined | null][]; url: string }): Message {
  const rows = a.lines
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .map(
      ([k, v]) =>
        `<tr><td style="padding:4px 16px 4px 0;color:#46566a">${esc(k)}</td><td style="padding:4px 0"><strong>${esc(String(v))}</strong></td></tr>`,
    )
    .join('')
  return {
    subject: a.title,
    html: shell(
      `<p><strong>${esc(a.title)}</strong></p><table role="presentation" cellpadding="0" cellspacing="0" style="font-size:15px">${rows}</table>${button(a.url, 'Abrir en el panel')}`,
    ),
  }
}
