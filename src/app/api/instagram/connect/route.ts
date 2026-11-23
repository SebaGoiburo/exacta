import { randomBytes } from 'node:crypto'
import { NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'
import { ACCOUNTS_PAGE, appConfig, authorizeUrl, STATE_COOKIE } from '@/lib/instagram/service'
import { publicUrl } from '@/lib/leads'

/** "Conectar cuenta de Instagram": only an admin, and only to Instagram's own sign-in page. */
export async function GET(req: Request) {
  const payload = await getPayload({ config })
  const { user } = await payload.auth({ headers: req.headers })
  if (user?.collection !== 'users' || (user as { role?: string }).role !== 'admin') {
    return NextResponse.redirect(`${publicUrl()}/admin`)
  }
  const { appId, appSecret } = await appConfig(payload)
  if (!appId || !appSecret) return NextResponse.redirect(`${publicUrl()}${ACCOUNTS_PAGE}?ig=not_configured`)

  const state = randomBytes(24).toString('hex')
  const res = NextResponse.redirect(authorizeUrl(appId, state))
  res.cookies.set(STATE_COOKIE, state, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/api/instagram',
    maxAge: 600,
  })
  return res
}
