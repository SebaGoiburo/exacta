'use client'

import { useEffect, useState } from 'react'
import type { Place } from '@/lib/places'
import { dayText, generator, loadLabels, reportLink, type GeneratedProspect, type ReportContent } from './api'
import base from './prospecting.module.css'
import styles from './generator.module.css'

type Finding = ReportContent['findings'][number]

const SOURCE_NAMES: Record<string, string> = {
  google_maps: 'Google Maps',
  sitio: 'Su sitio web',
  pagespeed: 'Google PageSpeed',
}

/** The first message: one concrete finding and the report as the reason to talk. Always sent by a person. */
function firstMessage(p: GeneratedProspect, report: ReportContent, link: string) {
  const name = p.research?.decisionMaker.name?.split(' ')[0]
  return [
    `Hola${name ? ` ${name}` : ''}, ¿cómo estás? Soy de Exacta, de Mendoza.`,
    p.hook || report.findings[0]?.detail || '',
    `Te armé un informe corto sobre ${report.company} con eso y dos puntos más: ${link}`,
    '¿Te parece si lo vemos en 20 minutos esta semana?',
    'Si no te interesa, avisame y no te escribo más.',
  ]
    .filter(Boolean)
    .join('\n\n')
}

/** SVG is left out on purpose: served from our own domain it could carry a script. */
const LOGO_TYPES = ['image/png', 'image/jpeg', 'image/webp']
const LOGO_MAX_BYTES = 2 * 1024 * 1024

export function ReportEditor({ prospect, onSaved }: { prospect: GeneratedProspect; onSaved: () => void }) {
  const [report, setReport] = useState<ReportContent | null>(prospect.report ?? null)
  const [channel, setChannel] = useState('whatsapp')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const approved = Boolean(prospect.reportReviewedAt && prospect.reportToken)
  const [names, setNames] = useState<Record<string, Place>>({})
  const competitorIds = (report?.competitors ?? []).map((c) => c.placeId).join(',')

  // Competitor names come live from Google: asked once when the report is drafted or opened.
  useEffect(() => {
    if (!competitorIds) return
    loadLabels(competitorIds.split(','))
      .then(setNames)
      .catch(() => undefined)
  }, [competitorIds])

  async function run(work: () => Promise<void>, done?: string) {
    setBusy(true)
    setMessage(null)
    try {
      await work()
      if (done) setMessage(done)
      onSaved()
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Algo falló.')
    } finally {
      setBusy(false)
    }
  }

  const draft = () =>
    run(async () => {
      const data = await generator<{ report: ReportContent }>({
        action: 'report-draft',
        prospectId: prospect.id,
      })
      setReport(data.report)
    })

  // Only the comparison table changes: whatever was written in the report stays as it is on screen.
  const findCompetitors = () =>
    run(async () => {
      const data = await generator<{ report: ReportContent }>({
        action: 'report-competitors',
        prospectId: prospect.id,
      })
      setReport((r) =>
        r
          ? {
              ...r,
              self: data.report.self,
              competitors: data.report.competitors,
            }
          : data.report,
      )
    }, 'Competidores agregados. Ya se ven en el informe.')

  // The logo is saved right away, together with whatever was being edited, so it can't be lost by not saving.
  const saveWithLogo = async (logo: ReportContent['logo']) => {
    if (!report) return
    const data = await generator<{ report: ReportContent }>({
      action: 'report-save',
      prospectId: prospect.id,
      report: { ...report, logo },
    })
    setReport((r) => (r ? { ...r, logo: data.report.logo ?? null } : data.report))
    if (logo && !data.report.logo) throw new Error('El logo no se pudo usar. Subilo en PNG, JPG o WEBP.')
  }

  const uploadLogo = (file: File) => {
    if (!LOGO_TYPES.includes(file.type)) return setMessage('Subí el logo en PNG, JPG o WEBP.')
    if (file.size > LOGO_MAX_BYTES) return setMessage('El logo pesa más de 2 MB. Probá con uno más liviano.')
    void run(async () => {
      const form = new FormData()
      form.append('file', file)
      form.append('_payload', JSON.stringify({ alt: `Logo de ${report?.company ?? 'la empresa'}` }))
      const res = await fetch('/api/media', {
        method: 'POST',
        credentials: 'include',
        body: form,
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || !data?.doc?.id) throw new Error('No se pudo subir el logo. Probá de nuevo.')
      await saveWithLogo({ id: data.doc.id, url: data.doc.url })
    }, 'Logo guardado. Ya se ve en el informe.')
  }

  const removeLogo = () => run(() => saveWithLogo(null), 'Logo quitado del informe.')

  const save = () =>
    run(
      async () =>
        void (await generator({
          action: 'report-save',
          prospectId: prospect.id,
          report,
        })),
      'Cambios guardados.',
    )

  const approve = () => {
    if (!report?.note && !window.confirm('El informe no tiene tu observación propia. ¿Lo aprobás igual?')) return
    void run(async () => {
      await generator({
        action: 'report-save',
        prospectId: prospect.id,
        report,
      })
      await generator({ action: 'report-approve', prospectId: prospect.id })
    }, 'Informe aprobado. Ya tiene su enlace.')
  }

  const sent = () =>
    run(
      async () =>
        void (await generator({
          action: 'attempt',
          prospectId: prospect.id,
          channel,
          result: 'enviado',
        })),
      'Envío registrado. Aparece en Llamadas de hoy cuando toque el seguimiento.',
    )

  const set = <K extends keyof ReportContent>(key: K, value: ReportContent[K]) =>
    setReport((r) => (r ? { ...r, [key]: value } : r))
  const setFinding = (i: number, key: keyof Finding, value: string) =>
    setReport((r) =>
      r
        ? {
            ...r,
            findings: r.findings.map((f, k) => (k === i ? { ...f, [key]: value } : f)),
          }
        : r,
    )

  if (!report) {
    return (
      <div className={styles.editor}>
        <p style={{ margin: 0 }}>
          {prospect.pass === 2
            ? 'El borrador sale de la investigación con IA y suma a los tres primeros de Google Maps en su rubro. El primero de cada rubro tarda hasta un minuto, porque mide los sitios de esos competidores; los siguientes salen al instante.'
            : 'Este prospecto todavía no tiene investigación con IA: el borrador va a salir casi vacío.'}
        </p>
        <button type="button" className={base.primary} disabled={busy} onClick={() => void draft()}>
          Armar borrador del informe
        </button>
      </div>
    )
  }

  const link = prospect.reportToken ? reportLink(prospect.reportToken) : ''

  return (
    <div className={styles.editor}>
      <h3 style={{ margin: 0 }}>Informe</h3>
      <div className={styles.twoCols}>
        <label className={styles.field}>
          Empresa
          <input value={report.company} onChange={(e) => set('company', e.target.value)} />
        </label>
        <label className={styles.field}>
          Título
          <input value={report.headline} onChange={(e) => set('headline', e.target.value)} />
        </label>
      </div>
      <div className={styles.logoField}>
        <strong>Logo del cliente</strong>
        {report.logo ? (
          <div className={styles.logoRow}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={report.logo.url} alt={`Logo de ${report.company}`} className={styles.logoPreview} />
            <button type="button" disabled={busy} onClick={() => void removeLogo()}>
              Quitar logo
            </button>
          </div>
        ) : (
          <span className={styles.muted}>Se muestra junto al título del informe. PNG, JPG o WEBP, hasta 2 MB.</span>
        )}
        <input
          type="file"
          accept={LOGO_TYPES.join(',')}
          disabled={busy}
          aria-label={report.logo ? 'Cambiar el logo' : 'Subir el logo'}
          onChange={(e) => {
            const file = e.target.files?.[0]
            e.target.value = ''
            if (file) uploadLogo(file)
          }}
        />
      </div>

      <label className={styles.field}>
        Introducción
        <textarea rows={3} value={report.intro} onChange={(e) => set('intro', e.target.value)} />
      </label>

      {report.findings.map((f, i) => (
        <div key={i} className={styles.finding}>
          <label className={styles.field}>
            Hallazgo {i + 1}
            <input value={f.title} onChange={(e) => setFinding(i, 'title', e.target.value)} />
          </label>
          <label className={styles.field}>
            El dato
            <textarea rows={2} value={f.detail} onChange={(e) => setFinding(i, 'detail', e.target.value)} />
          </label>
          <label className={styles.field}>
            Por qué importa
            <textarea rows={2} value={f.impact} onChange={(e) => setFinding(i, 'impact', e.target.value)} />
          </label>
          <span className={styles.muted}>
            Fuente:{' '}
            {SOURCE_NAMES[f.source] ??
              (f.source.startsWith('http') ? (
                <a href={f.source} target="_blank" rel="noopener noreferrer">
                  {f.source}
                </a>
              ) : (
                f.source
              ))}
          </span>
        </div>
      ))}
      {!report.findings.length && <p className={base.error}>No hay hallazgos con fuente. Sin hallazgos no conviene enviarlo.</p>}

      <div className={styles.finding}>
        <strong>Competidores que se muestran en la tabla</strong>
        {(report.competitors ?? []).length ? (
          <ul style={{ margin: 0, paddingLeft: 18 }}>
            {(report.competitors ?? []).map((c) => (
              <li key={c.placeId}>
                {names[c.placeId]?.name ?? 'Cargando…'}{' '}
                <span className={styles.muted}>
                  (puesto {c.position} en Google Maps
                  {c.pageSpeed !== null ? `, velocidad ${c.pageSpeed}/100` : ''}
                  {c.website === 'own' && c.booking !== null ? `, turnos online: ${c.booking ? 'sí' : 'no'}` : ''})
                </span>{' '}
                <button
                  type="button"
                  disabled={busy}
                  onClick={() =>
                    set(
                      'competitors',
                      (report.competitors ?? []).filter((x) => x.placeId !== c.placeId),
                    )
                  }
                >
                  Quitar
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <span className={styles.muted}>No hay competidores para mostrar.</span>
        )}
        <span className={styles.muted}>Si quitás uno, guardá los cambios para que no aparezca en el informe.</span>
        <div>
          <button type="button" disabled={busy} onClick={() => void findCompetitors()}>
            {(report.competitors ?? []).length ? 'Volver a buscar competidores' : 'Buscar competidores en Google'}
          </button>{' '}
          <span className={styles.muted}>Puede tardar hasta un minuto. No cambia lo que escribiste.</span>
        </div>
      </div>

      <label className={styles.field}>
        Frente a los primeros de su zona
        <textarea rows={3} value={report.comparison} onChange={(e) => set('comparison', e.target.value)} />
      </label>
      <div className={styles.twoCols}>
        <label className={styles.field}>
          Cuánto le cuesta (fórmula)
          <textarea rows={3} value={report.costFormula} onChange={(e) => set('costFormula', e.target.value)} />
        </label>
        <label className={styles.field}>
          Pregunta abierta
          <textarea rows={3} value={report.question} onChange={(e) => set('question', e.target.value)} />
        </label>
      </div>
      <label className={styles.field}>
        Tu observación propia (lo que viste vos en 10 minutos)
        <textarea rows={3} value={report.note} onChange={(e) => set('note', e.target.value)} />
      </label>
      <label className={styles.field}>
        Lo que ya hicimos (caso o producto)
        <textarea rows={3} value={report.proof} onChange={(e) => set('proof', e.target.value)} />
      </label>

      <div className={styles.actions}>
        <button type="button" disabled={busy} onClick={() => void save()}>
          Guardar cambios
        </button>
        <button type="button" className={base.primary} disabled={busy || !report.findings.length} onClick={approve}>
          {approved ? 'Guardar y mantener aprobado' : 'Aprobar informe'}
        </button>
      </div>

      {approved && (
        <>
          <p style={{ margin: 0 }}>
            Enlace:{' '}
            <a className={styles.link} href={link} target="_blank" rel="noopener noreferrer">
              {link}
            </a>{' '}
            <button type="button" onClick={() => void navigator.clipboard.writeText(link)}>
              Copiar
            </button>
            {prospect.reportExpiresAt && <span className={styles.muted}> · vence el {dayText(prospect.reportExpiresAt)}</span>}
          </p>
          <label className={styles.field}>
            Mensaje sugerido para el primer contacto
            <textarea rows={7} readOnly value={firstMessage(prospect, report, link)} />
          </label>
          {prospect.reportSentAt ? (
            <p className={styles.muted}>Enviado el {dayText(prospect.reportSentAt)}. El seguimiento sigue en Llamadas de hoy.</p>
          ) : (
            <div className={styles.inline}>
              <select value={channel} onChange={(e) => setChannel(e.target.value)} aria-label="Canal">
                <option value="whatsapp">WhatsApp (a mano)</option>
                <option value="email">Email desde ventas@</option>
                <option value="instagram">Instagram</option>
                <option value="llamada">Llamada</option>
                <option value="visita">Visita</option>
              </select>
              <button type="button" disabled={busy} onClick={() => void sent()}>
                Marcar como enviado
              </button>
            </div>
          )}
        </>
      )}
      {message && <p className={styles.muted}>{message}</p>}
    </div>
  )
}
