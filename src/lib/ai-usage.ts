import type { Payload } from 'payload'

/*
 * What every call to Claude cost, written down as it happens, so the team sees the month's spend
 * in the panel without opening the Anthropic console. Prices are Anthropic's list prices (2026-11).
 */

export const AI_FEATURES = ['prospectos', 'whatsapp', 'contenido'] as const
export type AiFeature = (typeof AI_FEATURES)[number]

type Usage = {
  input_tokens?: number
  output_tokens?: number
  cache_creation_input_tokens?: number
  cache_read_input_tokens?: number
  server_tool_use?: { web_search_requests?: number }
}

/** US$ per million tokens. */
const PRICES: Record<string, { input: number; cacheWrite: number; cacheRead: number; output: number }> = {
  'claude-sonnet-5-5': { input: 2, cacheWrite: 2.5, cacheRead: 0.1, output: 10 },
  'claude-haiku-5-5': { input: 0.1, cacheWrite: 0.125, cacheRead: 0.01, output: 0.5 },
}
const SEARCH_USD = 0.01
/** The Batch API charges half for tokens; searches cost the same. */
const BATCH_DISCOUNT = 0.5

/** Any model answer as it arrives: only `model` and `usage` are read. */
type Response = { model?: string; usage?: Usage } | null | undefined
const asResponse = (r: unknown) => (r && typeof r === 'object' ? (r as NonNullable<Response>) : null)

/** An unknown model is priced as Sonnet, the most expensive one we use, so the spend is never understated. */
const pricesFor = (model?: string) => PRICES[Object.keys(PRICES).find((k) => model?.startsWith(k)) ?? 'claude-sonnet-5-5']

export function costOf(answer: unknown, opts: { batch?: boolean } = {}) {
  const response = asResponse(answer)
  const u = response?.usage ?? {}
  const p = pricesFor(response?.model)
  const tokens =
    ((u.input_tokens ?? 0) * p.input +
      (u.cache_creation_input_tokens ?? 0) * p.cacheWrite +
      (u.cache_read_input_tokens ?? 0) * p.cacheRead +
      (u.output_tokens ?? 0) * p.output) /
    1_000_000
  const usd = tokens * (opts.batch ? BATCH_DISCOUNT : 1) + (u.server_tool_use?.web_search_requests ?? 0) * SEARCH_USD
  return Math.round(usd * 10000) / 10000
}

/** Writes down one call and returns its cost. Never throws: bookkeeping can't break the work it measures. */
export async function recordUsage(payload: Payload, feature: AiFeature, answer: unknown, opts: { batch?: boolean } = {}) {
  const response = asResponse(answer)
  const cost = costOf(response, opts)
  const u = response?.usage
  if (!u) return cost
  try {
    await payload.create({
      collection: 'ai-usage',
      overrideAccess: true,
      data: {
        feature,
        model: (response?.model ?? '').slice(0, 60),
        inputTokens: u.input_tokens ?? 0,
        outputTokens: u.output_tokens ?? 0,
        cacheWriteTokens: u.cache_creation_input_tokens ?? 0,
        cacheReadTokens: u.cache_read_input_tokens ?? 0,
        searches: u.server_tool_use?.web_search_requests ?? 0,
        batch: Boolean(opts.batch),
        costUsd: cost,
      },
    })
  } catch (err) {
    console.error('[ai-usage] not recorded', err)
  }
  return cost
}

/** The spend between two dates, per feature. */
export async function spendBetween(payload: Payload, from: Date, to: Date) {
  const { docs } = await payload.find({
    collection: 'ai-usage',
    where: { and: [{ createdAt: { greater_than_equal: from.toISOString() } }, { createdAt: { less_than: to.toISOString() } }] },
    limit: 0,
    pagination: false,
    depth: 0,
    overrideAccess: true,
    select: { feature: true, costUsd: true },
  })
  const byFeature = Object.fromEntries(AI_FEATURES.map((f) => [f, 0])) as Record<AiFeature, number>
  for (const d of docs) byFeature[d.feature as AiFeature] += d.costUsd ?? 0
  const total = Object.values(byFeature).reduce((a, b) => a + b, 0)
  return { total, byFeature, calls: docs.length }
}
