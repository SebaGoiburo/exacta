'use client'

import type { Place } from '@/lib/places'
import { DIMENSION_NAMES, DIMENSIONS, KNOCKOUTS, type Dimension, type DimensionScore } from '@/lib/prospecting/model'
import type { Research } from '@/lib/prospecting/research'
import type { ReportContent } from '@/lib/prospecting/service'

export { DIMENSION_NAMES, DIMENSIONS, KNOCKOUTS }
export type { Dimension, DimensionScore, Research, ReportContent }

export type Profile = {
  id: number
  name: string
  key: string
  description: string
  status: 'borrador' | 'aprobado'
  origin?: 'inicial' | 'texto_libre' | null
  weights: Record<Dimension, number>
  minCapacity: number
  signals?: { key: string; label: string; weight: number; area: string }[] | null
  proof?: string | null
  costFormula?: string | null
}

export type Batch = {
  id: number
  title: string
  profile: { id: number; name: string } | number
  niche: string
  zone: string
  status: 'buscando' | 'puntuada' | 'investigando' | 'lista' | 'fallo'
  progress?: string | null
  found?: number | null
  knockedOut?: number | null
  kept?: number | null
  placesCalls?: number | null
  aiCostUsd?: number | null
  error?: string | null
  createdAt: string
}

export type Attempt = { date: string; channel: string; result: string; note?: string | null }

export type GeneratedProspect = {
  id: number
  placeId: string
  status: 'pendiente' | 'elegido' | 'informe' | 'contactado' | 'interesado' | 'descartado'
  score?: number | null
  tier?: 'A' | 'B' | 'C' | null
  pass?: number | null
  missing?: number | null
  scores?: Record<Dimension, DimensionScore> | null
  knockouts?: string[] | null
  facts?: { query?: string; rank?: number; count?: number; website?: string; pageSpeed?: number | null } | null
  hook?: string | null
  research?: Research | null
  report?: ReportContent | null
  reportToken?: string | null
  reportReviewedAt?: string | null
  reportExpiresAt?: string | null
  reportSentAt?: string | null
  reportOpens?: number | null
  reportLastOpenedAt?: string | null
  attempts?: Attempt[] | null
  nextAttemptAt?: string | null
  lead?: number | { id: number } | null
  outcome?: string | null
}

const ERRORS: Record<string, string> = {
  places_failed: 'Google Maps no respondió. Revisá la clave o el cupo diario.',
  too_many_requests: 'Demasiados pedidos seguidos. Esperá unos minutos.',
  not_configured: 'Falta configurar la clave de Google Maps en el servidor.',
  busy: 'Ya hay una tanda buscando. Esperá a que termine.',
  profile_not_approved: 'Ese perfil todavía no está aprobado.',
  missing_fields: 'Completá todos los campos.',
}

export async function generator<T>(body: Record<string, unknown>): Promise<T> {
  const res = await fetch('/api/prospecting/generator', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(ERRORS[data.error] ?? 'Algo falló. Probá de nuevo.')
  return data as T
}

export async function generatorView<T>(params: Record<string, string>): Promise<T> {
  const res = await fetch(`/api/prospecting/generator?${new URLSearchParams(params)}`, { credentials: 'include', cache: 'no-store' })
  if (!res.ok) throw new Error('No se pudo cargar. Probá de nuevo.')
  return res.json() as Promise<T>
}

/** Names, addresses and phones come live from Google every time: they are never stored. */
export async function placesApi<T>(body: Record<string, unknown>): Promise<T> {
  const res = await fetch('/api/prospecting', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(ERRORS[data.error] ?? 'Google Maps no respondió.')
  return data as T
}

export async function loadLabels(placeIds: string[]): Promise<Record<string, Place>> {
  if (!placeIds.length) return {}
  const { labels } = await placesApi<{ labels: Place[] }>({ action: 'labels', ids: placeIds.slice(0, 30) })
  return Object.fromEntries(labels.map((l) => [l.id, l]))
}

export const leadIdOf = (lead: GeneratedProspect['lead']) => (typeof lead === 'object' ? lead?.id : lead) ?? null

export const reportLink = (token: string) => `${window.location.origin}/informe/${token}`

export const STATUS_LABEL: Record<GeneratedProspect['status'], string> = {
  pendiente: 'Candidato',
  elegido: 'Elegido',
  informe: 'Informe listo',
  contactado: 'Contactado',
  interesado: 'Respondió',
  descartado: 'Descartado',
}

export const EVIDENCE_LABEL = { alta: 'dato firme', media: 'dato parcial', sin_dato: 'sin datos' } as const

export function ago(iso: string) {
  const minutes = Math.round((Date.now() - Date.parse(iso)) / 60000)
  if (minutes < 60) return `hace ${Math.max(minutes, 1)} min`
  const hours = Math.round(minutes / 60)
  if (hours < 48) return `hace ${hours} h`
  return `hace ${Math.round(hours / 24)} días`
}

export const dayText = (iso: string) => new Date(iso).toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })
