'use client'

import { useState } from 'react'
import styles from './ia.module.css'

/** Name, the purchase email and an optional note. Answers with the case code. */
export function WithdrawalForm() {
  const [state, setState] = useState<{ code?: string; error?: string; busy?: boolean }>({})

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    setState({ busy: true })
    const res = await fetch('/api/masterclass/arrepentimiento', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(Object.fromEntries(form)),
    }).catch(() => null)
    const data = (await res?.json().catch(() => ({}))) as { code?: string; error?: string } | undefined
    if (res?.ok && data?.code) setState({ code: data.code })
    else
      setState({
        error:
          data?.error === 'invalid_fields'
            ? 'Revisá tu nombre y el email con el que compraste.'
            : 'No se pudo enviar. Probá de nuevo en un momento.',
      })
  }

  if (state.code) {
    return (
      <p className={styles.guarantee} role="status">
        Recibimos tu pedido. Tu código de trámite es {state.code}. También te lo mandamos por mail.
      </p>
    )
  }

  return (
    <form className={styles.form} onSubmit={submit}>
      <label className={styles.field}>
        Nombre y apellido
        <input name="name" required autoComplete="name" />
      </label>
      <label className={styles.field}>
        Email con el que compraste
        <input name="email" type="email" required autoComplete="email" />
      </label>
      <label className={styles.field}>
        Comentario (opcional)
        <input name="detail" />
      </label>
      {state.error && (
        <p className={styles.formError} role="alert">
          {state.error}
        </p>
      )}
      <button type="submit" className={`${styles.btn} ${styles.btnDark}`} disabled={state.busy}>
        {state.busy ? 'Enviando…' : 'Pedir la devolución'}
      </button>
    </form>
  )
}
