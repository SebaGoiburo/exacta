import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { ImageResponse } from 'next/og'
import { getTranslations } from 'next-intl/server'

export const alt = 'Exacta'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

const TICKS = Array.from({ length: 61 }, (_, i) => i)

/** Image shown when a page is shared. Dark brand background and the ruler from the site's measuring concept. */
export default async function OpengraphImage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'meta' })
  const svg = await readFile(join(process.cwd(), 'public/brand/exacta-mark.svg'), 'utf8')
  const mark = `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`
  const [, tagline = t('title')] = t('title').split(' · ')

  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '72px 80px 56px',
        background: '#0d141e',
        color: '#f3f5f8',
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={mark} width={147} height={120} alt="" />
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <div style={{ fontSize: 72, fontWeight: 600, lineHeight: 1.08, letterSpacing: -2, maxWidth: 940 }}>
          {tagline}
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: 56 }}>
          {TICKS.map((i) => (
            <div
              key={i}
              style={{
                width: 2,
                height: i === 44 ? 40 : i % 10 === 0 ? 28 : i % 5 === 0 ? 18 : 10,
                background: i === 44 ? '#cc57c7' : 'rgba(243,245,248,0.35)',
              }}
            />
          ))}
        </div>
      </div>
    </div>,
    size,
  )
}
