import { site, whatsappLink } from '../site'
import { argDate, pesos } from './model'

/*
 * The buyer's emails, in IA para Humanos' colours: Ciruela header, Hueso page, Menta button.
 * Email clients ignore web fonts and most CSS, so everything is inline and in safe fonts.
 */

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`)
const first = (name: string) => esc(name.trim().split(/\s+/)[0] ?? '')

type Message = { subject: string; html: string }

export type ClassInfo = {
  title: string
  startsAt: string
  durationMin: number
  meetUrl?: string | null
  calendarUrl: string
  icsUrl: string
}

function shell(body: string) {
  return `<!doctype html><html><body style="margin:0;background:#24122B;padding:28px 12px;font-family:Arial,Helvetica,sans-serif;color:#24122B"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto"><tr><td style="padding:0 4px 18px;color:#8FE3C2;font-family:'Courier New',monospace;font-size:12px;letter-spacing:2px">INTELIGENCIA ARTIFICIAL PARA<br><span style="font-family:Arial,Helvetica,sans-serif;font-size:30px;font-weight:bold;letter-spacing:-1px;color:#F4F0F7">HUMANOS</span></td></tr><tr><td style="background:#F4F0F7;padding:34px 30px;font-size:16px;line-height:1.6">${body}</td></tr><tr><td style="padding:18px 4px;font-size:13px;line-height:1.5;color:#C9B9D2">IA para Humanos es una unidad de Exacta · ${esc(site.city)}<br>¿Dudas? <a href="${esc(whatsappLink('Hola, tengo una duda sobre la masterclass de IA para Humanos'))}" style="color:#8FE3C2">Escribinos por WhatsApp</a> o respondé este mail.</td></tr></table></body></html>`
}

const button = (href: string, label: string) =>
  `<a href="${esc(href)}" style="display:inline-block;background:#8FE3C2;color:#24122B;text-decoration:none;font-weight:bold;padding:14px 22px;margin:0 8px 10px 0">${esc(label)}</a>`

const link = (href: string, label: string) =>
  `<a href="${esc(href)}" style="display:inline-block;color:#A63FA2;font-weight:bold;padding:14px 0">${esc(label)}</a>`

function ticket(info: ClassInfo, seat?: number | null) {
  const d = argDate(info.startsAt)
  const rows: [string, string][] = [
    ['Cuándo', `${d.long}, ${d.time} (hora Argentina)`],
    ['Duración', `${Math.floor(info.durationMin / 60)} h ${info.durationMin % 60 ? `${info.durationMin % 60} min` : ''}`.trim()],
    ['Dónde', 'Google Meet, en vivo'],
    ...(seat ? ([['Tu lugar', `n.º ${seat}`]] as [string, string][]) : []),
  ]
  return `<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:#24122B;color:#F4F0F7;margin:22px 0"><tr><td style="padding:22px 24px"><div style="font-size:20px;font-weight:bold;margin-bottom:12px">${esc(info.title)}</div>${rows
    .map(([k, v]) => `<div style="font-size:15px;line-height:1.7"><span style="color:#9C8AA6">${esc(k)}:</span> ${esc(v)}</div>`)
    .join('')}</td></tr></table>`
}

const meetBlock = (info: ClassInfo) =>
  info.meetUrl
    ? `<p style="margin:0 0 8px"><strong>Enlace de la clase:</strong></p>${button(info.meetUrl, 'Entrar a Google Meet')}`
    : `<p>El enlace de Google Meet te llega por mail el día anterior a la clase.</p>`

export function confirmationEmail(a: { name: string; amount: number; seat?: number | null; info: ClassInfo }): Message {
  return {
    subject: `Tu lugar está reservado: ${a.info.title}`,
    html: shell(
      `<p style="font-size:22px;font-weight:bold;margin:0 0 6px">¡Listo, ${first(a.name)}! Tu lugar está reservado.</p><p style="margin:0">Recibimos tu pago de ${esc(pesos(a.amount))}. Te esperamos en la clase.</p>${ticket(a.info, a.seat)}${meetBlock(a.info)}<p style="margin:18px 0 0">Agendala ahora así no se te pasa:</p><p style="margin:8px 0 0">${button(a.info.calendarUrl, 'Agregar a Google Calendar')}${link(a.info.icsUrl, 'Descargar para otro calendario')}</p><p style="margin:22px 0 6px"><strong>Para la clase vas a necesitar:</strong></p><ul style="margin:0;padding-left:20px"><li>Una computadora, para practicar a la par (también podés seguirla desde el celular).</li><li>Una cuenta de Google gratis, la misma de Gmail.</li><li>Nada más: no hace falta saber de tecnología.</li></ul><p style="margin:22px 0 0">Te mandamos la factura C a este mail en los próximos días. Si en los primeros 30 minutos de la clase sentís que no es para vos, te devolvemos todo.</p><p style="margin:22px 0 0">Te recordamos la clase 24 horas y 1 hora antes.</p><p style="margin:22px 0 0">Sebastián Goiburo</p>`,
    ),
  }
}

export function reminderEmail(a: { name: string; info: ClassInfo; when: '24h' | '1h' }): Message {
  const d = argDate(a.info.startsAt)
  const soon = a.when === '1h'
  return {
    subject: soon ? `En una hora empezamos: ${a.info.title}` : `Mañana a las ${d.time}: ${a.info.title}`,
    html: shell(
      `<p style="font-size:22px;font-weight:bold;margin:0 0 6px">${
        soon ? `${first(a.name)}, en una hora empezamos.` : `${first(a.name)}, mañana es la clase.`
      }</p><p style="margin:0">${
        soon
          ? 'Tené a mano la computadora (o el celular) y tu cuenta de Google. Entrá unos minutos antes para probar el audio.'
          : 'Te dejamos todo lo que necesitás para entrar.'
      }</p>${ticket(a.info)}${meetBlock(a.info)}${soon ? '' : `<p style="margin:8px 0 0">${link(a.info.calendarUrl, 'Agregar a Google Calendar')}</p>`}`,
    ),
  }
}

export function withdrawalEmail(a: { name: string; code: string }): Message {
  return {
    subject: `Recibimos tu pedido de arrepentimiento (${a.code})`,
    html: shell(
      `<p style="font-size:22px;font-weight:bold;margin:0 0 6px">Recibimos tu pedido, ${first(a.name)}.</p><p>Tu código de trámite es <strong>${esc(a.code)}</strong>. Guardalo: lo vas a necesitar si nos querés consultar por el reintegro.</p><p>Te escribimos dentro de las próximas 48 horas hábiles para devolverte el dinero por el mismo medio de pago que usaste.</p>`,
    ),
  }
}
