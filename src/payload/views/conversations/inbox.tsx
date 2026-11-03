'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import styles from './inbox.module.css'

type Status = 'agente' | 'derivada' | 'humano'

type Conversation = {
  id: number
  waId: string
  profileName?: string | null
  status: Status
  lastMessageAt?: string | null
  lastInboundAt?: string | null
  lastPreview?: string | null
  unread?: number | null
  lead?: number | null
  collected?: {
    name?: string | null
    email?: string | null
    company?: string | null
    role?: string | null
    companySize?: string | null
    need?: string | null
  } | null
}

type Message = {
  id: number
  sender: 'cliente' | 'agente' | 'asesor' | 'sistema'
  text: string
  failed?: boolean | null
  createdAt: string
}

const REFRESH_MS = 5000
const WINDOW_MS = 24 * 60 * 60 * 1000

const STATUS_LABEL: Record<Status, string> = {
  agente: 'Atiende el agente',
  derivada: 'Espera un asesor',
  humano: 'Atiende un asesor',
}

const FILTERS: { value: Status | 'todas'; label: string }[] = [
  { value: 'todas', label: 'Todas' },
  { value: 'derivada', label: 'Esperan asesor' },
  { value: 'humano', label: 'Con asesor' },
  { value: 'agente', label: 'Con el agente' },
]

const SENDER_LABEL: Record<Message['sender'], string> = {
  cliente: 'Cliente',
  agente: 'Agente IA',
  asesor: 'Asesor',
  sistema: 'Sistema',
}

const ERRORS: Record<string, string> = {
  window_closed: 'Pasaron más de 24 horas desde el último mensaje del cliente. WhatsApp no permite responder hasta que vuelva a escribir.',
  not_configured: 'Falta configurar el envío de WhatsApp en el servidor.',
  send_failed: 'WhatsApp no aceptó el mensaje. Probá de nuevo.',
}

const time = new Intl.DateTimeFormat('es-AR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
const nameOf = (c: Conversation) => c.collected?.name || c.profileName || `+${c.waId}`

async function panel(body: Record<string, unknown>) {
  const res = await fetch('/api/whatsapp/panel', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error(ERRORS[data.error] ?? 'Algo falló. Probá de nuevo.')
  }
}

export function Inbox() {
  const [conversations, setConversations] = useState<Conversation[] | null>(null)
  const [selected, setSelected] = useState<number | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [filter, setFilter] = useState<Status | 'todas'>('todas')
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const threadRef = useRef<HTMLDivElement>(null)
  const lastCount = useRef(0)

  const loadList = useCallback(async () => {
    const res = await fetch('/api/conversations?limit=100&sort=-lastMessageAt&depth=0', { credentials: 'include' })
    if (res.ok) setConversations(((await res.json()) as { docs: Conversation[] }).docs)
  }, [])

  const loadThread = useCallback(async (id: number) => {
    const query = `where[conversation][equals]=${id}&sort=-createdAt&limit=100&depth=0`
    const res = await fetch(`/api/conversation-messages?${query}`, { credentials: 'include' })
    if (res.ok) setMessages(((await res.json()) as { docs: Message[] }).docs.reverse())
  }, [])

  // Keeps the screen current, but stops asking while the tab isn't being looked at.
  useEffect(() => {
    const refresh = () => {
      if (document.hidden) return
      void loadList()
      if (selected !== null) void loadThread(selected)
    }
    refresh()
    const timer = window.setInterval(refresh, REFRESH_MS)
    return () => window.clearInterval(timer)
  }, [loadList, loadThread, selected])

  // The advisor's notice links straight to a conversation.
  useEffect(() => {
    const id = Number(new URLSearchParams(window.location.search).get('c'))
    if (id) setSelected(id)
  }, [])

  useEffect(() => {
    if (selected !== null) void panel({ action: 'read', id: selected }).catch(() => {})
    setError(null)
    setText('')
    lastCount.current = 0
    setMessages([])
  }, [selected])

  // Follows new messages, without pulling the view down while someone reads older ones.
  useEffect(() => {
    if (messages.length !== lastCount.current) {
      lastCount.current = messages.length
      threadRef.current?.scrollTo({ top: threadRef.current.scrollHeight })
    }
  }, [messages])

  const current = conversations?.find((c) => c.id === selected) ?? null
  const visible = (conversations ?? []).filter((c) => filter === 'todas' || c.status === filter)
  const waiting = (conversations ?? []).filter((c) => c.status === 'derivada').length
  const windowOpen = current?.lastInboundAt ? Date.now() - new Date(current.lastInboundAt).getTime() < WINDOW_MS : false

  async function run(body: Record<string, unknown>, after?: () => void) {
    setBusy(true)
    setError(null)
    try {
      await panel(body)
      after?.()
      await loadList()
      if (selected !== null) await loadThread(selected)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Algo falló. Probá de nuevo.')
    } finally {
      setBusy(false)
    }
  }

  function send(e?: React.FormEvent) {
    e?.preventDefault()
    if (!selected || !text.trim() || busy) return
    void run({ action: 'reply', id: selected, text }, () => setText(''))
  }

  return (
    <div className={`${styles.wrap} ${current ? styles.hasSelection : ''}`}>
      <aside className={styles.list}>
        <div className={styles.filters}>
          {FILTERS.map((f) => (
            <button key={f.value} type="button" aria-pressed={filter === f.value} onClick={() => setFilter(f.value)}>
              {f.label}
              {f.value === 'derivada' && waiting > 0 && <span className={styles.count}>{waiting}</span>}
            </button>
          ))}
        </div>

        {conversations === null && <p className={styles.empty}>Cargando…</p>}
        {conversations !== null && !visible.length && <p className={styles.empty}>No hay conversaciones acá.</p>}

        <ul>
          {visible.map((c) => (
            <li key={c.id}>
              <button
                type="button"
                className={`${styles.row} ${c.id === selected ? styles.rowActive : ''}`}
                onClick={() => setSelected(c.id)}
              >
                <span className={styles.rowTop}>
                  <strong>{nameOf(c)}</strong>
                  {c.lastMessageAt && <small>{time.format(new Date(c.lastMessageAt))}</small>}
                </span>
                <span className={styles.preview}>{c.lastPreview}</span>
                <span className={styles.rowBottom}>
                  <span className={styles.status} data-status={c.status}>
                    {STATUS_LABEL[c.status]}
                  </span>
                  {(c.unread ?? 0) > 0 && c.id !== selected && <span className={styles.count}>{c.unread}</span>}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </aside>

      <section className={styles.thread}>
        {!current ? (
          <p className={styles.empty}>Elegí una conversación para verla.</p>
        ) : (
          <>
            <header className={styles.head}>
              <button type="button" className={styles.back} onClick={() => setSelected(null)}>
                Volver
              </button>
              <div className={styles.headName}>
                <strong>{nameOf(current)}</strong>
                <small>
                  +{current.waId} · {STATUS_LABEL[current.status]}
                </small>
              </div>
              <div className={styles.actions}>
                {current.status !== 'humano' && (
                  <button
                    type="button"
                    disabled={busy}
                    className={styles.primary}
                    onClick={() => void run({ action: 'take', id: current.id })}
                  >
                    Tomar el control
                  </button>
                )}
                {current.status !== 'agente' && (
                  <button type="button" disabled={busy} onClick={() => void run({ action: 'finish', id: current.id })}>
                    Finalizar y devolver a la IA
                  </button>
                )}
              </div>
            </header>

            <div className={styles.body}>
              <div ref={threadRef} className={styles.messages} role="log" aria-live="polite">
                {messages.map((m) => (
                  <div key={m.id} className={styles.message} data-sender={m.sender}>
                    <p>{m.text}</p>
                    <small>
                      {SENDER_LABEL[m.sender]} · {time.format(new Date(m.createdAt))}
                      {m.failed && <span className={styles.failed}> · No se pudo enviar</span>}
                    </small>
                  </div>
                ))}
              </div>

              <dl className={styles.details}>
                {(
                  [
                    ['Nombre', current.collected?.name],
                    ['Email', current.collected?.email],
                    ['Empresa', current.collected?.company],
                    ['Cargo', current.collected?.role],
                    ['Tamaño', current.collected?.companySize],
                    ['Necesidad', current.collected?.need],
                  ] as const
                ).map(([label, value]) => (
                  <div key={label}>
                    <dt>{label}</dt>
                    <dd>{value || '—'}</dd>
                  </div>
                ))}
                {current.lead && <Link href={`/admin/collections/leads/${current.lead}`}>Ver oportunidad</Link>}
              </dl>
            </div>

            {error && (
              <p role="alert" className={styles.error}>
                {error}
              </p>
            )}

            {windowOpen ? (
              <form onSubmit={send} className={styles.composer}>
                <label className={styles.srOnly} htmlFor="reply">
                  Tu respuesta
                </label>
                <textarea
                  id="reply"
                  rows={2}
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      send()
                    }
                  }}
                  placeholder={current.status === 'humano' ? 'Escribí tu respuesta' : 'Si respondés, tomás el control'}
                />
                <button type="submit" disabled={busy || !text.trim()} className={styles.primary}>
                  Enviar
                </button>
              </form>
            ) : (
              <p className={styles.closed}>{ERRORS.window_closed}</p>
            )}
          </>
        )}
      </section>
    </div>
  )
}
