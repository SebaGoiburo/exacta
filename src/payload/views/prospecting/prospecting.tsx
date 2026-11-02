'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import type { Place } from '@/lib/places'
import styles from './prospecting.module.css'

type Found = Place & { saved?: boolean }
type Saved = {
  id: number
  placeId: string
  niche?: string | null
  zone?: string | null
  status: string
  notes?: string | null
  lead?: number | { id: number } | null
}

const STATUSES = [
  { label: 'Pendiente', value: 'pendiente' },
  { label: 'Contactado', value: 'contactado' },
  { label: 'Interesado', value: 'interesado' },
  { label: 'Descartado', value: 'descartado' },
]

const ERRORS: Record<string, string> = {
  places_failed: 'Google no respondió. Revisá la clave o el cupo diario.',
  too_many_requests: 'Demasiadas búsquedas seguidas. Esperá unos minutos.',
  not_configured: 'Falta configurar la clave de Google Maps.',
}

async function api<T>(body: Record<string, unknown>): Promise<T> {
  const res = await fetch('/api/prospecting', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(ERRORS[data.error] ?? 'Algo falló. Probá de nuevo.')
  return data
}

const PAGE_SIZE = 20

export function Prospecting({ configured }: { configured: boolean }) {
  const [tab, setTab] = useState<'search' | 'saved'>('search')
  const [niche, setNiche] = useState('')
  const [zone, setZone] = useState('Mendoza, Argentina')
  const [results, setResults] = useState<Found[] | null>(null)
  const [nextPage, setNextPage] = useState<string>()
  const [searched, setSearched] = useState({ niche: '', zone: '' })
  const [saved, setSaved] = useState<Saved[]>([])
  const [places, setPlaces] = useState<Record<string, Place>>({})
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const run = useCallback(async (work: () => Promise<void>) => {
    setBusy(true)
    setError(null)
    try {
      await work()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Algo falló. Probá de nuevo.')
    } finally {
      setBusy(false)
    }
  }, [])

  function search(e: React.FormEvent) {
    e.preventDefault()
    void run(async () => {
      const data = await api<{ places: Found[]; nextPageToken?: string }>({ action: 'search', niche, zone })
      setResults(data.places)
      setNextPage(data.nextPageToken)
      setSearched({ niche, zone })
    })
  }

  const more = () =>
    run(async () => {
      const data = await api<{ places: Found[]; nextPageToken?: string }>({
        action: 'search',
        ...searched,
        pageToken: nextPage,
      })
      setResults((all) => [...(all ?? []), ...data.places])
      setNextPage(data.nextPageToken)
    })

  const save = (place: Found) =>
    run(async () => {
      const res = await fetch('/api/prospects', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ placeId: place.id, ...searched }),
      })
      if (!res.ok) throw new Error('No se pudo guardar.')
      setResults((all) => all?.map((p) => (p.id === place.id ? { ...p, saved: true } : p)) ?? null)
    })

  // Saved prospects hold only Google's ID, so names are requested each time the list opens.
  const loadSaved = useCallback(
    () =>
      run(async () => {
        const res = await fetch(`/api/prospects?limit=${PAGE_SIZE}&sort=-createdAt&depth=0`, { credentials: 'include' })
        if (!res.ok) throw new Error('No se pudieron cargar los prospectos.')
        const { docs } = (await res.json()) as { docs: Saved[] }
        setSaved(docs)
        if (docs.length && configured) {
          const { labels } = await api<{ labels: Place[] }>({ action: 'labels', ids: docs.map((d) => d.placeId) })
          setPlaces((all) => ({ ...all, ...Object.fromEntries(labels.map((l) => [l.id, l])) }))
        }
      }),
    [run, configured],
  )

  useEffect(() => {
    if (tab === 'saved') void loadSaved()
  }, [tab, loadSaved])

  const reveal = (placeId: string) =>
    run(async () => {
      const { place } = await api<{ place: Place }>({ action: 'contact', id: placeId })
      setPlaces((all) => ({ ...all, [place.id]: place }))
    })

  async function update(id: number, data: Partial<Saved>) {
    setSaved((all) => all.map((p) => (p.id === id ? { ...p, ...data } : p)))
    const res = await fetch(`/api/prospects/${id}`, {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (!res.ok) setError('No se pudo guardar el cambio.')
  }

  const convert = (prospect: Saved) =>
    run(async () => {
      const { leadId } = await api<{ leadId: number }>({ action: 'convert', prospectId: prospect.id })
      setSaved((all) => all.map((p) => (p.id === prospect.id ? { ...p, lead: leadId, status: 'interesado' } : p)))
    })

  return (
    <div className={styles.wrap}>
      {!configured && (
        <p className={styles.notice}>
          Falta configurar la clave de Google Maps en el servidor. Mientras tanto, la búsqueda no está disponible.
        </p>
      )}

      <div role="tablist" className={styles.tabs}>
        <button type="button" role="tab" aria-selected={tab === 'search'} onClick={() => setTab('search')}>
          Buscar
        </button>
        <button type="button" role="tab" aria-selected={tab === 'saved'} onClick={() => setTab('saved')}>
          Guardados
        </button>
      </div>

      {error && (
        <p role="alert" className={styles.error}>
          {error}
        </p>
      )}

      {tab === 'search' && (
        <>
          <form onSubmit={search} className={styles.form}>
            <label>
              Nicho
              <input value={niche} onChange={(e) => setNiche(e.target.value)} placeholder="Bodegas, clínicas, estudios contables…" required />
            </label>
            <label>
              Zona
              <input value={zone} onChange={(e) => setZone(e.target.value)} required />
            </label>
            <button type="submit" disabled={busy || !configured} className={styles.primary}>
              {busy ? 'Buscando…' : 'Buscar'}
            </button>
          </form>

          {results && results.length === 0 && <p>No hubo resultados. Probá con otro nicho o zona.</p>}

          {results && results.length > 0 && (
            <>
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Empresa</th>
                      <th>Teléfono</th>
                      <th>Sitio web</th>
                      <th>Reseñas</th>
                      <th aria-label="Acción" />
                    </tr>
                  </thead>
                  <tbody>
                    {results.map((place) => (
                      <tr key={place.id}>
                        <td>
                          <a href={place.mapsUrl} target="_blank" rel="noopener noreferrer">
                            {place.name}
                          </a>
                          <small>{place.address}</small>
                        </td>
                        <td className={styles.nowrap}>{place.phone ?? '—'}</td>
                        <td>
                          {place.website ? (
                            <a href={place.website} target="_blank" rel="noopener noreferrer">
                              Abrir
                            </a>
                          ) : (
                            'Sin sitio'
                          )}
                        </td>
                        <td className={styles.nowrap}>{place.rating ? `${place.rating} (${place.reviews ?? 0})` : '—'}</td>
                        <td>
                          <button type="button" disabled={busy || place.saved} onClick={() => void save(place)}>
                            {place.saved ? 'Guardado' : 'Guardar'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className={styles.footer}>
                {nextPage && (
                  <button type="button" disabled={busy} onClick={() => void more()}>
                    Ver más
                  </button>
                )}
                <span>Datos de Google Maps</span>
              </div>
            </>
          )}
        </>
      )}

      {tab === 'saved' && (
        <>
          {!saved.length && !busy && <p>Todavía no guardaste prospectos.</p>}
          <ul className={styles.saved}>
            {saved.map((prospect) => {
              const place = places[prospect.placeId]
              const leadId = typeof prospect.lead === 'object' ? prospect.lead?.id : prospect.lead
              return (
                <li key={prospect.id}>
                  <div className={styles.savedHead}>
                    <div>
                      <strong>{place?.name || 'Cargando…'}</strong>
                      <small>{[prospect.niche, place?.address].filter(Boolean).join(' · ')}</small>
                    </div>
                    <select
                      aria-label="Estado"
                      value={prospect.status}
                      onChange={(e) => void update(prospect.id, { status: e.target.value })}
                    >
                      {STATUSES.map((s) => (
                        <option key={s.value} value={s.value}>
                          {s.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {place?.mapsUrl ? (
                    <p className={styles.contact}>
                      {place.phone ?? 'Sin teléfono'}
                      {place.website && (
                        <a href={place.website} target="_blank" rel="noopener noreferrer">
                          Sitio web
                        </a>
                      )}
                      <a href={place.mapsUrl} target="_blank" rel="noopener noreferrer">
                        Google Maps
                      </a>
                    </p>
                  ) : (
                    <button type="button" disabled={busy || !configured} onClick={() => void reveal(prospect.placeId)}>
                      Ver teléfono y web
                    </button>
                  )}

                  <label className={styles.notes}>
                    Notas
                    <textarea
                      rows={2}
                      defaultValue={prospect.notes ?? ''}
                      onBlur={(e) => {
                        if (e.target.value !== (prospect.notes ?? '')) void update(prospect.id, { notes: e.target.value })
                      }}
                    />
                  </label>

                  {leadId ? (
                    <Link href={`/admin/collections/leads/${leadId}`}>Ver oportunidad</Link>
                  ) : (
                    prospect.status === 'interesado' && (
                      <button type="button" disabled={busy || !configured} className={styles.primary} onClick={() => void convert(prospect)}>
                        Pasar a oportunidad
                      </button>
                    )
                  )}
                </li>
              )
            })}
          </ul>
          {saved.length > 0 && <p className={styles.footer}>Datos de Google Maps</p>}
        </>
      )}
    </div>
  )
}
