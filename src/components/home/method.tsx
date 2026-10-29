'use client'

import { useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useGSAP } from '@gsap/react'
import { ArrowRight } from '@/components/ui/icons'

gsap.registerPlugin(ScrollTrigger)

type Step = { title: string; body: string }

/*
 * The six steps are a real sequence, so they are numbered. On desktop the
 * section pins and the steps travel horizontally along a scale whose gold
 * marker shows the current step. On smaller screens they stack vertically.
 */
export function Method() {
  const t = useTranslations('method')
  const steps = t.raw('steps') as Step[]
  const sectionRef = useRef<HTMLElement>(null)
  const viewportRef = useRef<HTMLDivElement>(null)
  const trackRef = useRef<HTMLOListElement>(null)
  const markerRef = useRef<HTMLSpanElement>(null)
  const [active, setActive] = useState(0)

  useGSAP(
    () => {
      const mm = gsap.matchMedia()
      mm.add('(min-width: 1024px) and (prefers-reduced-motion: no-preference)', () => {
        const track = trackRef.current!
        const viewport = viewportRef.current!
        const distance = () => {
          const cs = getComputedStyle(viewport)
          const inner = viewport.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight)
          return Math.max(0, track.scrollWidth - inner)
        }

        gsap.to(track, {
          x: () => -distance(),
          ease: 'none',
          scrollTrigger: {
            trigger: sectionRef.current,
            start: 'top top',
            end: () => `+=${distance() + window.innerHeight * 0.25}`,
            pin: true,
            scrub: 0.8,
            invalidateOnRefresh: true,
            onUpdate: (self) => {
              const idx = Math.min(steps.length - 1, Math.round(self.progress * (steps.length - 1)))
              setActive(idx)
              if (markerRef.current) markerRef.current.style.left = `${self.progress * 100}%`
            },
          },
        })
      })
      return () => mm.revert()
    },
    { scope: sectionRef },
  )

  return (
    <section
      id="metodo"
      ref={sectionRef}
      className="scroll-mt-20 overflow-hidden py-24 md:py-32 lg:flex lg:min-h-svh lg:flex-col lg:justify-center lg:py-20"
      aria-labelledby="method-title"
    >
      <div className="container-x">
        <div className="grid gap-6 lg:grid-cols-12 lg:items-end">
          <h2 id="method-title" className="h-section text-ink lg:col-span-7" data-reveal>
            {t('title')}
          </h2>
          <p className="text-lg leading-relaxed text-ink-soft lg:col-span-5" data-reveal data-reveal-delay="0.08">
            {t('lead')}
          </p>
        </div>

        {/* Scale with one mark per step and a moving marker (desktop) */}
        <div aria-hidden className="relative mt-14 hidden h-8 lg:block">
          <div className="absolute inset-x-0 bottom-0 h-px bg-line-strong" />
          {steps.map((_, i) => (
            <span
              key={i}
              className={`absolute bottom-0 w-px transition-colors duration-300 ${i <= active ? 'bg-gold' : 'bg-line-strong'}`}
              style={{ left: `${(i / (steps.length - 1)) * 100}%`, height: 16 }}
            />
          ))}
          <span ref={markerRef} className="absolute bottom-0 left-0 size-2.5 -translate-x-1/2 translate-y-1/2 rounded-full bg-gold" />
        </div>
        <p className="mt-4 hidden font-mono text-[11px] tracking-[0.06em] text-ink-soft lg:block" aria-live="polite">
          {t('progress')} <span className="text-gold">{String(active + 1).padStart(2, '0')}</span> {t('of')} 06
        </p>
      </div>

      <div ref={viewportRef} className="container-x mt-12 lg:mt-10">
        <ol ref={trackRef} className="flex flex-col gap-4 lg:w-max lg:flex-row lg:gap-6">
          {steps.map((step, i) => {
            const last = i === steps.length - 1
            const on = i === active
            return (
              <li
                key={step.title}
                data-reveal
                className={`relative flex flex-col p-7 md:p-9 lg:min-h-[360px] lg:w-[400px] ${
                  last ? 'bg-accent text-accent-ink' : 'border border-line bg-bg-elev'
                }`}
              >
                <span
                  className={`font-display text-[clamp(3.5rem,2.5rem+3vw,5.5rem)] font-semibold leading-none tracking-[-0.04em] tabular-nums transition-colors duration-500 ${
                    last ? 'text-accent-ink/40' : on ? 'text-gold' : 'text-line-strong'
                  }`}
                  aria-hidden
                >
                  {String(i + 1).padStart(2, '0')}
                </span>
                <h3 className={`mt-auto pt-10 text-2xl font-semibold tracking-[-0.02em] ${last ? '' : 'text-ink'}`}>
                  {step.title}
                </h3>
                <p className={`mt-3 leading-relaxed ${last ? 'text-accent-ink/85' : 'text-ink-soft'}`}>{step.body}</p>
                {last && (
                  <a
                    href="#contacto"
                    className="mt-7 inline-flex items-center gap-2 self-start rounded-full bg-accent-ink px-5 py-3 text-sm font-semibold text-accent transition-transform duration-300 hover:-translate-y-0.5"
                  >
                    {t('cta')}
                    <ArrowRight className="size-4" />
                  </a>
                )}
              </li>
            )
          })}
        </ol>
      </div>
    </section>
  )
}
