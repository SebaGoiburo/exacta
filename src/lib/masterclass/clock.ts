/*
 * The masterclass reminders' clock: every 10 minutes the site checks whether a reminder is due (24 hours or 1 hour
 * before a class). It lives in the site itself, so it needs nothing else running. There is one web server, so one
 * clock; each enrollment records the reminders it got, so a restart never sends one twice.
 */

const EVERY_MS = 10 * 60 * 1000
let started = false

async function tick() {
  try {
    const { sendReminders } = await import('./service')
    const { sent } = await sendReminders()
    if (sent) console.log(`[masterclass] ${sent} reminder(s) sent`)
  } catch (err) {
    console.error('[masterclass] reminders failed', err)
  }
}

export function startReminderClock() {
  if (started) return
  started = true
  console.log('[masterclass] reminder clock started')
  // A minute after start, so the server is ready; then every ten minutes.
  setTimeout(() => {
    void tick()
    setInterval(() => void tick(), EVERY_MS).unref()
  }, 60 * 1000).unref()
}
