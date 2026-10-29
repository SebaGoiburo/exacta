'use client'

import { useRef } from 'react'
import { useTranslations } from 'next-intl'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useGSAP } from '@gsap/react'

gsap.registerPlugin(ScrollTrigger)

const COMPANIES = 50
const TIME_SAVED = 45

export function Results() {
  const t = useTranslations('results')
  const ref = useRef<HTMLElement>(null)

  useGSAP(
    () => {
      const mm = gsap.matchMedia()
      mm.add('(prefers-reduced-motion: no-preference)', () => {
        const count = (sel: string, to: number) => {
          const el = ref.current?.querySelector<HTMLElement>(sel)
          if (!el) return
          const o = { v: 0 }
          el.textContent = '0'
          gsap.to(o, {
            v: to,
            duration: 1.8,
            ease: 'power3.out',
            onUpdate: () => (el.textContent = String(Math.round(o.v))),
            scrollTrigger: { trigger: el, start: 'top 80%', once: true },
          })
        }
        count('[data-count-companies]', COMPANIES)
        count('[data-count-time]', TIME_SAVED)

        // One tick per company lights up in sequence.
        gsap.fromTo(
          '[data-tick]',
          { opacity: 0.18 },
          {
            opacity: 1,
            duration: 0.25,
            stagger: 1.5 / COMPANIES,
            ease: 'none',
            scrollTrigger: { trigger: '[data-ticks]', start: 'top 85%', once: true },
          },
        )
        gsap.fromTo(
          '[data-bar]',
          { scaleX: 0 },
          {
            scaleX: 1,
            duration: 1.8,
            ease: 'power3.out',
            scrollTrigger: { trigger: '[data-bar]', start: 'top 85%', once: true },
          },
        )
      })
      return () => mm.revert()
    },
    { scope: ref },
  )

  return (
    <section ref={ref} className="bg-surface py-24 md:py-36" aria-labelledby="results-title">
      <div className="container-x">
        <div className="grid gap-6 lg:grid-cols-12 lg:items-end">
          <h2 id="results-title" className="h-section text-ink lg:col-span-7" data-reveal>
            {t('title')}
          </h2>
          <p className="max-w-md text-lg leading-relaxed text-ink-soft lg:col-span-5" data-reveal data-reveal-delay="0.08">
            {t('lead')}
          </p>
        </div>

        <div className="mt-16 grid gap-16 md:mt-24 lg:grid-cols-2 lg:gap-12">
          {/* Companies: one tick per company */}
          <figure data-reveal>
            <p className="h-display text-[clamp(5rem,3rem+9vw,11rem)] leading-[0.9] text-gold tabular-nums">
              +<span data-count-companies>{COMPANIES}</span>
            </p>
            <div data-ticks aria-hidden className="mt-8 flex h-10 items-end justify-between">
              {Array.from({ length: COMPANIES }, (_, i) => (
                <span
                  key={i}
                  data-tick
                  className={`w-px bg-gold ${i % 10 === 9 ? 'h-10' : i % 5 === 4 ? 'h-7' : 'h-4'}`}
                />
              ))}
            </div>
            <figcaption className="mt-6 max-w-sm text-lg leading-relaxed text-ink">{t('companies')}</figcaption>
          </figure>

          {/* Time saved: a 0–100 scale filled to the value */}
          <figure data-reveal data-reveal-delay="0.1">
            <p className="h-display text-[clamp(5rem,3rem+9vw,11rem)] leading-[0.9] text-gold tabular-nums">
              <span className="mr-3 align-top font-sans text-[clamp(1rem,0.8rem+0.8vw,1.5rem)] font-semibold tracking-normal text-ink-soft">
                {t('timePrefix')}
              </span>
              <span data-count-time>{TIME_SAVED}</span>%
            </p>
            <div aria-hidden className="relative mt-8 h-10">
              <div className="absolute inset-x-0 bottom-0 h-px bg-line-strong" />
              {Array.from({ length: 11 }, (_, i) => (
                <span
                  key={i}
                  className="absolute bottom-0 w-px bg-line-strong"
                  style={{ left: `${i * 10}%`, height: i % 5 === 0 ? 24 : 12 }}
                />
              ))}
              <div
                data-bar
                className="absolute bottom-0 left-0 h-2 origin-left bg-gold"
                style={{ width: `${TIME_SAVED}%` }}
              />
              {[0, 50, 100].map((v) => (
                <span
                  key={v}
                  className="absolute top-0 -translate-x-1/2 font-mono text-[10px] text-ink-mute"
                  style={{ left: `${v}%` }}
                >
                  {v}
                </span>
              ))}
            </div>
            <figcaption className="mt-6 max-w-sm text-lg leading-relaxed text-ink">{t('time')}</figcaption>
          </figure>
        </div>

        <p className="mt-16 max-w-2xl border-l-2 border-accent pl-5 text-lg leading-relaxed text-ink-soft md:mt-24" data-reveal>
          {t('costs')}
        </p>
      </div>
    </section>
  )
}
