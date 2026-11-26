/** Runs once when the server starts. Only the Node.js server in production starts the masterclass reminders. */
export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs' || process.env.NODE_ENV !== 'production') return
  const { startReminderClock } = await import('./lib/masterclass/clock')
  startReminderClock()
}
