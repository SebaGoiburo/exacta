'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import styles from './board.module.css'

export type BoardLead = {
  id: number
  title: string
  stage: string
  tier: string | null
  fit: number | null
  maturity: number | null
  contact: string
  company: string
  phone: string
  revenue: number | null
  createdAt: string
}

type Stage = { label: string; value: string }

const TIERS = ['A', 'B', 'C']

const money = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 })
const dateLabel = new Intl.DateTimeFormat('es-AR', { day: '2-digit', month: 'short' })

export function PipelineBoard({ leads: initial, stages }: { leads: BoardLead[]; stages: Stage[] }) {
  const [leads, setLeads] = useState(initial)
  const [tiers, setTiers] = useState<string[]>([])
  const [dragging, setDragging] = useState<number | null>(null)
  const [over, setOver] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const visible = useMemo(
    () => (tiers.length ? leads.filter((l) => l.tier && tiers.includes(l.tier)) : leads),
    [leads, tiers],
  )

  /** Moves the card right away and puts it back if the server refuses. */
  async function move(id: number, stage: string) {
    const lead = leads.find((l) => l.id === id)
    if (!lead || lead.stage === stage) return
    const previous = lead.stage
    const setStage = (value: string) =>
      setLeads((all) => all.map((l) => (l.id === id ? { ...l, stage: value } : l)))

    setError(null)
    setStage(stage)
    try {
      const res = await fetch(`/api/leads/${id}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stage }),
      })
      if (!res.ok) throw new Error(String(res.status))
    } catch {
      setStage(previous)
      setError(`No se pudo mover "${lead.title}". Probá de nuevo.`)
    }
  }

  const toggleTier = (tier: string) =>
    setTiers((all) => (all.includes(tier) ? all.filter((t) => t !== tier) : [...all, tier]))

  return (
    <>
      <div className={styles.toolbar}>
        <span>Perfil:</span>
        {TIERS.map((tier) => (
          <button
            key={tier}
            type="button"
            aria-pressed={tiers.includes(tier)}
            onClick={() => toggleTier(tier)}
            className={styles.filter}
          >
            {tier}
          </button>
        ))}
        {error && (
          <p role="alert" className={styles.error}>
            {error}
          </p>
        )}
      </div>

      <div className={styles.board}>
        {stages.map((stage) => {
          const cards = visible.filter((l) => l.stage === stage.value)
          const total = cards.reduce((sum, l) => sum + (l.revenue ?? 0), 0)
          return (
            <section
              key={stage.value}
              aria-label={stage.label}
              className={`${styles.column} ${over === stage.value ? styles.columnOver : ''}`}
              onDragOver={(e) => {
                e.preventDefault()
                setOver(stage.value)
              }}
              onDragLeave={(e) => {
                if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setOver(null)
              }}
              onDrop={(e) => {
                e.preventDefault()
                setOver(null)
                if (dragging !== null) void move(dragging, stage.value)
              }}
            >
              <header className={styles.columnHead}>
                <h2>{stage.label}</h2>
                <span>{cards.length}</span>
              </header>
              {total > 0 && <p className={styles.total}>{money.format(total)}</p>}

              <ul className={styles.cards}>
                {cards.map((lead) => (
                  <li
                    key={lead.id}
                    draggable
                    onDragStart={() => setDragging(lead.id)}
                    onDragEnd={() => setDragging(null)}
                    className={`${styles.card} ${dragging === lead.id ? styles.cardDragging : ''}`}
                  >
                    <div className={styles.cardTop}>
                      <Link href={`/admin/collections/leads/${lead.id}`} className={styles.cardTitle}>
                        {lead.company || lead.contact || lead.title}
                      </Link>
                      {lead.tier && (
                        <span className={styles.tier} data-tier={lead.tier} title={`Ajuste al perfil: ${lead.fit ?? '-'}/100`}>
                          {lead.tier}
                        </span>
                      )}
                    </div>
                    {lead.company && lead.contact && <p className={styles.meta}>{lead.contact}</p>}
                    {lead.phone && <p className={styles.meta}>{lead.phone}</p>}
                    <p className={styles.meta}>
                      {dateLabel.format(new Date(lead.createdAt))}
                      {lead.maturity !== null && ` · Madurez ${lead.maturity}`}
                    </p>
                    {/* Touch screens and keyboards can't drag, so each card can also move from here. */}
                    <label className={styles.move}>
                      <span className={styles.srOnly}>Etapa de {lead.title}</span>
                      <select value={lead.stage} onChange={(e) => void move(lead.id, e.target.value)}>
                        {stages.map((s) => (
                          <option key={s.value} value={s.value}>
                            {s.label}
                          </option>
                        ))}
                      </select>
                    </label>
                  </li>
                ))}
              </ul>
            </section>
          )
        })}
      </div>
    </>
  )
}
