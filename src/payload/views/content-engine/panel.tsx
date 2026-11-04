'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import styles from './panel.module.css'

type Evidence = { source: 'search_console' | 'analytics' | 'web'; claim: string; url: string }

type Analysis = {
  reader: string
  problem: string
  commercialReason: string
  searchIntent: string
  keywords: string[]
  demand: string
  competition: string
  evidence: Evidence[]
  longVideo: { title: string; angle: string }
  blogPosts: { title: string; angle: string; keyword: string }[]
  linkedin: string[]
  youtube: string[]
  verdictReason?: string
}

type Topic = {
  id: number
  title: string
  origin: 'motor' | 'idea'
  idea?: string | null
  verdict?: 'ratificada' | 'rectificada' | null
  status: 'propuesto' | 'generando' | 'generado' | 'descartado'
  score?: number | null
  service?: string | null
  analysis: Analysis
}

type Piece = { id: number; topic: number; kind: string; title: string; body?: string | null; post?: number | null }
type Job = { id: number; kind: string; status: 'running' | 'done' | 'failed'; error?: string | null }
type Data = {
  topics: Topic[]
  pieces: Piece[]
  jobs: Job[]
  connections: { google: boolean; searchConsole: boolean; analytics: boolean }
}

const REFRESH_MS = 6000

const KIND_LABEL: Record<string, string> = {
  blog: 'Artículo de blog',
  video: 'Video largo de YouTube',
  short: 'Short de YouTube',
  linkedin_article: 'Artículo de LinkedIn',
  linkedin_post: 'Publicación de LinkedIn',
}

const JOB_LABEL: Record<string, string> = {
  topics: 'Analizando búsquedas y proponiendo temas',
  idea: 'Analizando tu idea',
  blog: 'Escribiendo el artículo',
  social: 'Escribiendo el video y LinkedIn',
}

const DEMAND_LABEL: Record<string, string> = { alta: 'Alta', media: 'Media', baja: 'Baja', sin_datos: 'Sin datos' }
const SOURCE_LABEL: Record<string, string> = { search_console: 'Search Console', analytics: 'Analytics', web: 'Web' }

const ERRORS: Record<string, string> = {
  busy: 'Ya hay una ejecución en curso. Esperá a que termine.',
  empty: 'Escribí la idea para poder analizarla.',
}

function PieceCard({ piece }: { piece: Piece }) {
  const [copied, setCopied] = useState(false)
  const copy = async () => {
    await navigator.clipboard.writeText(piece.body ?? '')
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <details className={styles.piece}>
      <summary>
        <span className={styles.kind}>{KIND_LABEL[piece.kind] ?? piece.kind}</span>
        {piece.title}
      </summary>
      <div className={styles.actions}>
        {piece.post ? (
          <Link className={styles.link} href={`/admin/collections/posts/${piece.post}`} prefetch={false}>
            Revisar y publicar el borrador
          </Link>
        ) : (
          <button type="button" onClick={copy}>
            {copied ? 'Copiado' : 'Copiar'}
          </button>
        )}
      </div>
      <pre className={styles.body}>{piece.body}</pre>
    </details>
  )
}

function TopicCard({
  topic,
  pieces,
  busy,
  act,
}: {
  topic: Topic
  pieces: Piece[]
  busy: boolean
  act: (action: string, extra: Record<string, unknown>) => void
}) {
  const a = topic.analysis

  return (
    <li className={styles.topic}>
      <div className={styles.head}>
        <p className={styles.score} title="Potencial comercial, de 0 a 100">
          {topic.score ?? '-'}
        </p>
        <div>
          <h3>{topic.title}</h3>
          <p className={styles.meta}>
            {topic.service}
            {' · Demanda estimada: '}
            {DEMAND_LABEL[a.demand] ?? a.demand}
            {topic.origin === 'idea' && ' · Idea nuestra'}
          </p>
        </div>
      </div>

      {topic.verdict && (
        <div className={topic.verdict === 'ratificada' ? styles.ok : styles.warn}>
          <strong>{topic.verdict === 'ratificada' ? 'Idea ratificada' : 'Idea rectificada'}.</strong> {a.verdictReason}
          {topic.idea && <p className={styles.small}>Tu idea: {topic.idea}</p>}
        </div>
      )}

      <p>
        <strong>El problema:</strong> {a.problem}
      </p>
      <p>
        <strong>Por qué puede generar negocios:</strong> {a.commercialReason}
      </p>

      <details>
        <summary>Ver análisis y plan completo</summary>
        <div className={styles.detail}>
          <p>
            <strong>Lector:</strong> {a.reader}
          </p>
          <p>
            <strong>Intención de búsqueda:</strong> {a.searchIntent}
          </p>
          <p>
            <strong>Palabras clave:</strong> {a.keywords.join(', ')}
          </p>
          <p>
            <strong>Competencia:</strong> {a.competition}
          </p>
          <h4>Evidencia</h4>
          {a.evidence.length ? (
            <ul>
              {a.evidence.map((e) => (
                <li key={e.claim}>
                  <span className={styles.kind}>{SOURCE_LABEL[e.source]}</span> {e.claim}
                  {e.url && (
                    <>
                      {' '}
                      <a href={e.url} target="_blank" rel="noopener noreferrer">
                        Fuente
                      </a>
                    </>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p>Sin evidencia verificable: tomá este tema como una hipótesis.</p>
          )}
          <h4>Video largo</h4>
          <p>
            <strong>{a.longVideo.title}.</strong> {a.longVideo.angle}
          </p>
          <h4>Blog</h4>
          <ul>
            {a.blogPosts.map((p) => (
              <li key={p.title}>
                <strong>{p.title}.</strong> {p.angle} ({p.keyword})
              </li>
            ))}
          </ul>
          <h4>LinkedIn</h4>
          <ul>
            {a.linkedin.map((l) => (
              <li key={l}>{l}</li>
            ))}
          </ul>
          <h4>Shorts de YouTube</h4>
          <ul>
            {a.youtube.map((y) => (
              <li key={y}>{y}</li>
            ))}
          </ul>
        </div>
      </details>

      {pieces.length > 0 && (
        <div className={styles.pieces}>
          <h4>Piezas generadas</h4>
          {pieces.map((p) => (
            <PieceCard key={p.id} piece={p} />
          ))}
        </div>
      )}

      {topic.status === 'propuesto' && (
        <div className={styles.actions}>
          <button type="button" className={styles.primary} disabled={busy} onClick={() => act('generate', { id: topic.id })}>
            Aprobar y generar piezas
          </button>
          <button type="button" disabled={busy} onClick={() => act('discard', { id: topic.id })}>
            Descartar
          </button>
        </div>
      )}
      {topic.status === 'generando' && <p className={styles.small}>Generando piezas…</p>}
    </li>
  )
}

export function EnginePanel() {
  const [data, setData] = useState<Data | null>(null)
  const [idea, setIdea] = useState('')
  const [focus, setFocus] = useState('')
  const [error, setError] = useState('')
  const [sending, setSending] = useState(false)

  const load = useCallback(async () => {
    const res = await fetch('/api/content/panel', { credentials: 'include' })
    if (res.ok) setData(await res.json())
  }, [])

  useEffect(() => {
    load()
    const timer = setInterval(load, REFRESH_MS)
    return () => clearInterval(timer)
  }, [load])

  const act = useCallback(
    async (action: string, extra: Record<string, unknown> = {}) => {
      setSending(true)
      setError('')
      try {
        const res = await fetch('/api/content/panel', {
          method: 'POST',
          credentials: 'include',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ action, ...extra }),
        })
        if (!res.ok) {
          const { error: code } = (await res.json().catch(() => ({}))) as { error?: string }
          setError(ERRORS[code ?? ''] ?? 'No se pudo completar la acción. Probá de nuevo.')
          return false
        }
        await load()
        return true
      } finally {
        setSending(false)
      }
    },
    [load],
  )

  if (!data) return <p>Cargando…</p>

  const running = data.jobs.find((j) => j.status === 'running')
  const lastFailed = data.jobs[0]?.status === 'failed' ? data.jobs[0] : null
  const busy = sending || Boolean(running)
  const { google, searchConsole, analytics } = data.connections
  const topics = [...data.topics].sort((a, b) => (b.score ?? 0) - (a.score ?? 0))

  return (
    <div className={styles.wrap}>
      <section className={styles.tools}>
        <form
          onSubmit={async (e) => {
            e.preventDefault()
            if (await act('propose', { text: focus })) setFocus('')
          }}
        >
          <h2>Proponer temas</h2>
          <p>El motor cruza tus datos de Google con lo que hoy se publica, y prioriza lo que puede generar negocios.</p>
          <label htmlFor="focus">Enfoque para esta tanda (opcional)</label>
          <input id="focus" value={focus} onChange={(e) => setFocus(e.target.value)} placeholder="Por ejemplo: logística o bodegas" />
          <button type="submit" className={styles.primary} disabled={busy}>
            Proponer 5 temas
          </button>
        </form>

        <form
          onSubmit={async (e) => {
            e.preventDefault()
            if (await act('idea', { text: idea })) setIdea('')
          }}
        >
          <h2>Analizar mi idea</h2>
          <p>El motor la ratifica o la rectifica, y propone el video largo, los artículos y las piezas.</p>
          <label htmlFor="idea">Tu idea</label>
          <textarea id="idea" rows={3} value={idea} onChange={(e) => setIdea(e.target.value)} />
          <button type="submit" className={styles.primary} disabled={busy || !idea.trim()}>
            Analizar idea
          </button>
        </form>
      </section>

      <p className={styles.small}>
        {google && searchConsole ? 'Search Console conectado.' : 'Search Console sin conectar.'}{' '}
        {google && analytics ? 'Analytics conectado.' : 'Analytics sin conectar.'}{' '}
        {!(google && searchConsole && analytics) && 'Mientras tanto, el motor trabaja solo con búsqueda web.'}
      </p>

      {running && (
        <p role="status" className={styles.running}>
          {JOB_LABEL[running.kind] ?? 'Trabajando'}… Puede tardar unos minutos. Podés seguir usando el panel.
        </p>
      )}
      {lastFailed && !running && (
        <p role="alert" className={styles.warn}>
          La última ejecución falló: {lastFailed.error}
        </p>
      )}
      {error && (
        <p role="alert" className={styles.warn}>
          {error}
        </p>
      )}

      {topics.length ? (
        <ul className={styles.list}>
          {topics.map((topic) => (
            <TopicCard
              key={topic.id}
              topic={topic}
              pieces={data.pieces.filter((p) => p.topic === topic.id)}
              busy={busy}
              act={act}
            />
          ))}
        </ul>
      ) : (
        !running && <p>Todavía no hay temas. Pedí una propuesta o analizá una idea.</p>
      )}
    </div>
  )
}
