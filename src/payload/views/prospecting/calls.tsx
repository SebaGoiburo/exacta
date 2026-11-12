'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import type { Place } from '@/lib/places'
import { ago, dayText, generator, generatorView, leadIdOf, loadLabels, placesApi, reportLink, type GeneratedProspect } from './api'
import base from './prospecting.module.css'
import styles from './generator.module.css'

const RESULT_TEXT: Record<string, string> = {
  enviado: 'enviado',
  no_atendio: 'no atendió',
  hablo: 'habló',
  rechazo: 'no le interesa',
}

/** Gabriela's list: who to contact today, with whoever is reading the report right now at the top. */
export function Calls({ configured }: { configured: boolean }) {
  const [prospects, setProspects] = useState<GeneratedProspect[]>([])
  const [places, setPlaces] = useState<Record<string, Place>>({})
  // Names come from Google against a daily quota: each one is asked once per screen.
  const asked = useRef(new Set<string>())
  const [notes, setNotes] = useState<Record<number, string>>({})
  const [converted, setConverted] = useState<Record<number, number>>({})
  const [busy, setBusy] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      const { prospects: list } = await generatorView<{ prospects: GeneratedProspect[] }>({ view: 'calls' })
      setProspects(list)
      setLoaded(true)
      const missing = list.map((p) => p.placeId).filter((id) => !asked.current.has(id))
      if (configured && missing.length) {
        missing.forEach((id) => asked.current.add(id))
        const labels = await loadLabels(missing).catch(() => ({}))
        setPlaces((all) => ({ ...all, ...labels }))
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cargar.')
    }
  }, [configured])

  useEffect(() => {
    void load()
  }, [load])

  async function reveal(placeId: string) {
    try {
      const { place } = await placesApi<{ place: Place }>({ action: 'contact', id: placeId })
      setPlaces((all) => ({ ...all, [placeId]: place }))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Google Maps no respondió.')
    }
  }

  async function attempt(p: GeneratedProspect, channel: string, result: string) {
    setBusy(true)
    setError(null)
    try {
      const data = await generator<{ leadId?: number }>({ action: 'attempt', prospectId: p.id, channel, result, note: notes[p.id] ?? '' })
      if (data.leadId) setConverted((all) => ({ ...all, [p.id]: data.leadId! }))
      setNotes((all) => ({ ...all, [p.id]: '' }))
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo registrar.')
    } finally {
      setBusy(false)
    }
  }

  const done = Object.entries(converted)

  return (
    <div className={styles.section}>
      <p className={styles.muted}>
        Prospectos con informe que hay que contactar hoy. Arriba, los que abrieron el informe en los últimos tres días: es el mejor
        momento para llamar. La secuencia es el envío y tres seguimientos (días 3, 7 y 12); después del cuarto intento sin respuesta,
        se descarta y no se lo vuelve a contactar por 90 días.
      </p>
      {error && (
        <p role="alert" className={base.error}>
          {error}
        </p>
      )}
      {done.length > 0 && (
        <div className={base.notice}>
          {done.map(([pid, leadId]) => (
            <p key={pid} style={{ margin: 0 }}>
              Pasó al CRM: <Link href={`/admin/collections/leads/${leadId}`}>abrir la oportunidad</Link>
            </p>
          ))}
        </div>
      )}
      {loaded && !prospects.length && <p>No hay contactos pendientes para hoy.</p>}

      <ul className={styles.rows}>
        {prospects.map((p) => {
          const place = places[p.placeId]
          const hot = p.reportLastOpenedAt && Date.now() - Date.parse(p.reportLastOpenedAt) < 3 * 86400000
          const attempts = p.attempts ?? []
          const leadId = leadIdOf(p.lead)
          return (
            <li key={p.id} className={styles.row}>
              <div className={styles.rowHead}>
                <div>
                  <div className={styles.score}>{p.score ?? '—'}</div>
                  <span className={`${styles.badge} ${p.tier === 'A' ? styles.badgeA : ''}`}>{p.tier ?? '?'}</span>
                </div>
                <div>
                  <div className={styles.name}>{place?.name ?? 'Cargando…'}</div>
                  <div className={styles.muted}>
                    {p.research?.decisionMaker.name
                      ? `Decide: ${p.research.decisionMaker.name}${p.research.decisionMaker.role ? `, ${p.research.decisionMaker.role}` : ''}`
                      : 'Sin nombre de quien decide'}
                  </div>
                  {hot && <span className={`${styles.badge} ${styles.badgeHot}`}>Abrió el informe {ago(p.reportLastOpenedAt!)}</span>}{' '}
                  {!hot && (p.reportOpens ?? 0) > 0 && <span className={styles.badge}>Abrió el informe {p.reportOpens} veces</span>}{' '}
                  {p.reportSentAt ? (
                    <span className={styles.muted}>
                      Enviado el {dayText(p.reportSentAt)} · {attempts.length} {attempts.length === 1 ? 'intento' : 'intentos'}
                    </span>
                  ) : (
                    <span className={styles.badge}>Informe listo, sin enviar</span>
                  )}
                </div>
                <div className={styles.actions}>
                  {place?.phone ? (
                    <a href={`tel:${place.phone.replace(/[^\d+]/g, '')}`}>{place.phone}</a>
                  ) : place?.mapsUrl ? (
                    <span className={styles.muted}>Sin teléfono</span>
                  ) : (
                    <button type="button" disabled={!configured} onClick={() => void reveal(p.placeId)}>
                      Ver teléfono
                    </button>
                  )}
                  {p.reportToken && (
                    <a href={reportLink(p.reportToken)} target="_blank" rel="noopener noreferrer">
                      Informe
                    </a>
                  )}
                </div>
              </div>

              {p.hook && <p className={styles.hook}>{p.hook}</p>}
              {p.research?.openQuestion && <p className={styles.muted}>Pregunta para la llamada: {p.research.openQuestion}</p>}
              {attempts.length > 0 && (
                <p className={styles.muted}>
                  {attempts.map((t) => `${dayText(t.date)}: ${t.channel}, ${RESULT_TEXT[t.result] ?? t.result}${t.note ? ` (${t.note})` : ''}`).join(' · ')}
                </p>
              )}

              {leadId ? (
                <Link href={`/admin/collections/leads/${leadId}`}>Ver oportunidad</Link>
              ) : (
                <div className={styles.inline}>
                  <input
                    placeholder="Nota (opcional)"
                    value={notes[p.id] ?? ''}
                    onChange={(e) => setNotes((all) => ({ ...all, [p.id]: e.target.value }))}
                  />
                  <button type="button" disabled={busy} onClick={() => void attempt(p, 'llamada', 'no_atendio')}>
                    No atendió
                  </button>
                  <button type="button" disabled={busy} onClick={() => void attempt(p, 'whatsapp', 'enviado')}>
                    Le escribí
                  </button>
                  <button type="button" disabled={busy} className={base.primary} onClick={() => void attempt(p, 'llamada', 'hablo')}>
                    Respondió: pasar al CRM
                  </button>
                  <button type="button" disabled={busy} onClick={() => void attempt(p, 'llamada', 'rechazo')}>
                    No le interesa
                  </button>
                </div>
              )}
            </li>
          )
        })}
      </ul>
      {prospects.length > 0 && <p className={base.footer}>Nombres y teléfonos: datos de Google Maps</p>}
    </div>
  )
}
