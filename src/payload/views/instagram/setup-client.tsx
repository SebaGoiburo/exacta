'use client'

import { useEffect, useState } from 'react'

const RESULTS: Record<string, string> = {
  not_configured: 'Falta cargar el identificador y la clave de la app de Instagram en Ajustes.',
  not_admin: 'Solo un administrador puede conectar cuentas.',
  expired: 'Pasó demasiado tiempo o se abrió en otra pestaña. Probá de nuevo.',
  cancelled: 'Se canceló la conexión en Instagram.',
  missing_permissions: 'Instagram no dio todos los permisos. Volvé a conectar y aceptá todo lo que pide.',
  exchange_failed:
    'Instagram no aceptó la conexión. Revisá que el identificador y la clave de Ajustes sean los de la app de Instagram.',
  failed: 'Algo falló al conectar. Probá de nuevo en unos minutos.',
}

/** The message after coming back from Instagram's sign-in (?ig=...). */
export function ConnectResult() {
  const [result, setResult] = useState<string | null>(null)
  useEffect(() => {
    setResult(new URLSearchParams(window.location.search).get('ig'))
  }, [])
  if (!result) return null
  const connected = result.startsWith('connected:')
  return (
    <p
      role="status"
      style={{
        margin: 0,
        padding: '10px 14px',
        borderRadius: 4,
        background: connected ? 'var(--theme-success-100)' : 'var(--theme-error-100)',
        color: connected ? 'var(--theme-success-800)' : 'var(--theme-error-800)',
      }}
    >
      {connected ? `Listo: @${result.slice('connected:'.length)} ya responde sola.` : (RESULTS[result] ?? RESULTS.failed)}
    </p>
  )
}

export function CopyValue({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <div style={{ display: 'grid', gap: 4 }}>
      <span style={{ fontSize: 13, color: 'var(--theme-elevation-700)' }}>{label}</span>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <code style={{ padding: '6px 10px', background: 'var(--theme-elevation-50)', borderRadius: 4, wordBreak: 'break-all' }}>
          {value}
        </code>
        <button
          type="button"
          className="btn btn--style-secondary btn--size-small"
          style={{ margin: 0 }}
          onClick={() => {
            void navigator.clipboard.writeText(value).then(() => {
              setCopied(true)
              setTimeout(() => setCopied(false), 1500)
            })
          }}
        >
          {copied ? 'Copiado' : 'Copiar'}
        </button>
      </div>
    </div>
  )
}
