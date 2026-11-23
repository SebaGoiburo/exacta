'use client'

import { useEffect, useState } from 'react'

const RESULTS: Record<string, string> = {
  not_configured: 'Falta pegar la URL de inicio de sesión de Meta en Ajustes.',
  not_admin: 'Solo un administrador puede conectar cuentas.',
  expired: 'Pasó demasiado tiempo o se abrió en otra pestaña. Probá de nuevo.',
  cancelled: 'Se canceló la conexión en Meta.',
  missing_permissions:
    'Meta no dio todos los permisos. La configuración tiene que incluir instagram_basic, instagram_manage_messages e instagram_manage_comments.',
  no_accounts:
    'Meta conectó, pero no encontramos la cuenta de Instagram entre lo compartido. Si Meta te deja elegir activos, marcá la cuenta de Instagram de Exacta. Si vuelve a pasar, quedó registrado qué respondió Meta para revisarlo.',
  no_access:
    'Meta conectó, pero no deja leer las cuentas. Agregá el permiso business_management a la configuración y volvé a conectar.',
  exchange_failed: 'Meta no aceptó la conexión. Revisá que la URL de redireccionamiento esté registrada en la app.',
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
      {connected
        ? `Listo: ${result
            .slice('connected:'.length)
            .split(',')
            .map((u) => `@${u}`)
            .join(' y ')} ya ${result.includes(',') ? 'responden solas' : 'responde sola'}.`
        : (RESULTS[result] ?? RESULTS.failed)}
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
