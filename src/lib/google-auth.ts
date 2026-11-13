import { createSign } from 'node:crypto'

/*
 * Access tokens for the site's Google service account (GOOGLE_SERVICE_ACCOUNT_B64). Each set of
 * scopes gets its own token, cached until shortly before it expires.
 */

type Account = { client_email: string; private_key: string }
const cache = new Map<string, { token: string; expires: number }>()

function account(): Account | null {
  const encoded = process.env.GOOGLE_SERVICE_ACCOUNT_B64
  if (!encoded) return null
  try {
    const parsed = JSON.parse(Buffer.from(encoded, 'base64').toString('utf8'))
    return parsed.client_email && parsed.private_key ? parsed : null
  } catch {
    return null
  }
}

export const googleAccountConfigured = () => account() !== null

export async function googleToken(scopes: string) {
  const cached = cache.get(scopes)
  if (cached && cached.expires > Date.now() + 60_000) return cached.token
  const acc = account()
  if (!acc) throw new Error('no_account')
  const now = Math.floor(Date.now() / 1000)
  const b64 = (v: object) => Buffer.from(JSON.stringify(v)).toString('base64url')
  const unsigned = `${b64({ alg: 'RS256', typ: 'JWT' })}.${b64({
    iss: acc.client_email,
    scope: scopes,
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  })}`
  const signature = createSign('RSA-SHA256').update(unsigned).sign(acc.private_key, 'base64url')
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: `${unsigned}.${signature}`,
    }),
    signal: AbortSignal.timeout(15000),
  })
  if (!res.ok) throw new Error(`token ${res.status}`)
  const json = (await res.json()) as { access_token: string; expires_in: number }
  cache.set(scopes, { token: json.access_token, expires: Date.now() + json.expires_in * 1000 })
  return json.access_token
}
