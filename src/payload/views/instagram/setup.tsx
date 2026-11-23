import type { Payload } from 'payload'
import { appConfig, redirectUri, refreshTokens, webhookUrl, webhookVerifyToken } from '@/lib/instagram/service'
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
  const { appId, appSecret } = await appConfig(payload).catch(() => ({ appId: '', appSecret: '' }))
  const configured = Boolean(appId && appSecret)
  await refreshTokens(payload).catch(() => undefined)
  const { docs } = await payload.find({ collection: 'instagram-accounts', limit: 20, overrideAccess: true, depth: 0 })
  const soon = docs.filter((a) => a.tokenExpiresAt && Date.parse(a.tokenExpiresAt) - Date.now() < 15 * 24 * 60 * 60 * 1000)

  return (
    <section style={box}>
      <ConnectResult />
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ display: 'grid', gap: 4 }}>
          <h2 style={{ margin: 0, fontSize: 18 }}>Respuestas automáticas de Instagram</h2>
          <p style={muted}>
            Conectá cada cuenta una vez. Después, las palabras clave responden solas y suman a la persona al pipeline.
          </p>
        </div>
        {isAdmin && configured && (
          <a href="/api/instagram/connect" className="btn btn--style-primary btn--size-medium" style={{ margin: 0 }}>
            Conectar cuenta de Instagram
          </a>
        )}
      </div>

      {!configured && (
        <p style={{ margin: 0 }}>
          <strong>Falta un paso:</strong> cargá el identificador y la clave secreta de la app de Instagram en{' '}
          <a href="/admin/globals/settings">Ajustes</a> → "Respuestas automáticas de Instagram".
        </p>
      )}

      {soon.map((a) => (
        <p key={a.id} style={{ margin: 0, color: 'var(--theme-error-500)' }}>
          El permiso de @{a.username} vence el {new Date(a.tokenExpiresAt!).toLocaleDateString('es-AR')}. Volvé a conectarla.
        </p>
      ))}

      {isAdmin && (
        <details>
          <summary style={{ cursor: 'pointer' }}>Datos para configurar la app en Meta</summary>
          <div style={{ display: 'grid', gap: 10, marginTop: 12 }}>
            <p style={muted}>
              En Meta for Developers → la app → Instagram → "Configuración de la API con inicio de sesión para empresas":
            </p>
            <CopyValue label="URL de devolución de llamada (webhooks)" value={webhookUrl()} />
            <CopyValue label="Token de verificación" value={webhookVerifyToken()} />
            <CopyValue label="URI de redireccionamiento de OAuth válido" value={redirectUri()} />
            <p style={muted}>En los webhooks, suscribí los campos "comments" y "messages".</p>
          </div>
        </details>
      )}
    </section>
  )
}
