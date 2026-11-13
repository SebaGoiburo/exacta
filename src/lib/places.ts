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

/** Name, rating and reviews for a comparison shown in a report. Requested every time the report is shown. */
export async function placeSummary(id: string) {
  return toPlace(
    await call(`/places/${encodeURIComponent(id)}?languageCode=es`, ['id', 'displayName', 'googleMapsUri', 'rating', 'userRatingCount']),
  )
}

/** A search result with what the prospect formula needs. Used in memory only, never stored. */
export type ScoredPlace = Place & { priceLevel?: string; operational: boolean; type?: string }

const BATCH_FIELDS = [...CONTACT_FIELDS, 'priceLevel', 'businessStatus', 'primaryTypeDisplayName']

/** Same search as `searchPlaces`, plus price level and whether the business is open. */
export async function searchPlacesForBatch(query: string, pageToken?: string) {
  const data = await call('/places:searchText', [...BATCH_FIELDS.map((f) => `places.${f}`), 'nextPageToken'], {
    method: 'POST',
    body: JSON.stringify({ textQuery: query, languageCode: 'es', regionCode: 'AR', pageSize: 20, pageToken }),
  })
  type Raw = RawPlace & { priceLevel?: string; businessStatus?: string; primaryTypeDisplayName?: { text?: string } }
  const places: ScoredPlace[] = ((data.places ?? []) as Raw[]).map((p) => ({
    ...toPlace(p),
    priceLevel: p.priceLevel,
    operational: !p.businessStatus || p.businessStatus === 'OPERATIONAL',
    type: p.primaryTypeDisplayName?.text,
  }))
  return { places, nextPageToken: data.nextPageToken as string | undefined }
}

export type PlaceReview = { rating?: number; text: string; when?: string; publishTime?: string }
export type ResearchPlace = Place & { reviews_: PlaceReview[]; hours: string[]; type?: string }

/** Contact data plus up to five reviews and opening hours, for the AI research of one prospect. */
export async function placeForResearch(id: string): Promise<ResearchPlace> {
  type Raw = RawPlace & {
    reviews?: { rating?: number; text?: { text?: string }; relativePublishTimeDescription?: string; publishTime?: string }[]
    regularOpeningHours?: { weekdayDescriptions?: string[] }
    primaryTypeDisplayName?: { text?: string }
  }
  const raw = (await call(`/places/${encodeURIComponent(id)}?languageCode=es`, [
    ...CONTACT_FIELDS,
    'reviews',
    'regularOpeningHours',
    'primaryTypeDisplayName',
  ])) as Raw
  return {
    ...toPlace(raw),
    // Reviewer names are left out: the analysis needs what they said, not who they are.
    reviews_: (raw.reviews ?? [])
      .map((r) => ({ rating: r.rating, text: r.text?.text?.slice(0, 800) ?? '', when: r.relativePublishTimeDescription, publishTime: r.publishTime }))
      .filter((r) => r.text),
    hours: raw.regularOpeningHours?.weekdayDescriptions ?? [],
    type: raw.primaryTypeDisplayName?.text,
  }
}
