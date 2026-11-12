import { getPayload, type Payload } from 'payload'
import config from '@payload-config'
import { cases } from '@/content/cases'
import { landingPath, landings } from '@/content/landings'
import { products } from '@/content/products'
import { sendToN8n } from '@/lib/n8n'
import { readSearchData, type SearchData } from './google'
import {
  blogRequest,
  cleanTopic,
  ideaRequest,
  parseOutput,
  socialRequest,
  topicsRequest,
  unreadableReason,
  urlsSeen,
  type EngineContext,
  type ModelResponse,
  type TopicOutput,
} from './prompts'

const MAX_CONTINUATIONS = 5
/** A run with no answer after this long is over: n8n's own limit is shorter. */
export const STALE_MS = 15 * 60 * 1000

export const cms = () => getPayload({ config })

type JobKind = 'topics' | 'idea' | 'blog' | 'social'
type Article = { title: string; excerpt: string; markdown: string }
type Social = {
  video: { title: string; description: string; script: string }
  shorts: { title: string; script: string }[]
  linkedinArticle: { title: string; body: string }
  linkedinPosts: { title: string; body: string }[]
}

export function offerText() {
  const pages = landings.map((l) => `- ${l.name.es} (${landingPath(l)}): ${l.lead.es}`).join('\n')
  const owned = products.map((p) => `- ${p.name}: ${p.body.es} Para: ${p.audience.es}.`).join('\n')
  const stories = cases
    .filter((c) => !c.placeholder)
    .map((c) => `- ${c.client}, ${c.role.es}: ${c.metric.before.es} a ${c.metric.after.es}, ${c.metric.label.es}. ${c.solution.es}`)
    .join('\n')
  return `Páginas de servicio y de industria:\n${pages}\n\nProductos propios:\n${owned}\n\nCasos publicados:\n${stories}\n\nPrimer paso que ofrecemos: diagnóstico online gratuito en /diagnostico.`
}

async function buildContext(payload: Payload) {
  const settings = await payload.findGlobal({ slug: 'settings', overrideAccess: true })
  const { docs } = await payload.find({
    collection: 'posts',
    where: { origin: { not_equals: 'sample' } },
    limit: 100,
    depth: 0,
    overrideAccess: true,
    select: { title: true },
  })
  const context: EngineContext = {
    themes: settings.contentThemes || 'Transformación digital, desarrollo de software e IA aplicada a empresas.',
    priorities: settings.contentPriorities || '',
    reader: settings.contentReader || '',
    offer: offerText(),
    existing: docs.map((d) => d.title as string),
  }
  return { context, settings }
}

async function dispatch(payload: Payload, jobId: number, request: unknown) {
  const url = process.env.N8N_CONTENT_URL
  try {
    if (!url) throw new Error('N8N_CONTENT_URL is not set')
    await sendToN8n(url, 'content.run', { jobId, request })
  } catch (err) {
    console.error('[content] dispatch failed', err)
    await fail(payload, jobId, 'No se pudo iniciar la ejecución en n8n.')
  }
}

async function createJob(
  payload: Payload,
  a: { kind: JobKind; request: object; topic?: number; idea?: string; dataUsed?: SearchData },
) {
  const job = await payload.create({
    collection: 'content-jobs',
    overrideAccess: true,
    data: {
      kind: a.kind,
      status: 'running',
      topic: a.topic,
      idea: a.idea,
      request: a.request as Record<string, unknown>,
      dataUsed: a.dataUsed as unknown as Record<string, unknown>,
      sourcesSeen: [],
      continuations: 0,
    },
  })
  await dispatch(payload, job.id, a.request)
  return job
}

export async function proposeTopics(focus?: string) {
  const payload = await cms()
  const { context, settings } = await buildContext(payload)
  const dataUsed = await readSearchData(settings)
  return createJob(payload, { kind: 'topics', request: topicsRequest(context, dataUsed, focus), dataUsed })
}

export async function analyzeIdea(idea: string) {
  const payload = await cms()
  const { context, settings } = await buildContext(payload)
  const dataUsed = await readSearchData(settings)
  return createJob(payload, { kind: 'idea', idea, request: ideaRequest(context, dataUsed, idea), dataUsed })
}

export async function generatePieces(topicId: number) {
  const payload = await cms()
  const topic = await payload.findByID({ collection: 'content-topics', id: topicId, depth: 0, overrideAccess: true })
  const { context } = await buildContext(payload)
  await payload.update({ collection: 'content-topics', id: topicId, overrideAccess: true, data: { status: 'generando' } })
  return createJob(payload, {
    kind: 'blog',
    topic: topicId,
    request: blogRequest(context, topic.analysis as unknown as TopicOutput),
  })
}

async function fail(payload: Payload, jobId: number, error: string) {
  const job = await payload.update({
    collection: 'content-jobs',
    id: jobId,
    overrideAccess: true,
    data: { status: 'failed', error: error.slice(0, 500), request: null },
  })
  const topicId = typeof job.topic === 'object' ? job.topic?.id : job.topic
  if (topicId) {
    await payload.update({ collection: 'content-topics', id: topicId, overrideAccess: true, data: { status: 'propuesto' } })
  }
}

const finish = (payload: Payload, jobId: number) =>
  payload.update({ collection: 'content-jobs', id: jobId, overrideAccess: true, data: { status: 'done', request: null } })

const saveTopic = (
  payload: Payload,
  topic: TopicOutput,
  extra: { origin: 'motor' | 'idea'; idea?: string; verdict?: 'ratificada' | 'rectificada'; reason?: string },
) =>
  payload.create({
    collection: 'content-topics',
    overrideAccess: true,
    data: {
      title: topic.title,
      origin: extra.origin,
      idea: extra.idea,
      verdict: extra.verdict,
      status: 'propuesto',
      score: topic.score,
      service: topic.service,
      analysis: { ...topic, verdictReason: extra.reason } as unknown as Record<string, unknown>,
    },
  })

/** n8n's answer. A paused search continues, and an article leads on to the rest of the pieces. */
export async function handleResult(jobId: number, response: ModelResponse) {
  const payload = await cms()
  const job = await payload.findByID({ collection: 'content-jobs', id: jobId, depth: 0, overrideAccess: true })
  if (job.status !== 'running') return

  if (!Array.isArray(response?.content)) {
    return fail(payload, jobId, response?.error?.message || 'El modelo no respondió.')
  }

  const seen = [...((job.sourcesSeen as string[]) ?? []), ...urlsSeen(response)]

  if (response.stop_reason === 'pause_turn') {
    if ((job.continuations ?? 0) >= MAX_CONTINUATIONS) return fail(payload, jobId, 'La búsqueda no terminó a tiempo.')
    const request = job.request as { messages: { role: string; content: unknown }[] }
    const next = { ...request, messages: [request.messages[0], { role: 'assistant', content: response.content }] }
    await payload.update({
      collection: 'content-jobs',
      id: jobId,
      overrideAccess: true,
      data: { request: next, sourcesSeen: seen, continuations: (job.continuations ?? 0) + 1 },
    })
    return dispatch(payload, jobId, next)
  }

  const data = (job.dataUsed ?? { searchConsole: { status: 'not_connected' }, analytics: { status: 'not_connected' } }) as unknown as SearchData
  const topicId = typeof job.topic === 'object' ? job.topic?.id : job.topic

  if (job.kind === 'topics') {
    const output = parseOutput<{ topics: TopicOutput[] }>(response)
    if (!output?.topics?.length) return fail(payload, jobId, unreadableReason(response))
    for (const topic of output.topics) {
      await saveTopic(payload, cleanTopic(topic, seen, data), { origin: 'motor' })
    }
    return finish(payload, jobId)
  }

  if (job.kind === 'idea') {
    const output = parseOutput<{ verdict: 'ratificada' | 'rectificada'; reason: string; topic: TopicOutput }>(response)
    if (!output?.topic) return fail(payload, jobId, unreadableReason(response))
    await saveTopic(payload, cleanTopic(output.topic, seen, data), {
      origin: 'idea',
      idea: job.idea ?? undefined,
      verdict: output.verdict,
      reason: output.reason,
    })
    return finish(payload, jobId)
  }

  if (!topicId) return fail(payload, jobId, 'La ejecución no tiene tema.')
  const topic = await payload.findByID({ collection: 'content-topics', id: topicId, depth: 0, overrideAccess: true })

  if (job.kind === 'blog') {
    const article = parseOutput<Article>(response)
    if (!article?.markdown) return fail(payload, jobId, unreadableReason(response))
    const post = await payload.create({
      collection: 'posts',
      overrideAccess: true,
      draft: true,
      locale: 'es',
      data: {
        title: article.title,
        excerpt: article.excerpt,
        markdown: article.markdown,
        origin: 'motor',
        _status: 'draft',
      },
    })
    await payload.create({
      collection: 'content-pieces',
      overrideAccess: true,
      data: { topic: topicId, kind: 'blog', title: article.title, body: article.markdown, post: post.id },
    })
    await finish(payload, jobId)
    const { context } = await buildContext(payload)
    await createJob(payload, {
      kind: 'social',
      topic: topicId,
      request: socialRequest(context, topic.analysis as unknown as TopicOutput, article.markdown),
    })
    return
  }

  const social = parseOutput<Social>(response)
  if (!social?.video) return fail(payload, jobId, unreadableReason(response))
  const pieces: { kind: 'video' | 'short' | 'linkedin_article' | 'linkedin_post'; title: string; body: string }[] = [
    { kind: 'video', title: social.video.title, body: `${social.video.script}\n\nDESCRIPCIÓN PARA YOUTUBE\n${social.video.description}` },
    ...social.shorts.map((s) => ({ kind: 'short' as const, title: s.title, body: s.script })),
    { kind: 'linkedin_article', title: social.linkedinArticle.title, body: social.linkedinArticle.body },
    ...social.linkedinPosts.map((p) => ({ kind: 'linkedin_post' as const, title: p.title, body: p.body })),
  ]
  for (const piece of pieces) {
    await payload.create({ collection: 'content-pieces', overrideAccess: true, data: { topic: topicId, ...piece } })
  }
  await payload.update({ collection: 'content-topics', id: topicId, overrideAccess: true, data: { status: 'generado' } })
  return finish(payload, jobId)
}

export { fail as failJob }

/** Runs that never got an answer stop looking busy, and their topic can be tried again. */
export async function closeStaleJobs(payload: Payload) {
  const { docs } = await payload.find({
    collection: 'content-jobs',
    where: { status: { equals: 'running' }, createdAt: { less_than: new Date(Date.now() - STALE_MS).toISOString() } },
    limit: 20,
    depth: 0,
    overrideAccess: true,
  })
  for (const job of docs) await fail(payload, job.id, 'No hubo respuesta a tiempo.')
}
