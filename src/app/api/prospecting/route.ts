import { headers } from 'next/headers'
import { NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'
import { placeContact, placeLabel, placesConfigured, searchPlaces } from '@/lib/places'
import { convertProspect } from '@/lib/prospecting/service'
import { rateLimited } from '@/lib/rate-limit'

/** Each call spends paid Google quota, so even signed-in users have a ceiling. */
const CALLS_PER_WINDOW = 60
const MAX_LABELS = 30

const clean = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '')

/** Prospecting for the panel: search, label saved prospects, reveal contact data, open an opportunity. */
export async function POST(req: Request) {
  const payload = await getPayload({ config })
  const { user } = await payload.auth({ headers: await headers() })
  if (user?.collection !== 'users') return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  if (!placesConfigured()) return NextResponse.json({ error: 'not_configured' }, { status: 503 })
  if (rateLimited(`prospecting:${user.id}`, CALLS_PER_WINDOW)) {
    return NextResponse.json({ error: 'too_many_requests' }, { status: 429 })
  }

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }

  try {
    if (body.action === 'search') {
      const niche = clean(body.niche, 120)
      const zone = clean(body.zone, 120)
      if (!niche || !zone) return NextResponse.json({ error: 'missing_fields' }, { status: 422 })

      const result = await searchPlaces(`${niche} en ${zone}`, clean(body.pageToken, 1000) || undefined)
      const { docs } = await payload.find({
        collection: 'prospects',
        where: { placeId: { in: result.places.map((p) => p.id) } },
        limit: result.places.length,
        depth: 0,
        overrideAccess: true,
      })
      const saved = new Set(docs.map((d) => d.placeId))
      return NextResponse.json({ ...result, places: result.places.map((p) => ({ ...p, saved: saved.has(p.id) })) })
    }

    if (body.action === 'labels') {
      const ids = (Array.isArray(body.ids) ? body.ids : [])
        .filter((id): id is string => typeof id === 'string')
        .slice(0, MAX_LABELS)
      const labels = await Promise.all(ids.map((id) => placeLabel(id).catch(() => null)))
      return NextResponse.json({ labels: labels.filter(Boolean) })
    }

    if (body.action === 'contact') {
      return NextResponse.json({ place: await placeContact(clean(body.id, 300)) })
    }

    // A person already spoke with this company: from here on, it's our own relationship and CRM data.
    if (body.action === 'convert') {
      return NextResponse.json(await convertProspect(Number(body.prospectId), user.id))
    }

    return NextResponse.json({ error: 'unknown_action' }, { status: 400 })
  } catch (err) {
    console.error('[prospecting]', err)
    return NextResponse.json({ error: 'places_failed' }, { status: 502 })
  }
}
