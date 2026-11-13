'use client'

import { useEffect, useState } from 'react'
import type { Place } from '@/lib/places'
import { dayText, generator, loadLabels, reportLink, type GeneratedProspect, type ReportContent } from './api'
import base from './prospecting.module.css'
import styles from './generator.module.css'

type Finding = ReportContent['findings'][number]

const SOURCE_NAMES: Record<string, string> = { google_maps: 'Google Maps', sitio: 'Su sitio web', pagespeed: 'Google PageSpeed' }

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
      const data = await generator<{ report: ReportContent }>({ action: 'report-draft', prospectId: prospect.id })
      setReport(data.report)
    })

  const save = () => run(async () => void (await generator({ action: 'report-save', prospectId: prospect.id, report })), 'Cambios guardados.')

  const approve = () => {
    if (!report?.note && !window.confirm('El informe no tiene tu observación propia. ¿Lo aprobás igual?')) return
    void run(async () => {
      await generator({ action: 'report-save', prospectId: prospect.id, report })
      await generator({ action: 'report-approve', prospectId: prospect.id })
    }, 'Informe aprobado. Ya tiene su enlace.')
  }

  const sent = () =>
    run(async () => void (await generator({ action: 'attempt', prospectId: prospect.id, channel, result: 'enviado' })), 'Envío registrado. Aparece en Llamadas de hoy cuando toque el seguimiento.')

  const set = <K extends keyof ReportContent>(key: K, value: ReportContent[K]) => setReport((r) => (r ? { ...r, [key]: value } : r))
  const setFinding = (i: number, key: keyof Finding, value: string) =>
    setReport((r) => (r ? { ...r, findings: r.findings.map((f, k) => (k === i ? { ...f, [key]: value } : f)) } : r))

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
                  onClick={() => set('competitors', (report.competitors ?? []).filter((x) => x.placeId !== c.placeId))}
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
