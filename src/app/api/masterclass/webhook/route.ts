import { after, NextResponse } from 'next/server'
import { syncPayment } from '@/lib/masterclass/service'

/**
 * Mercado Pago's payment notifications. Only the payment ID is taken from the request: the payment itself is read
 * back from Mercado Pago with our token, so a forged notification can't confirm anything.
 */
export async function POST(req: Request) {
  const url = new URL(req.url)
  const body = (await req.json().catch(() => ({}))) as { type?: string; topic?: string; data?: { id?: string | number } }
  const type = body.type ?? body.topic ?? url.searchParams.get('type') ?? url.searchParams.get('topic')
  const id = String(body.data?.id ?? url.searchParams.get('data.id') ?? url.searchParams.get('id') ?? '')
  if (type === 'payment' && id) {
    after(() => syncPayment(id).catch((err) => console.error('[masterclass] payment sync failed', err)))
  }
  return NextResponse.json({ ok: true })
}
