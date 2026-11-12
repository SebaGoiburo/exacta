'use client'

import { useState } from 'react'
import Link from 'next/link'
import { DIMENSION_NAMES, DIMENSIONS, generator, type Profile } from './api'
import base from './prospecting.module.css'
import styles from './generator.module.css'

/** Offer profiles: the six base ones, and new ones the AI drafts from free text for Sebastián to approve. */
export function Profiles({ profiles, working, reload }: { profiles: Profile[]; working: number; reload: () => Promise<void> }) {
  const [offer, setOffer] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  async function run(body: Record<string, unknown>, done: string) {
    setBusy(true)
    setMessage(null)
    try {
      await generator(body)
      setMessage(done)
      await reload()
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Algo falló.')
    } finally {
      setBusy(false)
    }
  }

  const drafts = profiles.filter((p) => p.status === 'borrador')
  const approved = profiles.filter((p) => p.status === 'aprobado')

  return (
    <div>
      <section className={styles.section}>
        <h2>Ofrecer otra cosa</h2>
        <p className={styles.muted}>
          Describí la oferta con tus palabras. La IA propone las señales que prueban la necesidad y los pesos, y queda como borrador hasta
          que lo apruebes. Cuesta unos centavos de dólar.
        </p>
        <label className={styles.field}>
          Qué queremos ofrecer
          <textarea
            rows={3}
            value={offer}
            onChange={(e) => setOffer(e.target.value)}
            placeholder="Por ejemplo: sistema de pedidos por WhatsApp para rotiserías, con menú, cobro y aviso a la cocina."
          />
        </label>
        <div className={styles.actions}>
          <button
            type="button"
            className={base.primary}
            disabled={busy || offer.trim().length < 10}
            onClick={() => void run({ action: 'propose-profile', offer }, 'Pedido enviado. El borrador aparece acá en un minuto: tocá Actualizar.').then(() => setOffer(''))}
          >
            Proponer perfil
          </button>
          <button type="button" disabled={busy} onClick={() => void reload()}>
            Actualizar
          </button>
          {working > 0 && <span className={styles.muted}>La IA está trabajando en {working} pedidos.</span>}
        </div>
        {message && <p className={styles.muted}>{message}</p>}
      </section>

      {drafts.length > 0 && (
        <section className={styles.section}>
          <h2>Borradores para aprobar</h2>
          {drafts.map((p) => (
            <ProfileCard key={p.id} profile={p}>
              <button type="button" className={base.primary} disabled={busy} onClick={() => void run({ action: 'approve-profile', id: p.id }, 'Perfil aprobado.')}>
                Aprobar
              </button>
            </ProfileCard>
          ))}
        </section>
      )}

      <section className={styles.section}>
        <h2>Perfiles aprobados</h2>
        {approved.map((p) => (
          <ProfileCard key={p.id} profile={p} />
        ))}
      </section>
    </div>
  )
}

function ProfileCard({ profile: p, children }: { profile: Profile; children?: React.ReactNode }) {
  return (
    <div className={styles.profileCard}>
      <div className={styles.summary}>
        <strong>{p.name}</strong>
        {p.origin === 'texto_libre' && <span className={styles.badge}>texto libre</span>}
        <span className={styles.muted}>Capacidad mínima: {p.minCapacity}</span>
      </div>
      <p style={{ margin: 0, whiteSpace: 'pre-line' }}>{p.description}</p>
      <div className={styles.weights}>
        {DIMENSIONS.map((d) => (
          <span key={d}>
            {DIMENSION_NAMES[d]}: <strong>{p.weights[d]}</strong>
          </span>
        ))}
      </div>
      <ul style={{ margin: 0, paddingLeft: 18 }}>
        {(p.signals ?? []).map((s) => (
          <li key={s.key}>
            {s.label} <span className={styles.muted}>({s.weight} puntos{s.key.startsWith('ia:') ? ', la evalúa la IA' : ', automática'})</span>
          </li>
        ))}
      </ul>
      <div className={styles.actions}>
        {children}
        <Link href={`/admin/collections/offer-profiles/${p.id}`}>Editar pesos y señales</Link>
      </div>
    </div>
  )
}
