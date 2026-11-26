'use client'

import { useEffect, useState } from 'react'
import { getAttribution, track } from '@/lib/analytics'
import styles from './ia.module.css'

const SAVED = 'iah-enroll'

const ERRORS: Record<string, string> = {
  not_configured: 'Las inscripciones abren en unas horas. Escribinos por WhatsApp y te avisamos apenas estén.',
  sold_out: 'Se acaba de ocupar el último lugar. Escribinos por WhatsApp y te avisamos si se libera uno.',
  closed: 'Las inscripciones para esta clase están cerradas. Escribinos por WhatsApp para la próxima.',
  too_many_requests: 'Hubo demasiados intentos seguidos. Esperá unos minutos y probá de nuevo.',
  failed: 'No pudimos conectar con Mercado Pago. Probá de nuevo en un momento o escribinos por WhatsApp.',
}

const FIELD_ERRORS: Record<string, string> = {
  name: 'Escribí tu nombre.',
  email: 'Revisá el email: ahí te llega el enlace de la clase.',
  phone: 'Escribí tu WhatsApp con característica, por ejemplo 261 555 1234.',
}

type Fields = { name: string; email: string; phone: string }

/** Name, email and WhatsApp, then Mercado Pago. What was typed is kept for this tab, in case the payment fails. */
export function EnrollForm({ price, whatsapp }: { price: number; whatsapp: string }) {
  const [fields, setFields] = useState<Fields>({ name: '', email: '', phone: '' })
  const [invalid, setInvalid] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    try {
      const saved = JSON.parse(sessionStorage.getItem(SAVED) ?? 'null') as Fields | null
      if (saved) setFields(saved)
    } catch {
      // Private windows can refuse storage: the form simply starts empty.
    }
  }, [])

  const set = (key: keyof Fields) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setFields((f) => ({ ...f, [key]: e.target.value }))
    setInvalid((list) => list.filter((k) => k !== key))
  }

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (busy) return
    setBusy(true)
    setError(null)
    try {
      sessionStorage.setItem(SAVED, JSON.stringify(fields))
    } catch {
      // Not needed to pay.
    }
    track('initiate_checkout', { value: price, currency: 'ARS', content_name: 'Masterclass IA para Humanos' })
    try {
      const form = new FormData(e.currentTarget)
      const res = await fetch('/api/masterclass/enroll', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ ...fields, website: form.get('website'), attribution: getAttribution() }),
      })
      const data = (await res.json().catch(() => ({}))) as { url?: string; error?: string; fields?: string[] }
      if (res.ok && data.url) {
        window.location.assign(data.url)
        return
      }
      if (data.error === 'invalid_fields' && data.fields) setInvalid(data.fields)
      else setError(ERRORS[data.error ?? 'failed'] ?? ERRORS.failed)
    } catch {
      setError(ERRORS.failed)
    }
    setBusy(false)
  }

  const field = (key: keyof Fields, label: string, type: string, autoComplete: string, inputMode?: 'email' | 'tel') => (
    <label className={styles.field}>
      {label}
      <input
        name={key}
        type={type}
        required
        autoComplete={autoComplete}
        inputMode={inputMode}
        value={fields[key]}
        onChange={set(key)}
        aria-invalid={invalid.includes(key) || undefined}
        aria-describedby={invalid.includes(key) ? `iah-${key}-error` : undefined}
      />
      {invalid.includes(key) && (
        <span id={`iah-${key}-error`} className={styles.fieldError}>
          {FIELD_ERRORS[key]}
        </span>
      )}
    </label>
  )

  return (
    <form className={styles.form} onSubmit={submit} noValidate>
      {field('name', 'Nombre y apellido', 'text', 'name')}
      {field('email', 'Email', 'email', 'email', 'email')}
      {field('phone', 'WhatsApp', 'tel', 'tel', 'tel')}
      <input className={styles.honey} type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" />
      {error && (
        <p className={styles.formError} role="alert">
          {error}{' '}
          <a href={whatsapp} target="_blank" rel="noopener noreferrer">
            Escribir por WhatsApp
          </a>
        </p>
      )}
      <button type="submit" className={`${styles.btn} ${styles.btnDark} ${styles.btnWide}`} disabled={busy}>
        {busy ? 'Abriendo Mercado Pago…' : 'Ir a pagar con Mercado Pago'}
        {!busy && (
          <span className={styles.arrow} aria-hidden="true">
            →
          </span>
        )}
      </button>
      <p className={styles.formNote}>
        Te lleva a la página segura de Mercado Pago. Tu lugar queda reservado 30 minutos mientras pagás.
      </p>
    </form>
  )
}
