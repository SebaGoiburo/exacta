/** Exacta's service hours. Holidays aren't considered: on those days the agent still says the team is available. */
const TIME_ZONE = 'America/Argentina/Mendoza'
const OPENS_AT = 8 * 60
const CLOSES_AT = 19 * 60 + 30

export const HOURS_TEXT = 'lunes a viernes de 8:00 a 19:30'

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function localTime(now: Date) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: TIME_ZONE,
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(now)
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? ''
  return { day: WEEKDAYS.indexOf(get('weekday')), minutes: Number(get('hour')) * 60 + Number(get('minute')) }
}

export type BusinessStatus = {
  open: boolean
  /** When the team is next available, ready to go in a sentence. Empty while open. */
  nextOpening: string
}

export function businessStatus(now = new Date()): BusinessStatus {
  const { day, minutes } = localTime(now)
  const weekday = day >= 1 && day <= 5

  if (weekday && minutes >= OPENS_AT && minutes < CLOSES_AT) return { open: true, nextOpening: '' }
  if (weekday && minutes < OPENS_AT) return { open: false, nextOpening: 'hoy a las 8:00' }

  // After closing on Monday to Thursday, or on Sunday, the next working day is tomorrow.
  const tomorrow = (weekday && day < 5) || day === 0
  return { open: false, nextOpening: tomorrow ? 'mañana a las 8:00' : 'el lunes a las 8:00' }
}
