const WINDOW_MS = 10 * 60 * 1000
const buckets = new Map<string, number[]>()

/** Per-instance limit: enough to stop one client hammering a public form. */
export function rateLimited(key: string, limit = 5) {
  const now = Date.now()
  const recent = (buckets.get(key) ?? []).filter((t) => now - t < WINDOW_MS)
  recent.push(now)
  buckets.set(key, recent)
  return recent.length > limit
}

export const clientIp = (req: Request) => req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
