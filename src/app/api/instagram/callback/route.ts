import { timingSafeEqual } from 'node:crypto'
import { NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'
import { ACCOUNTS_PAGE, connectAccount, InstagramError, STATE_COOKIE } from '@/lib/instagram/service'
import { publicUrl } from '@/lib/leads'

const sameState = (a: string, b: string) => a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b))

/** Instagram sends the admin back here after they accept. The state cookie proves it's the same sign-in we started. */
export async function GET(req: Request) {
  const params = new URL(req.url).searchParams
  const back = (result: string) => {
    const res = NextResponse.redirect(`${publicUrl()}${ACCOUNTS_PAGE}?ig=${encodeURIComponent(result)}`)
    res.cookies.delete({ name: STATE_COOKIE, path: '/api/instagram' })
    return res
  }

  const payload = await getPayload({ config })
  const { user } = await payload.auth({ headers: req.headers })
  if (user?.collection !== 'users' || (user as { role?: string }).role !== 'admin') return back('not_admin')

  const cookie = req.headers.get('cookie')?.match(new RegExp(`(?:^|;\\s*)${STATE_COOKIE}=([a-f0-9]+)`))?.[1] ?? ''
  const state = params.get('state') ?? ''
  if (!cookie || !sameState(cookie, state)) return back('expired')
  if (params.get('error')) return back('cancelled')

  const code = params.get('code')
  if (!code) return back('cancelled')
  try {
    const username = await connectAccount(payload, code)
    return back(`connected:${username}`)
  } catch (err) {
    console.error('[instagram] connect failed', err)
    return back(err instanceof InstagramError && /^[a-z_]+$/.test(err.message) ? err.message : 'failed')
  }
}
