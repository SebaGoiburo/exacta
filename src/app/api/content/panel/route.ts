import { headers } from 'next/headers'
import { NextResponse } from 'next/server'
import { googleConnected } from '@/lib/content-engine/google'
import { analyzeIdea, closeStaleJobs, cms, generatePieces, proposeTopics } from '@/lib/content-engine/service'

const MAX_TEXT = 2000

async function signedIn() {
  const payload = await cms()
  const { user } = await payload.auth({ headers: await headers() })
  return user?.collection === 'users' ? payload : null
}

/** What the Contenidos screen shows. */
export async function GET() {
  const payload = await signedIn()
  if (!payload) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  await closeStaleJobs(payload)

  const [topics, pieces, jobs, settings] = await Promise.all([
    payload.find({
      collection: 'content-topics',
      where: { status: { not_equals: 'descartado' } },
      sort: '-createdAt',
      limit: 40,
      depth: 0,
      overrideAccess: true,
    }),
    payload.find({ collection: 'content-pieces', limit: 300, depth: 0, sort: 'createdAt', overrideAccess: true }),
    payload.find({
      collection: 'content-jobs',
      sort: '-createdAt',
      limit: 5,
      depth: 0,
      overrideAccess: true,
      select: { kind: true, status: true, error: true, createdAt: true },
    }),
    payload.findGlobal({ slug: 'settings', overrideAccess: true }),
  ])

  return NextResponse.json({
    topics: topics.docs,
    pieces: pieces.docs,
    jobs: jobs.docs,
    connections: {
      google: googleConnected(),
      searchConsole: Boolean(settings.gscSiteUrl),
      analytics: Boolean(settings.ga4PropertyId),
    },
  })
}

export async function POST(req: Request) {
  const payload = await signedIn()
  if (!payload) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }
  const text = typeof body.text === 'string' ? body.text.trim().slice(0, MAX_TEXT) : ''

  // One run at a time: each one costs money and they would trip over each other.
  const running = await payload.find({
    collection: 'content-jobs',
    where: { status: { equals: 'running' } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  })
  const startsRun = body.action === 'propose' || body.action === 'idea' || body.action === 'generate'
  if (startsRun && running.docs.length) return NextResponse.json({ error: 'busy' }, { status: 409 })

  if (body.action === 'propose') {
    await proposeTopics(text || undefined)
    return NextResponse.json({ ok: true })
  }

  if (body.action === 'idea') {
    if (!text) return NextResponse.json({ error: 'empty' }, { status: 422 })
    await analyzeIdea(text)
    return NextResponse.json({ ok: true })
  }

  const id = Number(body.id)
  if (!id) return NextResponse.json({ error: 'not_found' }, { status: 404 })

  if (body.action === 'generate') {
    await generatePieces(id)
    return NextResponse.json({ ok: true })
  }

  if (body.action === 'discard') {
    await payload.update({ collection: 'content-topics', id, overrideAccess: true, data: { status: 'descartado' } })
    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ error: 'unknown_action' }, { status: 400 })
}
