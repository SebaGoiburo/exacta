'use client'

import { useRef, useState } from 'react'
import Image from 'next/image'
import { useLocale, useTranslations } from 'next-intl'
import { gsap } from 'gsap'
import { useGSAP } from '@gsap/react'
import type { TeamMember } from '@/content/types'
import type { Locale } from '@/i18n/routing'

const initials = (name: string) =>
  name
    .split(' ')
    .map((w) => w[0])
    .filter((c) => /[A-ZÁÉÍÓÚÑ0-9]/i.test(c))
    .slice(0, 2)
    .join('')

function Portrait({ m, className }: { m: TeamMember; className?: string }) {
  return (
    <div className={`relative overflow-hidden bg-surface ${className ?? ''}`}>
      {m.photo ? (
        <Image src={m.photo} alt={m.name} fill sizes="280px" className="object-cover" />
      ) : (
        <span className="absolute inset-0 grid place-items-center font-display font-semibold tracking-[-0.04em] text-ink-mute">
          {initials(m.name)}
        </span>
      )}
    </div>
  )
}

/** Names set large; on pointer devices a portrait follows the cursor over the hovered name. */
export function Team({ members }: { members: TeamMember[] }) {
  const t = useTranslations('team')
  const locale = useLocale() as Locale
  const listRef = useRef<HTMLUListElement>(null)
  const floatRef = useRef<HTMLDivElement>(null)
  const [hover, setHover] = useState<number | null>(null)

  useGSAP(
    () => {
      const list = listRef.current
      const float = floatRef.current
      if (!list || !float) return
      const mm = gsap.matchMedia()
      mm.add('(hover: hover) and (min-width: 768px)', () => {
        const xTo = gsap.quickTo(float, 'x', { duration: 0.5, ease: 'power3.out' })
        const yTo = gsap.quickTo(float, 'y', { duration: 0.5, ease: 'power3.out' })
        const move = (e: PointerEvent) => {
          const r = list.getBoundingClientRect()
          xTo(e.clientX - r.left)
          yTo(e.clientY - r.top)
        }
        list.addEventListener('pointermove', move)
        return () => list.removeEventListener('pointermove', move)
      })
      return () => mm.revert()
    },
    { scope: listRef },
  )

  return (
    <section id="equipo" className="scroll-mt-20 py-24 md:py-36" aria-labelledby="team-title">
      <div className="container-x">
        <div className="grid gap-6 lg:grid-cols-12 lg:items-end">
          <h2 id="team-title" className="h-section text-ink lg:col-span-7" data-reveal>
            {t('title')}
          </h2>
          <p className="text-lg leading-relaxed text-ink-soft lg:col-span-5" data-reveal data-reveal-delay="0.08">
            {t('lead')}
          </p>
        </div>

        <ul ref={listRef} className="relative mt-16 border-t border-line" onPointerLeave={() => setHover(null)}>
          {members.map((m, i) => (
            <li
              key={m.name}
              data-reveal
              data-reveal-delay={i * 0.06}
              onPointerEnter={() => setHover(i)}
              className="group flex items-center gap-5 border-b border-line py-6 md:py-8"
            >
              <Portrait m={m} className="size-14 shrink-0 rounded-full text-lg md:hidden" />
              <p
                className={`flex-1 font-display text-[clamp(1.75rem,1rem+3.2vw,4rem)] font-semibold leading-none tracking-[-0.035em] transition-[color,transform] duration-500 ease-[var(--ease-precise)] md:group-hover:translate-x-3 ${
                  m.placeholder ? 'text-ink-mute' : 'text-ink'
                } ${hover !== null && hover !== i ? 'md:opacity-40' : ''}`}
              >
                {m.name}
              </p>
              <p className="hidden text-right text-ink-soft sm:block">{m.role[locale]}</p>
            </li>
          ))}

          {/* Floating portrait (pointer devices) */}
          <div
            ref={floatRef}
            aria-hidden
            className={`pointer-events-none absolute top-0 left-0 z-10 hidden md:block ${hover === null ? 'opacity-0' : 'opacity-100'} transition-opacity duration-300`}
          >
            <div className="-translate-x-1/2 -translate-y-[60%] rotate-[-3deg]">
              {members.map((m, i) => (
                <Portrait
                  key={m.name}
                  m={m}
                  className={`h-[300px] w-[240px] text-6xl ${hover === i ? 'block' : 'hidden'}`}
                />
              ))}
            </div>
          </div>
        </ul>
      </div>
    </section>
  )
}
