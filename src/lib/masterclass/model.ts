/*
 * Pure rules for selling masterclass seats, kept apart from the database and Mercado Pago so they can be tested.
 */

export const TIME_ZONE = 'America/Argentina/Buenos_Aires'
/** A seat is held this long while the person pays, so two people can't buy the same last seat. */
export const HOLD_MINUTES = 30

export type SeatRules = {
  capacity: number
  releasedSeats?: number | null
  launchSeats?: number | null
  launchPrice?: number | null
  price: number
}

/** What is left and what the next seat costs. Every number here is real: paid seats plus seats being paid. */
export function offer(rules: SeatRules, taken: { total: number; launch: number }) {
  const released = Math.max(0, rules.releasedSeats ?? 0)
  const total = Math.max(0, rules.capacity) + released
  const left = Math.max(0, total - taken.total)
  const launchLeft = rules.launchPrice ? Math.min(left, Math.max(0, (rules.launchSeats ?? 0) - taken.launch)) : 0
  const launch = launchLeft > 0
  return {
    total,
    left,
    released,
    launchLeft,
    soldOut: left === 0,
    tier: launch ? ('lanzamiento' as const) : ('general' as const),
    price: launch ? rules.launchPrice! : rules.price,
    nextPrice: launch ? rules.price : null,
  }
}

export type Offer = ReturnType<typeof offer>

export const pesos = (n: number) => `$${Math.round(n).toLocaleString('es-AR')}`

/** The parts of a date as an Argentine reader says them: "miércoles 9 de diciembre", "MIÉ 9/12", "19 h". */
export function argDate(iso: string) {
  const d = new Date(iso)
  const part = (o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat('es-AR', { timeZone: TIME_ZONE, ...o }).format(d)
  const hour = Number(part({ hour: 'numeric', hourCycle: 'h23' }))
  const minute = part({ minute: '2-digit' }).padStart(2, '0')
  return {
    long: `${part({ weekday: 'long' })} ${part({ day: 'numeric' })} de ${part({ month: 'long' })}`,
    short: `${part({ weekday: 'short' }).replace('.', '').slice(0, 3).toUpperCase()} ${part({ day: 'numeric' })}/${part({ month: 'numeric' })}`,
    time: minute === '00' ? `${hour} h` : `${hour}:${minute} h`,
  }
}

/** Whole days from now until the class, in Argentina's calendar (today = 0). */
export function daysUntil(iso: string, now = new Date()) {
  const day = (d: Date) => new Intl.DateTimeFormat('en-CA', { timeZone: TIME_ZONE }).format(d)
  return Math.round((Date.parse(day(new Date(iso))) - Date.parse(day(now))) / 86400000)
}

const stamp = (d: Date) =>
  d
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}/, '')

export function calendarRange(startsAt: string, durationMin: number) {
  const start = new Date(startsAt)
  return { start: stamp(start), end: stamp(new Date(start.getTime() + durationMin * 60000)) }
}

export function googleCalendarUrl(a: { title: string; startsAt: string; durationMin: number; details: string }) {
  const { start, end } = calendarRange(a.startsAt, a.durationMin)
  const url = new URL('https://calendar.google.com/calendar/render')
  url.searchParams.set('action', 'TEMPLATE')
  url.searchParams.set('text', a.title)
  url.searchParams.set('dates', `${start}/${end}`)
  url.searchParams.set('details', a.details)
  url.searchParams.set('location', 'Google Meet')
  return url.toString()
}

const icsText = (s: string) => s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n')

/** An .ics file any calendar app opens, with a reminder an hour before. */
export function icsFile(a: {
  uid: string
  title: string
  startsAt: string
  durationMin: number
  description: string
  url?: string
}) {
  const { start, end } = calendarRange(a.startsAt, a.durationMin)
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Exacta//IA para Humanos//ES',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${a.uid}`,
    `DTSTAMP:${stamp(new Date())}`,
    `DTSTART:${start}`,
    `DTEND:${end}`,
    `SUMMARY:${icsText(a.title)}`,
    `DESCRIPTION:${icsText(a.description)}`,
    'LOCATION:Google Meet',
    ...(a.url ? [`URL:${a.url}`] : []),
    'BEGIN:VALARM',
    'TRIGGER:-PT60M',
    'ACTION:DISPLAY',
    `DESCRIPTION:${icsText(a.title)}`,
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n')
}

/** Argentine mobile numbers as WhatsApp wants them: country code, a 9, area code and number, digits only. */
export function normalizePhone(raw: string) {
  let digits = raw.replace(/\D/g, '')
  if (digits.startsWith('00')) digits = digits.slice(2)
  if (digits.startsWith('54')) digits = digits.slice(2)
  if (digits.startsWith('9')) digits = digits.slice(1)
  if (digits.startsWith('0')) digits = digits.slice(1)
  // Local numbers are often written with 15 after the area code: 261 15 555 1234.
  const fifteen = /^(\d{2,4})15(\d{6,8})$/.exec(digits)
  if (fifteen && fifteen[1].length + fifteen[2].length === 10) digits = fifteen[1] + fifteen[2]
  return digits.length === 10 ? `549${digits}` : null
}

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
