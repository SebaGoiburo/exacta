/** Campaign data sent with each lead. Whitelisted on the server so forms can't store arbitrary keys. */
export const ATTRIBUTION_KEYS = [
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_term',
  'utm_content',
  'gclid',
  'fbclid',
  'fbp',
  'fbc',
  'landing',
  'referrer',
] as const

export type Attribution = Partial<Record<(typeof ATTRIBUTION_KEYS)[number], string>> & { consent?: boolean }

export function cleanAttribution(value: unknown): Attribution {
  if (!value || typeof value !== 'object') return {}
  const input = value as Record<string, unknown>
  const out: Attribution = { consent: input.consent === true }
  for (const key of ATTRIBUTION_KEYS) {
    const item = input[key]
    if (typeof item === 'string' && item) out[key] = item.slice(0, 300)
  }
  return out
}
