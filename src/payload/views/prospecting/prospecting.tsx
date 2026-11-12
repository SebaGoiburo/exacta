'use client'

import { useCallback, useEffect, useState } from 'react'
import { generatorView, type Batch, type Profile } from './api'
import { Batches } from './batches'
import { Calls } from './calls'
import { ManualSearch } from './manual'
import { Profiles } from './profiles'
import styles from './prospecting.module.css'

const TABS = [
  { id: 'tandas', label: 'Tandas' },
  { id: 'llamadas', label: 'Llamadas de hoy' },
  { id: 'perfiles', label: 'Perfiles de oferta' },
  { id: 'manual', label: 'Búsqueda manual' },
] as const
type Tab = (typeof TABS)[number]['id']

type Overview = { configured: boolean; profiles: Profile[]; batches: Batch[]; working: number }

/** The prospect generator: batches by offer and niche, today's calls, and the offer profiles behind the formula. */
export function Prospecting({ configured }: { configured: boolean }) {
  const [tab, setTab] = useState<Tab>('tandas')
  const [overview, setOverview] = useState<Overview | null>(null)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    try {
      setOverview(await generatorView<Overview>({}))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cargar.')
    }
  }, [])

  useEffect(() => {
    const requested = new URLSearchParams(window.location.search).get('tab')
    if (TABS.some((t) => t.id === requested)) setTab(requested as Tab)
    void reload()
  }, [reload])

  return (
    <div className={styles.wrap}>
      {!configured && (
        <p className={styles.notice}>Falta configurar la clave de Google Maps en el servidor. Mientras tanto, no se pueden buscar comercios.</p>
      )}
      <div role="tablist" className={styles.tabs}>
        {TABS.map((t) => (
          <button key={t.id} type="button" role="tab" aria-selected={tab === t.id} onClick={() => setTab(t.id)}>
            {t.label}
          </button>
        ))}
      </div>
      {error && (
        <p role="alert" className={styles.error}>
          {error}
        </p>
      )}

      {tab === 'tandas' &&
        (overview ? (
          <Batches configured={configured} profiles={overview.profiles} batches={overview.batches} reload={reload} />
        ) : (
          <p>Cargando…</p>
        ))}
      {tab === 'llamadas' && <Calls configured={configured} />}
      {tab === 'perfiles' &&
        (overview ? <Profiles profiles={overview.profiles} working={overview.working} reload={reload} /> : <p>Cargando…</p>)}
      {tab === 'manual' && <ManualSearch configured={configured} />}
    </div>
  )
}
