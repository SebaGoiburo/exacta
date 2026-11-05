'use client'

import { useEffect, useRef } from 'react'
import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/navigation'
import { Magnetic } from '@/components/motion/magnetic'
import { useDeferredMotion } from '@/components/motion/motion-runtime'
import { ArrowRight } from '@/components/ui/icons'
import { HeroDiagram, type HeroDiagramHandle } from './hero-diagram'

const PINNED = '(min-width: 1024px) and (prefers-reduced-motion: no-preference)'
const SELF_PLAYING = '(max-width: 1023px) and (prefers-reduced-motion: no-preference)'
const ORDERING_DELAY = 600
const ORDERING_DURATION = 2800

// Matches GSAP's power2.inOut.
const easeInOutCubic = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2)

export function Hero() {
  const t = useTranslations('hero')
  const sectionRef = useRef<HTMLElement>(null)
  const diagramRef = useRef<HeroDiagramHandle>(null)
  const diagramBoxRef = useRef<HTMLDivElement>(null)
  const hintRef = useRef<HTMLDivElement>(null)

  // Desktop: pin the hero and let scrolling put the operation in order.
  useDeferredMotion(
    ({ gsap }) => {
      const state = diagramRef.current?.state
      const section = sectionRef.current
      if (!state || !section) return

      const mm = gsap.matchMedia()
      mm.add(PINNED, () => {
        const hint = hintRef.current
        gsap.to(state, {
          p: 1,
          ease: 'none',
          scrollTrigger: {
            trigger: section,
            start: 'top top',
            end: '+=90%',
            pin: true,
            scrub: 0.8,
            onUpdate: (self) => {
              if (hint) hint.style.opacity = String(Math.max(0, 1 - self.progress * 5))
            },
          },
        })
      })
      return () => mm.revert()
    },
    { scope: sectionRef, media: PINNED },
  )

  // Smaller screens: no pinning, the diagram orders itself once visible.
  useEffect(() => {
    const state = diagramRef.current?.state
    const box = diagramBoxRef.current
    if (!state || !box || !window.matchMedia(SELF_PLAYING).matches) return

    let frame = 0
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return
        observer.disconnect()
        const startedAt = performance.now() + ORDERING_DELAY
        const step = (now: number) => {
          const progress = Math.min(1, Math.max(0, (now - startedAt) / ORDERING_DURATION))
          state.p = easeInOutCubic(progress)
          if (progress < 1) frame = requestAnimationFrame(step)
        }
        frame = requestAnimationFrame(step)
      },
      { rootMargin: '0px 0px -30% 0px' },
    )
    observer.observe(box)

    return () => {
      observer.disconnect()
      cancelAnimationFrame(frame)
    }
  }, [])

  const diagramLabels = {
    title: t('diagram.title'),
    before: t('diagram.before'),
    after: t('diagram.after'),
    order: t('diagram.order'),
    columns: t.raw('diagram.columns') as string[],
    nodes: t.raw('diagram.nodes'),
  }

  return (
    <section ref={sectionRef} className="relative overflow-hidden pt-[72px]">
      <div
        aria-hidden
        className="bg-grid pointer-events-none absolute inset-0 [mask-image:radial-gradient(ellipse_80%_70%_at_60%_45%,#000_30%,transparent_80%)]"
      />

      <div className="container-x relative grid min-h-[calc(100svh-72px)] items-center gap-12 py-12 lg:grid-cols-12 lg:gap-10 lg:py-10">
        <div className="lg:col-span-6 xl:pr-6">
          <div data-intro="0">
            <p className="eyebrow">{t('eyebrow')}</p>
            <p className="mt-2 pl-9 font-mono text-[11px] tracking-[0.08em] text-ink-mute uppercase">
              {t('location')} <span className="ml-2 text-gold">{t('coords')}</span>
            </p>
          </div>

          <h1 data-intro="1" data-hero-title className="h-display mt-6 text-[clamp(2.5rem,1.3rem+3vw,3.9rem)] text-ink">
            {t('title')}
          </h1>

          <p data-intro="2" className="mt-6 max-w-md text-lg leading-relaxed text-ink-soft">
            {t('lead')}
          </p>

          <div data-intro="3" className="mt-9 flex flex-wrap items-center gap-3">
            <Magnetic>
              <Link href="/diagnostico" className="btn btn-primary">
                {t('ctaPrimary')}
                <ArrowRight className="btn-arrow size-4" />
              </Link>
            </Magnetic>
            <a href="#servicios" className="btn btn-ghost">
              {t('ctaSecondary')}
            </a>
          </div>

          <p data-intro="4" className="mt-5 font-mono text-[11px] tracking-[0.04em] text-ink-mute">
            {t('note')}
          </p>
        </div>

        <div ref={diagramBoxRef} data-intro="1" data-intro-style="settle" className="lg:col-span-6">
          <HeroDiagram ref={diagramRef} labels={diagramLabels} />
        </div>
      </div>

      <div
        ref={hintRef}
        aria-hidden
        className="pointer-events-none absolute bottom-7 left-1/2 hidden -translate-x-1/2 flex-col items-center gap-3 lg:flex"
      >
        <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-mute">{t('scrollHint')}</span>
        <span className="relative h-10 w-px overflow-hidden bg-line">
          <span className="scroll-hint-line absolute inset-0 bg-gold" />
        </span>
      </div>
    </section>
  )
}
