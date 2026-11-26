import { ImageResponse } from 'next/og'
import { getPayload } from 'payload'
import config from '@payload-config'
import { hero } from '@/content/ia-humanos'
import { argDate } from '@/lib/masterclass/model'
import { currentMasterclass } from '@/lib/masterclass/service'

export const alt = 'Masterclass en vivo de IA para Humanos'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'
export const dynamic = 'force-dynamic'

const ISOTIPO = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><g stroke="#24122B" stroke-width="1.8" fill="none" stroke-linecap="round" stroke-linejoin="round"><line x1="24" y1="12.5" x2="24" y2="16.5"/><polyline points="14,32.5 16,24 24,16.5 32,24 34,32.5"/><polyline points="24,16.5 24,24.5 24,32.5"/><polyline points="16.5,45.5 19.5,39 24,32.5 28.5,39 31.5,45.5"/></g><g fill="#24122B"><circle cx="14" cy="32.5" r="2.3"/><circle cx="16" cy="24" r="2.3"/><circle cx="24" cy="16.5" r="2.3"/><circle cx="32" cy="24" r="2.3"/><circle cx="34" cy="32.5" r="2.3"/><circle cx="24" cy="24.5" r="2.3"/><circle cx="24" cy="32.5" r="2.3"/><circle cx="19.5" cy="39" r="2.3"/><circle cx="28.5" cy="39" r="2.3"/><circle cx="16.5" cy="45.5" r="2.3"/><circle cx="31.5" cy="45.5" r="2.3"/></g><circle cx="24" cy="7.5" r="5" fill="#CC57C7"/></svg>`

/** What WhatsApp, Instagram and search show when the page is shared: the entry ticket, with the real date. */
export default async function Image() {
  const m = await getPayload({ config })
    .then((payload) => currentMasterclass(payload))
    .catch(() => null)
  const when = m ? `${argDate(m.startsAt).short} · ${argDate(m.startsAt).time} · Online en vivo` : 'Online en vivo'
  const iso = `data:image/svg+xml;base64,${Buffer.from(ISOTIPO).toString('base64')}`

  return new ImageResponse(
    <div style={{ width: '100%', height: '100%', display: 'flex', background: '#24122B', padding: 40 }}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#F4F0F7', color: '#24122B' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            height: 72,
            padding: '0 48px',
            background: '#CC57C7',
            fontSize: 24,
            letterSpacing: 3,
          }}
        >
          <span>ENTRADA · MASTERCLASS</span>
          <span>{when.toUpperCase()}</span>
        </div>
        <div style={{ display: 'flex', flex: 1, alignItems: 'center', padding: '0 48px', gap: 40 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={iso} width={200} height={200} alt="" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20, flex: 1 }}>
            <div style={{ fontSize: 66, fontWeight: 800, lineHeight: 1.02, letterSpacing: -2 }}>{hero.title}</div>
            <div style={{ fontSize: 28, color: '#5b4866' }}>IA para Humanos · una unidad de Exacta</div>
          </div>
        </div>
      </div>
    </div>,
    size,
  )
}
