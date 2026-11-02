/*
 * Google Places API (New). Google allows storing the place ID indefinitely but restricts caching
 * everything else, so names and phones are always requested live and never saved here.
 * Field masks decide the price: contact fields cost more, so they're only requested when needed.
 */

const BASE = 'https://places.googleapis.com/v1'
const CONTACT_FIELDS = ['id', 'displayName', 'formattedAddress', 'websiteUri', 'nationalPhoneNumber', 'googleMapsUri', 'rating', 'userRatingCount']

export type Place = {
  id: string
  name: string
  address?: string
  website?: string
  phone?: string
  mapsUrl?: string
  rating?: number
  reviews?: number
}

type RawPlace = {
  id: string
  displayName?: { text?: string }
  formattedAddress?: string
  websiteUri?: string
  nationalPhoneNumber?: string
  googleMapsUri?: string
  rating?: number
  userRatingCount?: number
}

const toPlace = (p: RawPlace): Place => ({
  id: p.id,
  name: p.displayName?.text ?? '',
  address: p.formattedAddress,
  website: p.websiteUri,
  phone: p.nationalPhoneNumber,
  mapsUrl: p.googleMapsUri,
  rating: p.rating,
  reviews: p.userRatingCount,
})

export const placesConfigured = () => Boolean(process.env.GOOGLE_MAPS_API_KEY)

async function call(path: string, fieldMask: string[], init: RequestInit = {}) {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': process.env.GOOGLE_MAPS_API_KEY ?? '',
      'X-Goog-FieldMask': fieldMask.join(','),
    },
    signal: AbortSignal.timeout(10000),
    cache: 'no-store',
  })
  if (!res.ok) throw new Error(`Places responded ${res.status}: ${(await res.text()).slice(0, 300)}`)
  return res.json()
}

export async function searchPlaces(query: string, pageToken?: string) {
  const data = await call(
    '/places:searchText',
    [...CONTACT_FIELDS.map((f) => `places.${f}`), 'nextPageToken'],
    {
      method: 'POST',
      body: JSON.stringify({ textQuery: query, languageCode: 'es', regionCode: 'AR', pageSize: 20, pageToken }),
    },
  )
  return {
    places: ((data.places ?? []) as RawPlace[]).map(toPlace),
    nextPageToken: data.nextPageToken as string | undefined,
  }
}

/** Name and address only: the cheapest way to label a saved prospect. */
export async function placeLabel(id: string) {
  return toPlace(await call(`/places/${encodeURIComponent(id)}?languageCode=es`, ['id', 'displayName', 'formattedAddress']))
}

export async function placeContact(id: string) {
  return toPlace(await call(`/places/${encodeURIComponent(id)}?languageCode=es`, CONTACT_FIELDS))
}
