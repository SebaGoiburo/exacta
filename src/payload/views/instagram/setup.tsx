import type { Payload } from 'payload'
import { appConfig, redirectUri, webhookUrl, webhookVerifyToken } from '@/lib/instagram/service'
import { ConnectResult, CopyValue } from './setup-client'

const box = {
  marginBottom: 24,
  padding: 20,
  border: '1px solid var(--theme-elevation-150)',
  borderRadius: 6,
  display: 'grid',
  gap: 14,
} as const

const muted = { color: 'var(--theme-elevation-700)', margin: 0 } as const

/** Above the accounts list: what Meta needs, and the button that connects an account. */
export async function InstagramSetup({ payload, user }: { payload: Payload; user?: { role?: string } | null }) {
  const isAdmin = user?.role === 'admin'
  const app = await appConfig(payload).catch(() => ({ appId: '', configId: '', appSecret: '' }))
  const configured = Boolean(app.appId && app.configId && app.appSecret)
  const { docs } = await payload.find({ collection: 'instagram-accounts', limit: 20, overrideAccess: true, depth: 0 })
  const soon = docs.filter((a) => a.tokenExpiresAt && Date.parse(a.tokenExpiresAt) - Date.now() < 15 * 24 * 60 * 60 * 1000)

  return (
    <section style={box}>
      <ConnectResult />
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ display: 'grid', gap: 4 }}>
          <h2 style={{ margin: 0, fontSize: 18 }}>Respuestas automáticas de Instagram</h2>
          <p style={muted}>
            Conectá las cuentas una vez. Después, las palabras clave responden solas y suman a la persona al pipeline.
          </p>
        </div>
        {isAdmin && configured && (
          <a href="/api/instagram/connect" className="btn btn--style-primary btn--size-medium" style={{ margin: 0 }}>
            Conectar cuentas de Instagram
          </a>
        )}
      </div>

      {!configured && (
        <p style={{ margin: 0 }}>
          <strong>Falta un paso:</strong>{' '}
          {app.appSecret ? (
            <>
              pegá la URL de inicio de sesión que genera Meta en <a href="/admin/globals/settings">Ajustes</a> → "Respuestas
              automáticas de Instagram".
            </>
          ) : (
            'el servidor no tiene la clave secreta de la app de Meta (META_APP_SECRET).'
          )}
        </p>
      )}

      {soon.map((a) => (
        <p key={a.id} style={{ margin: 0, color: 'var(--theme-error-500)' }}>
          El permiso de @{a.username} vence el {new Date(a.tokenExpiresAt!).toLocaleDateString('es-AR')}. Volvé a conectarla.
        </p>
      ))}

      {isAdmin && (
        <details open={!configured || !docs.length}>
          <summary style={{ cursor: 'pointer' }}>Datos para configurar la app en Meta</summary>
          <div style={{ display: 'grid', gap: 10, marginTop: 12 }}>
            <p style={muted}>
              1. En Meta for Developers → la app → Instagram → "API setup with Unified login", registrá esta URL de
              redireccionamiento:
            </p>
            <CopyValue label="URL de redireccionamiento" value={redirectUri()} />
            <p style={muted}>
              2. En Webhooks, elegí "Instagram" y cargá estos dos datos. Después suscribí "comments" y "messages":
            </p>
            <CopyValue label="URL de devolución de llamada" value={webhookUrl()} />
            <CopyValue label="Token de verificación" value={webhookVerifyToken()} />
          </div>
        </details>
      )}
    </section>
  )
}
