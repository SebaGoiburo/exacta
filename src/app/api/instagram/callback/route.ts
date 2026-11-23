import { timingSafeEqual } from 'node:crypto'
import { NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'
import { ACCOUNTS_PAGE, connectAccounts, InstagramError, STATE_COOKIE } from '@/lib/instagram/service'
import { publicUrl } from '@/lib/leads'

const sameState = (a: string, b: string) => a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b))

/**
 * Meta sends the admin back here after they accept. Payload ignores its session cookie on a request that comes
 * from another site (facebook.com), so the panel session can't be checked here. The state cookie is the proof
 * instead: only /api/instagram/connect sets it, after checking the person is an admin, and it lasts 10 minutes.
 */
export async function GET(req: Request) {
  const params = new URL(req.url).searchParams
  const back = (result: string) => {
    const res = NextResponse.redirect(`${publicUrl()}${ACCOUNTS_PAGE}?ig=${encodeURIComponent(result)}`)
    res.cookies.delete({ name: STATE_COOKIE, path: '/api/instagram' })
    return res
  }

  const payload = await getPayload({ config })
  const cookie = req.headers.get('cookie')?.match(new RegExp(`(?:^|;\\s*)${STATE_COOKIE}=([a-f0-9]+)`))?.[1] ?? ''
  const state = params.get('state') ?? ''
  if (!cookie || !sameState(cookie, state)) return back('expired')
  if (params.get('error')) return back('cancelled')

  const code = params.get('code')
  if (!code) return back('cancelled')
  try {
    const usernames = await connectAccounts(payload, code)
    return back(`connected:${usernames.join(',')}`)
  } catch (err) {
    console.error('[instagram] connect failed', err)
    return back(err instanceof InstagramError && /^[a-z_]+$/.test(err.message) ? err.message : 'failed')
  }
}
