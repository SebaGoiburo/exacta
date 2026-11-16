import type { Payload } from 'payload'
import { spendBetween, type AiFeature } from '@/lib/ai-usage'

const NAMES: Record<AiFeature, string> = { prospectos: 'Prospectos', whatsapp: 'WhatsApp', contenido: 'Contenido' }
/** The monthly budget for every external service together. */
const BUDGET_USD = 20
const AR_OFFSET_MS = 3 * 60 * 60 * 1000

/** First instant of a month in Argentina (UTC-3), `back` months before the current one. */
function monthStart(back = 0) {
  const ar = new Date(Date.now() - AR_OFFSET_MS)
  return new Date(Date.UTC(ar.getUTCFullYear(), ar.getUTCMonth() - back, 1) + AR_OFFSET_MS)
}

const usd = (n: number) => `US$ ${n.toFixed(2).replace('.', ',')}`

/** On the admin home: what Claude cost this month, per feature, against the budget. */
export async function AiSpend({ payload }: { payload: Payload }) {
  const [now, before] = await Promise.all([
    spendBetween(payload, monthStart(), new Date()),
    spendBetween(payload, monthStart(1), monthStart()),
  ]).catch(() => [null, null])
  if (!now || !before) return null
  const share = Math.min(100, Math.round((now.total / BUDGET_USD) * 100))

  return (
    <section
      style={{
        marginBottom: 24,
        padding: 20,
        border: '1px solid var(--theme-elevation-150)',
        borderRadius: 6,
        display: 'grid',
        gap: 12,
      }}
    >
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'baseline', gap: '4px 16px' }}>
        <h2 style={{ margin: 0, fontSize: 18 }}>Gasto en IA este mes</h2>
        <strong style={{ fontSize: 24 }}>{usd(now.total)}</strong>
        <span style={{ color: 'var(--theme-elevation-700)' }}>
          {share}% del presupuesto de US$ {BUDGET_USD} · mes anterior: {usd(before.total)}
        </span>
      </div>
      <div aria-hidden style={{ height: 6, borderRadius: 3, background: 'var(--theme-elevation-100)', overflow: 'hidden' }}>
        <div style={{ width: `${share}%`, height: '100%', background: share >= 80 ? '#d9534f' : '#cc57c7' }} />
      </div>
      <ul style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 24px', margin: 0, padding: 0, listStyle: 'none' }}>
        {(Object.keys(NAMES) as AiFeature[]).map((f) => (
          <li key={f}>
            {NAMES[f]}: <strong>{usd(now.byFeature[f])}</strong>
          </li>
        ))}
      </ul>
      <p style={{ margin: 0, fontSize: 13, color: 'var(--theme-elevation-700)' }}>
        Se anota cada llamada a Claude con sus tokens, a precio de lista. Google Maps y Speech-to-Text no se cuentan acá: se ven
        en Google Cloud, en Facturación. <a href="/admin/collections/ai-usage">Ver el detalle</a>
      </p>
    </section>
  )
}
