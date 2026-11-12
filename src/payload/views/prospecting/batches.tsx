'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { Place } from '@/lib/places'
import {
  DIMENSION_NAMES,
  DIMENSIONS,
  EVIDENCE_LABEL,
  KNOCKOUTS,
  generator,
  generatorView,
  loadLabels,
  type Batch,
  type GeneratedProspect,
  type Profile,
} from './api'
import { ReportEditor } from './report-editor'
import base from './prospecting.module.css'
import styles from './generator.module.css'

/** How many reports Sebastián can review properly per batch. */
const REVIEW_LIMIT = 10

const STATUS_TEXT: Record<Batch['status'], string> = {
  buscando: 'Buscando y midiendo',
  puntuada: 'Primera pasada lista',
  investigando: 'Investigando con IA',
  lista: 'Lista',
  fallo: 'Falló',
}

type Props = {
  configured: boolean
  profiles: Profile[]
  batches: Batch[]
  reload: () => Promise<void>
}

export function Batches({ configured, profiles, batches, reload }: Props) {
  const approved = profiles.filter((p) => p.status === 'aprobado')
  const [profileId, setProfileId] = useState<number | ''>('')
  const [niche, setNiche] = useState('')
  const [zone, setZone] = useState('Mendoza, Argentina')
  const [selected, setSelected] = useState<number | null>(batches[0]?.id ?? null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (selected === null && batches[0]) setSelected(batches[0].id)
  }, [batches, selected])

  async function start(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      const { batchId } = await generator<{ batchId: number }>({ action: 'start-batch', profileId, niche, zone })
      await reload()
      setSelected(batchId)
      setNiche('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo iniciar.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div>
      <section className={styles.section}>
        <h2>Nueva tanda</h2>
        <p className={styles.muted}>
          Busca hasta 100 comercios en Google Maps, revisa sus sitios y su velocidad, aplica la fórmula y se queda con los 30 mejores.
          Tarda unos minutos y no usa IA. Para buscar varios rubros juntos, separalos con comas.
        </p>
        <form onSubmit={start} className={styles.newBatch}>
          <label>
            Qué ofrecemos
            <select value={profileId} onChange={(e) => setProfileId(Number(e.target.value) || '')} required>
              <option value="">Elegí una oferta…</option>
              {approved.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Nicho
            <input value={niche} onChange={(e) => setNiche(e.target.value)} placeholder="Consultorios odontológicos, kinesiología…" required />
          </label>
          <label>
            Zona
            <input value={zone} onChange={(e) => setZone(e.target.value)} required />
          </label>
          <button type="submit" disabled={busy || !configured} className={base.primary}>
            {busy ? 'Iniciando…' : 'Buscar'}
          </button>
        </form>
        {error && (
          <p role="alert" className={base.error}>
            {error}
          </p>
        )}
      </section>

      {batches.length > 0 && (
        <section className={styles.section}>
          <h2>Tandas</h2>
          <ul className={styles.batchList}>
            {batches.map((b) => (
              <li key={b.id}>
                <button type="button" aria-current={b.id === selected} onClick={() => setSelected(b.id)}>
                  <strong>{b.title}</strong>
                  <span className={styles.badge}>{STATUS_TEXT[b.status]}</span>
                  <span className={styles.muted}>{b.progress}</span>
                  <span className={styles.muted}>{b.aiCostUsd ? `IA: US$ ${b.aiCostUsd.toFixed(2)}` : ''}</span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {selected !== null && <BatchDetail key={selected} batchId={selected} onChange={reload} />}
    </div>
  )
}

type Job = { prospect?: number | { id: number } | null; status: string; error?: string | null }

function BatchDetail({ batchId, onChange }: { batchId: number; onChange: () => Promise<void> }) {
  const [batch, setBatch] = useState<Batch | null>(null)
  const [prospects, setProspects] = useState<GeneratedProspect[]>([])
  const [jobs, setJobs] = useState<Job[]>([])
  const [places, setPlaces] = useState<Record<string, Place>>({})
  // Each name costs a Google call against a daily quota: ask once per screen, never on every refresh.
  const asked = useRef(new Set<string>())
  const [open, setOpen] = useState<number | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    const data = await generatorView<{ batch: Batch; prospects: GeneratedProspect[]; jobs: Job[] }>({ view: 'batch', id: String(batchId) })
    setBatch(data.batch)
    setProspects(data.prospects)
    setJobs(data.jobs)
    return data
  }, [batchId])

  useEffect(() => {
    let stop = false
    let timer: number | undefined
    const tick = async () => {
      try {
        const data = await load()
        if (stop) return
        const missing = data.prospects.map((p) => p.placeId).filter((id) => !asked.current.has(id))
        missing.forEach((id) => asked.current.add(id))
        if (missing.length) {
          const labels = await loadLabels(missing).catch(() => ({}))
          if (!stop) setPlaces((all) => ({ ...all, ...labels }))
        }
        if (['buscando', 'investigando'].includes(data.batch.status)) timer = window.setTimeout(tick, 6000)
        else void onChange()
      } catch (err) {
        if (!stop) setError(err instanceof Error ? err.message : 'No se pudo cargar.')
      }
    }
    void tick()
    return () => {
      stop = true
      window.clearTimeout(timer)
    }
  }, [load, onChange])

  async function act(body: Record<string, unknown>) {
    setBusy(true)
    setError(null)
    try {
      await generator(body)
      const data = await load()
      if (body.action === 'research' && data.batch.status === 'investigando') {
        const poll = async () => {
          const next = await load()
          if (next.batch.status === 'investigando') window.setTimeout(poll, 8000)
          else void onChange()
        }
        window.setTimeout(poll, 8000)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Algo falló.')
    } finally {
      setBusy(false)
    }
  }

  if (!batch) return <p>Cargando la tanda…</p>
  const chosen = prospects.filter((p) => !['pendiente', 'descartado'].includes(p.status)).length
  const firstPass = prospects.filter((p) => p.pass === 1 && p.status !== 'descartado').length
  const failedJob = (id: number) => jobs.find((j) => (typeof j.prospect === 'object' ? j.prospect?.id : j.prospect) === id && j.status === 'failed')

  return (
    <section className={styles.section}>
      <h2>{batch.title}</h2>
      <div className={styles.summary}>
        <span className={styles.badge}>{STATUS_TEXT[batch.status]}</span>
        <span>{batch.progress}</span>
        {batch.found ? <span className={styles.muted}>{batch.found} encontrados</span> : null}
        {batch.knockedOut ? <span className={styles.muted}>{batch.knockedOut} descartados por filtros</span> : null}
        <span className={styles.muted}>
          Elegidos: {chosen} de {REVIEW_LIMIT}
        </span>
        {batch.aiCostUsd ? <span className={styles.muted}>IA: US$ {batch.aiCostUsd.toFixed(2)}</span> : null}
      </div>
      {batch.error && <p className={base.error}>{batch.error}</p>}

      {firstPass > 0 && batch.status !== 'buscando' && batch.status !== 'investigando' && (
        <div className={base.notice}>
          <p style={{ margin: '0 0 8px' }}>
            {firstPass} prospectos tienen solo la primera pasada. La investigación con IA lee sus reseñas, busca en la web, encuentra a
            quien decide y escribe el hallazgo para el primer contacto. Cuesta alrededor de US$ 0,15 por prospecto.
          </p>
          <button type="button" className={base.primary} disabled={busy} onClick={() => void act({ action: 'research', batchId })}>
            Investigar {firstPass} con IA
          </button>
        </div>
      )}

      {error && (
        <p role="alert" className={base.error}>
          {error}
        </p>
      )}

      <ol className={styles.rows}>
        {prospects.map((p, i) => {
          const place = places[p.placeId]
          const isChosen = !['pendiente', 'descartado'].includes(p.status)
          const failed = failedJob(p.id)
          return (
            <li key={p.id} className={`${styles.row} ${isChosen ? styles.rowChosen : ''}`}>
              <div className={styles.rowHead}>
                <div>
                  <div className={styles.score}>{p.score ?? '—'}</div>
                  <span className={`${styles.badge} ${p.tier === 'A' ? styles.badgeA : ''}`}>{p.tier ?? '?'}</span>
                </div>
                <div>
                  <div className={styles.name}>
                    {i + 1}. {place?.name ?? 'Cargando…'}
                  </div>
                  <div className={styles.muted}>
                    {[place?.address, p.facts?.rank ? `puesto ${p.facts.rank} en Maps` : null, p.pass === 2 ? 'investigado con IA' : 'primera pasada']
                      .filter(Boolean)
                      .join(' · ')}
                  </div>
                  {(p.missing ?? 0) >= 2 && <span className={`${styles.badge} ${styles.badgeWarn}`}>{p.missing} criterios sin datos</span>}{' '}
                  {failed && <span className={`${styles.badge} ${styles.badgeWarn}`}>La IA falló: {failed.error}</span>}{' '}
                  {(p.knockouts ?? []).map((k) => (
                    <span key={k} className={`${styles.badge} ${styles.badgeWarn}`}>
                      {KNOCKOUTS[k as keyof typeof KNOCKOUTS] ?? k}
                    </span>
                  ))}
                </div>
                <div className={styles.actions}>
                  {p.status === 'pendiente' && (
                    <button type="button" disabled={busy} onClick={() => void act({ action: 'choose', prospectId: p.id })}>
                      Elegir
                    </button>
                  )}
                  {p.status === 'elegido' && (
                    <button type="button" disabled={busy} onClick={() => void act({ action: 'unchoose', prospectId: p.id })}>
                      Quitar
                    </button>
                  )}
                  {(p.status === 'pendiente' || p.status === 'elegido') && (
                    <button type="button" disabled={busy} onClick={() => void act({ action: 'discard', prospectId: p.id })}>
                      Descartar
                    </button>
                  )}
                  {p.status !== 'pendiente' && p.status !== 'elegido' && <span className={styles.badge}>{p.status}</span>}
                  <button type="button" onClick={() => setOpen(open === p.id ? null : p.id)}>
                    {open === p.id ? 'Cerrar' : 'Ver detalle'}
                  </button>
                </div>
              </div>

              {p.scores && (
                <div className={styles.bars}>
                  {DIMENSIONS.map((d) => {
                    const s = p.scores![d]
                    return (
                      <div key={d} className={`${styles.bar} ${s.evidence === 'sin_dato' ? styles.barUnknown : ''}`} title={s.why.join('\n')}>
                        {DIMENSION_NAMES[d]} · {s.value}
                        <span style={{ '--v': `${s.value}%` } as React.CSSProperties} />
                      </div>
                    )
                  })}
                </div>
              )}

              {p.hook && <p className={styles.hook}>{p.hook}</p>}

              {open === p.id && (
                <div className={styles.details}>
                  <div className={styles.twoCols}>
                    {DIMENSIONS.map((d) => {
                      const s = p.scores?.[d]
                      if (!s) return null
                      return (
                        <div key={d}>
                          <h3>
                            {DIMENSION_NAMES[d]}: {s.value} <span className={styles.muted}>({EVIDENCE_LABEL[s.evidence]})</span>
                          </h3>
                          <ul>
                            {s.why.map((w, k) => (
                              <li key={k}>{w}</li>
                            ))}
                          </ul>
                        </div>
                      )
                    })}
                  </div>
                  {p.research && (
                    <div className={styles.twoCols}>
                      <div>
                        <h3>Por qué contactarlo</h3>
                        <p>{p.research.summary}</p>
                        {p.research.risks && <p className={styles.muted}>Riesgo: {p.research.risks}</p>}
                      </div>
                      <div>
                        <h3>Quién decide y cómo llegar</h3>
                        <p>
                          {p.research.decisionMaker.name
                            ? `${p.research.decisionMaker.name}${p.research.decisionMaker.role ? `, ${p.research.decisionMaker.role}` : ''}`
                            : 'No encontramos el nombre de quien decide.'}
                        </p>
                        <ul>
                          {p.research.channels.map((c, k) => (
                            <li key={k}>
                              {c.kind}: {c.value}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )}
                  {isChosen && <ReportEditor prospect={p} onSaved={() => void load()} />}
                  {!isChosen && p.status !== 'descartado' && <p className={styles.muted}>Elegilo para armarle el informe.</p>}
                </div>
              )}
            </li>
          )
        })}
      </ol>
      {prospects.length > 0 && <p className={base.footer}>Nombres y direcciones: datos de Google Maps</p>}
    </section>
  )
}
